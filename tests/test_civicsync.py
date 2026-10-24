import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.database import Base, get_db
from backend.models import Project, Conflict, Acknowledgment, AuditLog
from backend.main import app, run_conflict_detection
from backend.conflict_engine import (
    haversine_distance,
    point_to_segment_distance,
    sample_line_points,
    calculate_project_distance,
    check_date_overlap,
    calculate_severity,
    generate_sequencing_recommendation,
    check_cooldown_warning,
    check_monsoon_warning,
)

# In-memory SQLite for testing
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    db.query(Acknowledgment).delete()
    db.query(AuditLog).delete()
    db.query(Conflict).delete()
    db.query(Project).delete()
    db.commit()
    db.close()
    yield

client = TestClient(app)

# 1. Haversine distance accuracy
def test_haversine_distance():
    # Lat/Lon ~30m apart
    lat1, lon1 = 19.2848, 72.8665
    lat2, lon2 = 19.2850, 72.8668
    dist = haversine_distance(lat1, lon1, lat2, lon2)
    assert 20 < dist < 45, f"Expected 20-45m, got {dist}"

# 2. Line segment sampling distance
def test_sampled_line_distance():
    # Line A
    p_a = type("ProjA", (), {
        "lat": 19.2848, "lng": 72.8665,
        "end_lat": 19.2855, "end_lng": 72.8682,
    })()
    # Line B parallel ~25m away
    p_b = type("ProjB", (), {
        "lat": 19.2850, "lng": 72.8668,
        "end_lat": 19.2857, "end_lng": 72.8685,
    })()
    dist = calculate_project_distance(p_a, p_b)
    assert dist < 50.0
    samples = sample_line_points(19.2848, 72.8665, 19.2855, 72.8682, num_samples=10)
    assert len(samples) == 10

# 3. Date range overlap
def test_date_range_overlap():
    # Overlapping
    has_ov, s, e, days = check_date_overlap(
        date(2026, 11, 5), date(2026, 11, 20),
        date(2026, 11, 10), date(2026, 11, 25)
    )
    assert has_ov is True
    assert days == 11
    assert s == date(2026, 11, 10)
    assert e == date(2026, 11, 20)

    # Disjoint
    has_ov2, _, _, days2 = check_date_overlap(
        date(2026, 11, 1), date(2026, 11, 5),
        date(2026, 11, 10), date(2026, 11, 15)
    )
    assert has_ov2 is False
    assert days2 == 0

# 4. Severity formula & explainable breakdown
def test_severity_formula_and_breakdown():
    # Distance = 20m, threshold = 50m, overlap = 10 days, arterial
    sev = calculate_severity(
        distance=20.0,
        threshold=50.0,
        overlapping_days=10,
        road_type_a="Arterial",
        road_type_b="Arterial",
    )
    # closeness = 1 - (20/50) = 0.60
    # overlap = 10/10 = 1.00
    # road = 1.00
    # score = 0.45*0.60 + 0.35*1.0 + 0.20*1.0 = 0.27 + 0.35 + 0.20 = 0.82
    assert sev["severity_level"] == "High"
    assert sev["severity_ratio"] > 0.66
    assert "closeness" in sev["severity_breakdown"]
    assert "weights" in sev["severity_breakdown"]
    assert "formula" in sev["severity_breakdown"]

# 5. Sequencing rule: Underground BEFORE Surface
def test_sequencing_underground_before_surface():
    proj_road = type("P", (), {
        "title": "Road Resurfacing",
        "department": "Roads Department",
        "project_type": "Resurfacing",
        "start_date": date(2026, 11, 1),
        "end_date": date(2026, 11, 15),
    })()
    proj_water = type("P", (), {
        "title": "Water Pipeline",
        "department": "Water Department",
        "project_type": "Pipeline",
        "start_date": date(2026, 11, 5),
        "end_date": date(2026, 11, 20),
    })()

    rec = generate_sequencing_recommendation(proj_road, proj_water)
    assert "Water Department Pipeline" in rec["suggested_sequence"]
    assert "before Roads Department Resurfacing" in rec["suggested_sequence"]
    assert "Underground work precedes surface" in rec["rule_applied"]

# 6. Cooldown rule: 24 months post-resurfacing
def test_dig_cooldown_warning():
    resurf_date = date(2026, 7, 15)  # 3 months prior to Oct 2026
    current_date = date(2026, 10, 24)

    # Underground work triggers warning
    warn = check_cooldown_warning(
        road_name="Kanakia Road",
        new_project_type="Gas line",
        recent_resurfacing_end_date=resurf_date,
        reference_date=current_date,
        cooldown_months=24,
    )
    assert warn is not None
    assert warn["has_warning"] is True
    assert warn["months_ago"] == 3
    assert warn["requires_justification"] is True

    # Surface work does not trigger underground cooldown
    no_warn = check_cooldown_warning(
        road_name="Kanakia Road",
        new_project_type="Resurfacing",
        recent_resurfacing_end_date=resurf_date,
        reference_date=current_date,
        cooldown_months=24,
    )
    assert no_warn is None

# 7. Monsoon rule: June 1 - Sept 30
def test_monsoon_window_warning():
    monsoon_proj_start = date(2026, 7, 1)
    monsoon_proj_end = date(2026, 7, 20)
    m_warn = check_monsoon_warning(monsoon_proj_start, monsoon_proj_end)
    assert m_warn is not None
    assert m_warn["has_warning"] is True
    assert "01 June" in m_warn["warning"]

    dry_start = date(2026, 11, 1)
    dry_end = date(2026, 11, 15)
    dry_warn = check_monsoon_warning(dry_start, dry_end)
    assert dry_warn is None

# 8. Approval gate blocks when conflict check not performed
def test_approval_gate_requires_conflict_report():
    db = TestingSessionLocal()
    p = Project(
        id="GATE-TEST-1",
        title="Unchecked Project",
        name="Unchecked Project",
        department="Roads Department",
        department_id="DEPT-ROADS",
        project_type="Resurfacing",
        road_name="Station Road",
        lat=19.28, lng=72.85,
        latitude=19.28, longitude=72.85,
        start_date=date(2026, 11, 1),
        end_date=date(2026, 11, 10),
        status="Planned",
        conflict_check_performed=False,
    )
    db.add(p)
    db.commit()

    resp = client.post(f"/projects/{p.id}/approve")
    assert resp.status_code == 400
    assert "Conflict analysis report has not been generated" in resp.json()["detail"]

# 9. Approval gate blocks when active conflicts are unacknowledged
def test_approval_gate_blocks_unacknowledged_conflicts():
    db = TestingSessionLocal()
    p1 = Project(
        id="GATE-TEST-2A",
        title="Project 2A",
        name="Project 2A",
        department="Roads Department",
        department_id="DEPT-ROADS",
        project_type="Resurfacing",
        road_name="Station Road",
        lat=19.28, lng=72.85,
        latitude=19.28, longitude=72.85,
        start_date=date(2026, 11, 1),
        end_date=date(2026, 11, 10),
        status="Planned",
        conflict_check_performed=True,
    )
    p2 = Project(
        id="GATE-TEST-2B",
        title="Project 2B",
        name="Project 2B",
        department="Water Department",
        department_id="DEPT-WATER",
        project_type="Pipeline",
        road_name="Station Road",
        lat=19.28, lng=72.85,
        latitude=19.28, longitude=72.85,
        start_date=date(2026, 11, 5),
        end_date=date(2026, 11, 15),
        status="Planned",
        conflict_check_performed=True,
    )
    c = Conflict(
        id="GATE-CONF-1",
        project_a_id=p1.id,
        project_b_id=p2.id,
        calculated_distance=10.0,
        threshold=50.0,
        overlap_start=date(2026, 11, 5),
        overlap_end=date(2026, 11, 10),
        overlapping_days=6,
        severity_score=85.0,
        severity_level="High",
        suggested_sequence="Sequence",
        resolution="Pending",
        ack_a=True,
        ack_b=False,  # Water dept pending!
    )
    db.add_all([p1, p2, c])
    db.commit()

    resp = client.post(f"/projects/{p1.id}/approve")
    assert resp.status_code == 400
    assert "requires acknowledgment from Water" in resp.json()["detail"]

# 10. Joint Trenching resolution resolves conflict
def test_joint_trenching_proposal():
    db = TestingSessionLocal()
    p1 = Project(
        id="JT-1", title="P1", name="P1", department="Electricity Department",
        project_type="Cabling", road_name="Link Road",
        lat=19.28, lng=72.85, latitude=19.28, longitude=72.85,
        start_date=date(2026, 11, 1), end_date=date(2026, 11, 10),
    )
    p2 = Project(
        id="JT-2", title="P2", name="P2", department="Telecom Department",
        project_type="Cabling", road_name="Link Road",
        lat=19.28, lng=72.85, latitude=19.28, longitude=72.85,
        start_date=date(2026, 11, 1), end_date=date(2026, 11, 10),
    )
    c = Conflict(
        id="JT-CONF-1", project_a_id=p1.id, project_b_id=p2.id,
        calculated_distance=5.0, threshold=50.0,
        overlap_start=date(2026, 11, 1), overlap_end=date(2026, 11, 10),
        overlapping_days=10, severity_score=70.0, severity_level="Medium",
        suggested_sequence="Joint Trench", resolution="Pending",
    )
    db.add_all([p1, p2, c])
    db.commit()

    resp = client.post(f"/conflicts/{c.id}/propose-joint")
    assert resp.status_code == 200
    assert resp.json()["resolution"] == "JointTrench"

# 11. Live preview conflict endpoint
def test_preview_conflicts_endpoint():
    db = TestingSessionLocal()
    existing = Project(
        id="PREV-EXIST",
        title="Existing Water Works",
        name="Existing Water Works",
        department="Water Department",
        department_id="DEPT-WATER",
        project_type="Pipeline",
        road_name="Mira Bhayandar Road",
        road_type="Arterial",
        lat=19.2848, lng=72.8665,
        latitude=19.2848, longitude=72.8665,
        start_date=date(2026, 11, 1),
        end_date=date(2026, 11, 15),
        status="Planned",
    )
    db.add(existing)
    db.commit()

    payload = {
        "project_type": "Resurfacing",
        "geometry_type": "point",
        "lat": 19.2850,
        "lng": 72.8668,
        "radius_m": 25.0,
        "road_name": "Mira Bhayandar Road",
        "road_type": "Arterial",
        "start_date": "2026-11-05",
        "end_date": "2026-11-20",
        "department": "Roads Department",
    }
    resp = client.post("/projects/preview-conflicts", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["has_conflicts"] is True
    assert data["conflict_count"] >= 1
    assert data["conflicts"][0]["existing_project_id"] == "PREV-EXIST"
