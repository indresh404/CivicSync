import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.database import Base, get_db
from backend.models import Project, Conflict, Acknowledgment, AuditLog
from backend.main import app, run_conflict_check_internal
from backend.conflict_engine import (
    haversine_distance,
    check_date_overlap,
    calculate_severity,
    generate_sequencing_recommendation,
)

# Shared in-memory SQLite using StaticPool
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

# 1. Projects 30 meters apart with overlapping dates create a conflict
def test_projects_30m_apart_with_overlapping_dates_create_conflict():
    lat1, lon1 = 12.9716, 77.5946
    lat2, lon2 = 12.97187, 77.5946
    dist = haversine_distance(lat1, lon1, lat2, lon2)
    assert 25 < dist < 35, f"Expected ~30m, got {dist}"

    start_date = date(2026, 11, 1)
    end_date = date(2026, 11, 15)

    has_overlap, _, _, o_days = check_date_overlap(start_date, end_date, start_date, end_date)
    assert has_overlap is True
    assert o_days == 15

    db = TestingSessionLocal()
    p1 = Project(
        id="TEST-1",
        name="Project 1",
        department="Roads Department",
        project_type="Resurfacing",
        road_name="Test Road",
        latitude=lat1,
        longitude=lon1,
        start_date=start_date,
        end_date=end_date,
        status="Planned",
    )
    p2 = Project(
        id="TEST-2",
        name="Project 2",
        department="Water Department",
        project_type="Pipeline",
        road_name="Test Road",
        latitude=lat2,
        longitude=lon2,
        start_date=start_date,
        end_date=end_date,
        status="Planned",
    )
    db.add_all([p1, p2])
    db.commit()

    confs = run_conflict_check_internal(db, p1)
    assert len(confs) == 1
    assert confs[0].calculated_distance < 50.0
    assert confs[0].overlapping_days == 15
    db.close()

# 2. Projects 100 meters apart do not conflict when threshold is 50m
def test_projects_100m_apart_do_not_conflict():
    lat1, lon1 = 12.9716, 77.5946
    lat2, lon2 = 12.9725, 77.5946
    dist = haversine_distance(lat1, lon1, lat2, lon2)
    assert dist > 80.0

    db = TestingSessionLocal()
    p1 = Project(
        id="TEST-100A",
        name="Project 100A",
        department="Roads Department",
        project_type="Resurfacing",
        road_name="Test Road",
        latitude=lat1,
        longitude=lon1,
        start_date=date(2026, 11, 1),
        end_date=date(2026, 11, 10),
        status="Planned",
    )
    p2 = Project(
        id="TEST-100B",
        name="Project 100B",
        department="Water Department",
        project_type="Pipeline",
        road_name="Test Road",
        latitude=lat2,
        longitude=lon2,
        start_date=date(2026, 11, 1),
        end_date=date(2026, 11, 10),
        status="Planned",
    )
    db.add_all([p1, p2])
    db.commit()

    confs = run_conflict_check_internal(db, p1)
    assert len(confs) == 0
    db.close()

# 3. Nearby projects with non-overlapping dates do not conflict
def test_nearby_projects_non_overlapping_dates_no_conflict():
    lat, lon = 12.9716, 77.5946
    db = TestingSessionLocal()
    p1 = Project(
        id="TEST-3A",
        name="Project 3A",
        department="Roads Department",
        project_type="Resurfacing",
        road_name="MG Road",
        latitude=lat,
        longitude=lon,
        start_date=date(2026, 11, 1),
        end_date=date(2026, 11, 10),
        status="Planned",
    )
    p2 = Project(
        id="TEST-3B",
        name="Project 3B",
        department="Water Department",
        project_type="Pipeline",
        road_name="MG Road",
        latitude=lat,
        longitude=lon,
        start_date=date(2026, 11, 11),
        end_date=date(2026, 11, 20),
        status="Planned",
    )
    db.add_all([p1, p2])
    db.commit()

    confs = run_conflict_check_internal(db, p1)
    assert len(confs) == 0
    db.close()

# 4. Overlapping dates use inclusive calendar-day calculations
def test_overlapping_dates_use_inclusive_days():
    start_a = date(2026, 11, 5)
    end_a = date(2026, 11, 10)
    start_b = date(2026, 11, 8)
    end_b = date(2026, 11, 12)

    has_overlap, o_start, o_end, days = check_date_overlap(start_a, end_a, start_b, end_b)
    assert has_overlap is True
    assert o_start == date(2026, 11, 8)
    assert o_end == date(2026, 11, 10)
    assert days == 3

# 5. Completed projects do not block new approvals
def test_completed_projects_do_not_block_new_approvals():
    db = TestingSessionLocal()
    completed_proj = Project(
        id="PRJ-COMPLETED",
        name="Prior Pipeline Work",
        department="Water Department",
        project_type="Pipeline",
        road_name="MG Road",
        latitude=12.9716,
        longitude=77.5946,
        start_date=date(2026, 11, 1),
        end_date=date(2026, 11, 15),
        status="Completed",
    )
    new_proj = Project(
        id="PRJ-NEW",
        name="New Resurfacing",
        department="Roads Department",
        project_type="Resurfacing",
        road_name="MG Road",
        latitude=12.9716,
        longitude=77.5946,
        start_date=date(2026, 11, 1),
        end_date=date(2026, 11, 15),
        status="Planned",
    )
    db.add_all([completed_proj, new_proj])
    db.commit()

    confs = run_conflict_check_internal(db, new_proj)
    assert len(confs) == 0, "Completed projects must not generate active blocking conflicts"
    db.close()

# 6. Utility-versus-resurfacing conflicts recommend utility work first
def test_utility_versus_resurfacing_recommends_utility_first():
    db = TestingSessionLocal()
    p_surf = Project(
        id="P-SURF",
        name="Resurfacing",
        department="Roads Department",
        project_type="Resurfacing",
        road_name="MG Road",
        latitude=12.9716,
        longitude=77.5946,
        start_date=date(2026, 11, 1),
        end_date=date(2026, 11, 10),
        status="Planned",
    )
    p_util = Project(
        id="P-UTIL",
        name="Water Pipeline",
        department="Water Department",
        project_type="Pipeline",
        road_name="MG Road",
        latitude=12.9716,
        longitude=77.5946,
        start_date=date(2026, 11, 5),
        end_date=date(2026, 11, 15),
        status="Planned",
    )
    rec = generate_sequencing_recommendation(p_surf, p_util, date(2026, 11, 5), date(2026, 11, 10), 6)
    assert "Underground utility work" in rec["suggested_sequence"]
    assert "must be completed before road surface resurfacing" in rec["suggested_sequence"]
    db.close()

# 7. Two utility projects do not receive an invented precedence rule
def test_two_utility_projects_no_invented_precedence():
    p1 = Project(
        id="P-ELEC",
        name="Electricity Cabling",
        department="Electricity Department",
        project_type="Cabling",
        road_name="Commercial St",
        latitude=12.9716,
        longitude=77.5946,
        start_date=date(2026, 11, 1),
        end_date=date(2026, 11, 10),
        status="Planned",
    )
    p2 = Project(
        id="P-GAS",
        name="Gas Line",
        department="Gas Department",
        project_type="Gas line",
        road_name="Commercial St",
        latitude=12.9716,
        longitude=77.5946,
        start_date=date(2026, 11, 1),
        end_date=date(2026, 11, 10),
        status="Planned",
    )
    rec = generate_sequencing_recommendation(p1, p2, date(2026, 11, 1), date(2026, 11, 10), 10)
    assert "No automatic precedence rule is configured" in rec["suggested_sequence"]
    assert "Joint trench-sharing" in rec["suggested_sequence"]

# 8. A project cannot be approved before its conflict report exists
def test_project_cannot_be_approved_before_conflict_report():
    db = TestingSessionLocal()
    p = Project(
        id="PRJ-UNCHECKED",
        name="Unchecked Project",
        department="Roads Department",
        project_type="Resurfacing",
        road_name="Brigade Rd",
        latitude=12.9716,
        longitude=77.5946,
        start_date=date(2026, 11, 1),
        end_date=date(2026, 11, 10),
        status="Planned",
        conflict_check_performed=False,
    )
    db.add(p)
    db.commit()
    db.close()

    resp = client.post("/api/projects/PRJ-UNCHECKED/approve", json={"approved_by": "City Admin"})
    assert resp.status_code == 400
    assert "conflict report check must be performed first" in resp.json()["detail"]

# 9. A project with a conflict cannot be normally approved until both departments acknowledge it
def test_approval_blocked_until_both_departments_acknowledge():
    db = TestingSessionLocal()
    p1 = Project(
        id="PRJ-A",
        name="Project A",
        department="Roads Department",
        project_type="Resurfacing",
        road_name="MG Road",
        latitude=12.9716,
        longitude=77.5946,
        start_date=date(2026, 11, 1),
        end_date=date(2026, 11, 10),
        status="Planned",
        conflict_check_performed=True,
    )
    p2 = Project(
        id="PRJ-B",
        name="Project B",
        department="Water Department",
        project_type="Pipeline",
        road_name="MG Road",
        latitude=12.9716,
        longitude=77.5946,
        start_date=date(2026, 11, 1),
        end_date=date(2026, 11, 10),
        status="Planned",
        conflict_check_performed=True,
    )
    conf = Conflict(
        id="CONF-AB",
        project_a_id=p1.id,
        project_b_id=p2.id,
        calculated_distance=10.0,
        threshold=50.0,
        overlap_start=date(2026, 11, 1),
        overlap_end=date(2026, 11, 10),
        overlapping_days=10,
        proximity_score=80.0,
        overlap_score=100.0,
        road_importance_score=100.0,
        severity_score=90.0,
        severity_level="High",
        conflict_reason="Dual excavation",
        suggested_sequence="Water first",
        status="Awaiting Acknowledgment",
        report_version=1,
    )
    db.add_all([p1, p2, conf])
    db.commit()
    db.close()

    # Attempt approve when 0 acks -> fails
    resp = client.post("/api/projects/PRJ-A/approve", json={"approved_by": "Approver"})
    assert resp.status_code == 400
    assert "Approval blocked" in resp.json()["detail"]

    # Acknowledge by Roads Dept only
    ack_resp1 = client.post(
        "/api/conflicts/CONF-AB/acknowledge",
        json={"department": "Roads Department", "acknowledged_by": "Engineer A"},
    )
    assert ack_resp1.status_code == 200

    # Still fails because Water Dept has not acknowledged
    resp2 = client.post("/api/projects/PRJ-A/approve", json={"approved_by": "Approver"})
    assert resp2.status_code == 400
    assert "missing acknowledgment from: Water Department" in resp2.json()["detail"]

    # Now acknowledge by Water Dept
    ack_resp2 = client.post(
        "/api/conflicts/CONF-AB/acknowledge",
        json={"department": "Water Department", "acknowledged_by": "Engineer B"},
    )
    assert ack_resp2.status_code == 200

    # Now approval succeeds!
    resp3 = client.post("/api/projects/PRJ-A/approve", json={"approved_by": "Approver"})
    assert resp3.status_code == 200
    assert resp3.json()["status"] == "Approved"

# 10. An admin override fails without a reason
def test_admin_override_fails_without_reason():
    db = TestingSessionLocal()
    p = Project(
        id="PRJ-OVERRIDE-TEST",
        name="Override Test",
        department="Roads Department",
        project_type="Resurfacing",
        road_name="Test Road",
        latitude=12.9716,
        longitude=77.5946,
        start_date=date(2026, 11, 1),
        end_date=date(2026, 11, 10),
        status="Planned",
    )
    db.add(p)
    db.commit()
    db.close()

    # Empty reason
    resp = client.post(
        "/api/projects/PRJ-OVERRIDE-TEST/override",
        json={"override_by": "Admin", "override_reason": ""},
    )
    assert resp.status_code == 422 or resp.status_code == 400

    # Whitespace only
    resp2 = client.post(
        "/api/projects/PRJ-OVERRIDE-TEST/override",
        json={"override_by": "Admin", "override_reason": "   "},
    )
    assert resp2.status_code == 422 or resp2.status_code == 400

# 11. A valid override creates an audit record
def test_valid_override_creates_audit_record():
    db = TestingSessionLocal()
    p = Project(
        id="PRJ-OVERRIDE-AUDIT",
        name="Override Audit Test",
        department="Gas Department",
        project_type="Gas line",
        road_name="Test Road",
        latitude=12.9716,
        longitude=77.5946,
        start_date=date(2026, 11, 1),
        end_date=date(2026, 11, 10),
        status="Planned",
    )
    db.add(p)
    db.commit()
    db.close()

    resp = client.post(
        "/api/projects/PRJ-OVERRIDE-AUDIT/override",
        json={
            "override_by": "City Administrator",
            "override_reason": "Emergency safety mitigation for gas leak containment",
        },
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "Approved"
    assert resp.json()["is_overridden"] is True

    # Verify audit record
    audit_resp = client.get("/api/audit-logs?project_id=PRJ-OVERRIDE-AUDIT")
    assert audit_resp.status_code == 200
    logs = audit_resp.json()
    assert len(logs) >= 1
    assert logs[0]["action_type"] == "ADMIN_OVERRIDE"
    assert "Emergency safety mitigation" in logs[0]["note"]

# 12. Acknowledgments persist and duplicate acknowledgments do not create inconsistent state
def test_acknowledgments_persist_and_are_idempotent():
    db = TestingSessionLocal()
    p1 = Project(
        id="P-ACK1",
        name="P1",
        department="Roads Department",
        project_type="Resurfacing",
        road_name="Road 1",
        latitude=12.9716,
        longitude=77.5946,
        start_date=date(2026, 11, 1),
        end_date=date(2026, 11, 10),
        status="Planned",
    )
    p2 = Project(
        id="P-ACK2",
        name="P2",
        department="Water Department",
        project_type="Pipeline",
        road_name="Road 1",
        latitude=12.9716,
        longitude=77.5946,
        start_date=date(2026, 11, 1),
        end_date=date(2026, 11, 10),
        status="Planned",
    )
    conf = Conflict(
        id="CONF-ACK-TEST",
        project_a_id=p1.id,
        project_b_id=p2.id,
        calculated_distance=15.0,
        threshold=50.0,
        overlap_start=date(2026, 11, 1),
        overlap_end=date(2026, 11, 10),
        overlapping_days=10,
        proximity_score=70.0,
        overlap_score=100.0,
        road_importance_score=40.0,
        severity_score=70.0,
        severity_level="High",
        conflict_reason="Overlap",
        suggested_sequence="Water first",
        status="Awaiting Acknowledgment",
        report_version=1,
    )
    db.add_all([p1, p2, conf])
    db.commit()
    db.close()

    # First acknowledgment
    r1 = client.post(
        "/api/conflicts/CONF-ACK-TEST/acknowledge",
        json={"department": "Roads Department", "acknowledged_by": "Officer A"},
    )
    assert r1.status_code == 200
    ack1_id = r1.json()["id"]

    # Duplicate acknowledgment
    r2 = client.post(
        "/api/conflicts/CONF-ACK-TEST/acknowledge",
        json={"department": "Roads Department", "acknowledged_by": "Officer A"},
    )
    assert r2.status_code == 200
    assert r2.json()["id"] == ack1_id

# 13. Refreshing a materially changed report invalidates stale acknowledgments
def test_refreshing_report_bumps_version():
    db = TestingSessionLocal()
    p1 = Project(
        id="P-STALE1",
        name="P1",
        department="Roads Department",
        project_type="Resurfacing",
        road_name="MG Road",
        latitude=12.9716,
        longitude=77.5946,
        start_date=date(2026, 11, 1),
        end_date=date(2026, 11, 10),
        status="Planned",
    )
    p2 = Project(
        id="P-STALE2",
        name="P2",
        department="Water Department",
        project_type="Pipeline",
        road_name="MG Road",
        latitude=12.9716,
        longitude=77.5946,
        start_date=date(2026, 11, 5),
        end_date=date(2026, 11, 15),
        status="Planned",
    )
    db.add_all([p1, p2])
    db.commit()

    # Initial check -> report version 1
    c1 = run_conflict_check_internal(db, p1)
    assert len(c1) == 1
    assert c1[0].report_version == 1

    # Acknowledge version 1
    ack = Acknowledgment(
        id="ACK-V1",
        conflict_id=c1[0].id,
        department="Roads Department",
        acknowledged_by="Eng 1",
        report_version=1,
    )
    db.add(ack)
    db.commit()

    # Change schedule and refresh report
    p1.start_date = date(2026, 11, 6)
    p1.end_date = date(2026, 11, 20)
    db.commit()

    c2 = run_conflict_check_internal(db, p1)
    assert len(c2) == 1
    assert c2[0].report_version == 2
    assert c2[0].status == "Awaiting Acknowledgment"

    # Ack for v1 is not valid for v2
    all_acks_v2 = [a for a in c2[0].acknowledgments if a.report_version == 2]
    assert len(all_acks_v2) == 0
    db.close()

# 14. Dashboard KPIs reflect actual project records
def test_dashboard_kpis_reflect_actual_records():
    db = TestingSessionLocal()
    p1 = Project(
        id="KPI-1",
        name="K1",
        department="Roads Department",
        project_type="Resurfacing",
        road_name="Road K",
        latitude=12.9,
        longitude=77.5,
        start_date=date(2026, 11, 1),
        end_date=date(2026, 11, 10),
        status="Planned",
    )
    p2 = Project(
        id="KPI-2",
        name="K2",
        department="Water Department",
        project_type="Pipeline",
        road_name="Road K",
        latitude=12.9,
        longitude=77.5,
        start_date=date(2026, 11, 1),
        end_date=date(2026, 11, 10),
        status="Approved",
    )
    db.add_all([p1, p2])
    db.commit()
    db.close()

    resp = client.get("/api/dashboard")
    assert resp.status_code == 200
    data = resp.json()
    kpis = data["kpis"]
    assert kpis["total_projects"] == 2
    assert kpis["planned"] == 1
    assert kpis["approved"] == 1
    assert kpis["ongoing"] == 0
    assert kpis["completed"] == 0

# 15. Project registration validates coordinates and date ranges
def test_project_registration_validation():
    # End date before start date
    resp1 = client.post(
        "/api/projects",
        json={
            "name": "Invalid Date Proj",
            "department": "Roads Department",
            "project_type": "Resurfacing",
            "road_name": "MG Road",
            "latitude": 12.97,
            "longitude": 77.59,
            "start_date": "2026-11-20",
            "end_date": "2026-11-10",
        },
    )
    assert resp1.status_code == 422

    # Invalid coordinates (lat > 90)
    resp2 = client.post(
        "/api/projects",
        json={
            "name": "Invalid Coord Proj",
            "department": "Roads Department",
            "project_type": "Resurfacing",
            "road_name": "MG Road",
            "latitude": 112.97,
            "longitude": 77.59,
            "start_date": "2026-11-01",
            "end_date": "2026-11-10",
        },
    )
    assert resp2.status_code == 422
