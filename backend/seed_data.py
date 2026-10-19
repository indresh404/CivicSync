import datetime
from sqlalchemy.orm import Session
from backend.models import Project, Conflict, Acknowledgment, AuditLog
from backend.conflict_engine import (
    calculate_project_distance,
    check_date_overlap,
    calculate_severity,
    generate_sequencing_recommendation,
)

def seed_database(db: Session, force: bool = False):
    """Seed the database with deterministic GovTech demonstration data for Mumbai, Mira Road."""
    existing_count = db.query(Project).count()
    if existing_count > 0 and not force:
        return

    if force:
        db.query(Acknowledgment).delete()
        db.query(AuditLog).delete()
        db.query(Conflict).delete()
        db.query(Project).delete()
        db.commit()

    # Base coordinates: Mira Road, Mumbai MMR (MBMC Jurisdiction)
    # Lat: ~19.2812° N, Lon: ~72.8561° E

    # 1. Project A: Roads Dept - Mira Bhayandar Road Resurfacing
    proj_a = Project(
        id="PRJ-2026-001",
        name="Mira Bhayandar Road Asphalt Resurfacing & Milling [DEMO]",
        department="Roads Department",
        project_type="Resurfacing",
        description="Comprehensive asphalt milling and heavy-duty mastic resurfacing for the high-density Mira Bhayandar arterial corridor.",
        road_name="Mira Bhayandar Road",
        road_type="Arterial",
        latitude=19.2848,
        longitude=72.8665,
        end_latitude=19.2855,
        end_longitude=72.8682,
        radius_meters=30.0,
        start_date=datetime.date(2026, 11, 5),
        end_date=datetime.date(2026, 11, 20),
        status="Planned",
        conflict_check_performed=True,
        conflict_check_version=1,
        conflict_check_at=datetime.datetime(2026, 10, 15, 10, 30),
        is_overridden=False,
        created_at=datetime.datetime(2026, 10, 15, 10, 0),
    )

    # 2. Project B: Water Dept - Mira Bhayandar Road Trunk Pipeline (Conflicting with A!)
    proj_b = Project(
        id="PRJ-2026-002",
        name="Mira Bhayandar Road 600mm Potable Water Trunk Main [DEMO]",
        department="Water Department",
        project_type="Pipeline",
        description="Laying of 600mm ductile iron potable water supply line to enhance drinking water distribution to Mira Road East.",
        road_name="Mira Bhayandar Road",
        road_type="Arterial",
        latitude=19.2850,
        longitude=72.8668,
        end_latitude=19.2857,
        end_longitude=72.8685,
        radius_meters=25.0,
        start_date=datetime.date(2026, 11, 10),
        end_date=datetime.date(2026, 11, 25),
        status="Planned",
        conflict_check_performed=True,
        conflict_check_version=1,
        conflict_check_at=datetime.datetime(2026, 10, 16, 14, 20),
        is_overridden=False,
        created_at=datetime.datetime(2026, 10, 16, 14, 0),
    )

    # 3. Project C: Electricity Dept - Shanti Nagar Sector 4 Underground Cabling
    proj_c = Project(
        id="PRJ-2026-003",
        name="Shanti Nagar Sector 4 HT Cable Undergrounding [DEMO]",
        department="Electricity Department",
        project_type="Cabling",
        description="Underground ducting of 11kV high-tension feeder lines along Shanti Nagar commercial avenue to prevent monsoon faults.",
        road_name="Shanti Nagar Main Road",
        road_type="Arterial",
        latitude=19.2828,
        longitude=72.8580,
        radius_meters=35.0,
        start_date=datetime.date(2026, 11, 15),
        end_date=datetime.date(2026, 11, 30),
        status="Planned",
        conflict_check_performed=True,
        conflict_check_version=1,
        conflict_check_at=datetime.datetime(2026, 10, 17, 9, 15),
        is_overridden=False,
        created_at=datetime.datetime(2026, 10, 17, 9, 0),
    )

    # 4. Project D: Telecom Dept - Shanti Nagar 5G Fiber Trenching (Conflicting with C!)
    proj_d = Project(
        id="PRJ-2026-004",
        name="Shanti Nagar 5G Optical Fiber Micro-Trenching [DEMO]",
        department="Telecom Department",
        project_type="Cabling",
        description="Carrier-neutral fiber optic backhaul micro-trenching for civic smart sensors and telecom infrastructure.",
        road_name="Shanti Nagar Main Road",
        road_type="Arterial",
        latitude=19.2830,
        longitude=72.8582,
        radius_meters=25.0,
        start_date=datetime.date(2026, 11, 18),
        end_date=datetime.date(2026, 12, 2),
        status="Planned",
        conflict_check_performed=True,
        conflict_check_version=1,
        conflict_check_at=datetime.datetime(2026, 10, 17, 11, 45),
        is_overridden=False,
        created_at=datetime.datetime(2026, 10, 17, 11, 0),
    )

    # 5. Project E: Gas Dept - Kanakia Beverly Park Emergency Gas Line Reinforcement
    proj_e = Project(
        id="PRJ-2026-005",
        name="Kanakia Beverly Park Gas Main Pipeline Valve Reinforcement [DEMO]",
        department="Gas Department",
        project_type="Gas line",
        description="Mahanagar Gas medium-pressure pipeline valve replacement and cathodic protection mitigation near Kanakia Cinepolis hub.",
        road_name="Kanakia Road",
        road_type="Arterial",
        latitude=19.2785,
        longitude=72.8715,
        radius_meters=20.0,
        start_date=datetime.date(2026, 10, 25),
        end_date=datetime.date(2026, 11, 8),
        status="Approved",
        conflict_check_performed=True,
        conflict_check_version=1,
        conflict_check_at=datetime.datetime(2026, 10, 12, 16, 0),
        is_overridden=True,
        override_reason="Critical public safety override: aging medium-pressure gas valve leak hazard confirmed by safety inspector. Work expedited ahead of municipal resurfacing window.",
        override_by="City Administrator (Simulated)",
        override_at=datetime.datetime(2026, 10, 14, 11, 15),
        created_at=datetime.datetime(2026, 10, 12, 15, 30),
    )

    # 6. Project F: Sewerage Dept - Pleasant Park Stormwater Drain (No conflict, clean approval)
    proj_f = Project(
        id="PRJ-2026-006",
        name="Pleasant Park Stormwater Culvert Desilting & RCC Lining [DEMO]",
        department="Sewerage Department",
        project_type="Sewerage",
        description="Monsoon preparedness desilting and reinforced cement concrete relining for flood mitigation in Pleasant Park sector.",
        road_name="Pleasant Park Link Road",
        road_type="Residential",
        latitude=19.2692,
        longitude=72.8735,
        radius_meters=20.0,
        start_date=datetime.date(2026, 11, 1),
        end_date=datetime.date(2026, 11, 14),
        status="Approved",
        conflict_check_performed=True,
        conflict_check_version=1,
        conflict_check_at=datetime.datetime(2026, 10, 10, 14, 0),
        is_overridden=False,
        created_at=datetime.datetime(2026, 10, 10, 12, 0),
    )

    # 7. Project G: Roads Dept - Kashimira WEH Junction (Ongoing)
    proj_g = Project(
        id="PRJ-2026-007",
        name="Kashimira WEH Junction Kerb Pavers & Slip Road Repairs [DEMO]",
        department="Roads Department",
        project_type="Resurfacing",
        description="Ongoing structural kerb paver installation and pedestrian crossing realignment at Western Express Highway Kashimira node.",
        road_name="Western Express Highway Junction",
        road_type="Arterial",
        latitude=19.2625,
        longitude=72.8805,
        radius_meters=25.0,
        start_date=datetime.date(2026, 10, 1),
        end_date=datetime.date(2026, 10, 31),
        status="Ongoing",
        conflict_check_performed=True,
        conflict_check_version=1,
        conflict_check_at=datetime.datetime(2026, 9, 28, 10, 0),
        is_overridden=False,
        created_at=datetime.datetime(2026, 9, 25, 9, 0),
    )

    # 8. Project H: Water Dept - Station Road (Completed)
    proj_h = Project(
        id="PRJ-2026-008",
        name="Mira Road Station Road Feeder Line Chamber Overhaul [DEMO]",
        department="Water Department",
        project_type="Pipeline",
        description="Completed pipeline rehabilitation and pressure stabilization valve chamber near Mira Road railway station.",
        road_name="Station Road (Mira Road East)",
        road_type="Residential",
        latitude=19.2810,
        longitude=72.8540,
        radius_meters=20.0,
        start_date=datetime.date(2026, 9, 1),
        end_date=datetime.date(2026, 9, 18),
        status="Completed",
        conflict_check_performed=True,
        conflict_check_version=1,
        conflict_check_at=datetime.datetime(2026, 8, 25, 11, 0),
        is_overridden=False,
        created_at=datetime.datetime(2026, 8, 20, 10, 0),
    )

    db.add_all([proj_a, proj_b, proj_c, proj_d, proj_e, proj_f, proj_g, proj_h])
    db.commit()

    # Create Conflict 1: Mira Bhayandar Road Resurfacing vs Pipeline
    dist_ab = calculate_project_distance(proj_a, proj_b)
    has_overlap_ab, start_ab, end_ab, days_ab = check_date_overlap(
        proj_a.start_date, proj_a.end_date, proj_b.start_date, proj_b.end_date
    )
    sev_ab = calculate_severity(dist_ab, 50.0, days_ab, proj_a.road_type, proj_b.road_type)
    seq_ab = generate_sequencing_recommendation(proj_a, proj_b, start_ab, end_ab, days_ab)

    conf_1 = Conflict(
        id="CONF-2026-001",
        project_a_id=proj_a.id,
        project_b_id=proj_b.id,
        calculated_distance=dist_ab,
        threshold=50.0,
        overlap_start=start_ab,
        overlap_end=end_ab,
        overlapping_days=days_ab,
        proximity_score=sev_ab["proximity_score"],
        overlap_score=sev_ab["overlap_score"],
        road_importance_score=sev_ab["road_importance_score"],
        severity_score=sev_ab["severity_score"],
        severity_level=sev_ab["severity_level"],
        conflict_reason=(
            f"Spatial proximity {dist_ab}m <= 50m threshold on Arterial corridor '{proj_a.road_name}' (Mira Road), "
            f"with {days_ab} days overlapping execution schedule."
        ),
        suggested_sequence=seq_ab["suggested_sequence"],
        suggested_dates=seq_ab["suggested_dates"],
        status="Awaiting Acknowledgment",
        report_version=1,
        created_at=datetime.datetime(2026, 10, 16, 14, 25),
    )

    # Create Conflict 2: Shanti Nagar Cabling vs Fiber Trenching (Two utilities)
    dist_cd = calculate_project_distance(proj_c, proj_d)
    has_overlap_cd, start_cd, end_cd, days_cd = check_date_overlap(
        proj_c.start_date, proj_c.end_date, proj_d.start_date, proj_d.end_date
    )
    sev_cd = calculate_severity(dist_cd, 50.0, days_cd, proj_c.road_type, proj_d.road_type)
    seq_cd = generate_sequencing_recommendation(proj_c, proj_d, start_cd, end_cd, days_cd)

    conf_2 = Conflict(
        id="CONF-2026-002",
        project_a_id=proj_c.id,
        project_b_id=proj_d.id,
        calculated_distance=dist_cd,
        threshold=50.0,
        overlap_start=start_cd,
        overlap_end=end_cd,
        overlapping_days=days_cd,
        proximity_score=sev_cd["proximity_score"],
        overlap_score=sev_cd["overlap_score"],
        road_importance_score=sev_cd["road_importance_score"],
        severity_score=sev_cd["severity_score"],
        severity_level=sev_cd["severity_level"],
        conflict_reason=(
            f"Dual subterranean excavation {dist_cd}m apart on '{proj_c.road_name}' (Shanti Nagar), "
            f"with {days_cd} days simultaneous digging schedule."
        ),
        suggested_sequence=seq_cd["suggested_sequence"],
        suggested_dates=seq_cd["suggested_dates"],
        status="Awaiting Acknowledgment",
        report_version=1,
        created_at=datetime.datetime(2026, 10, 17, 11, 50),
    )

    db.add_all([conf_1, conf_2])
    db.commit()

    # Acknowledgment for Conflict 1: Roads Department acknowledged, Water Department pending
    ack_1 = Acknowledgment(
        id="ACK-2026-001",
        conflict_id=conf_1.id,
        department="Roads Department",
        acknowledged_by="E. Sharma (MBMC Executive Engineer - Roads)",
        report_version=1,
        note="MBMC Roads Dept agrees to hold Mira Bhayandar Road resurfacing until Water Dept finishes trunk pipeline installation.",
        created_at=datetime.datetime(2026, 10, 18, 9, 30),
    )
    db.add(ack_1)

    # Audit Logs: Real historical narrative for Mira Road MBMC
    audit_events = [
        AuditLog(
            id="AUD-2026-001",
            action_type="PROJECT_CREATED",
            project_id=proj_a.id,
            actor="E. Sharma",
            department="Roads Department",
            note="Registered project 'Mira Bhayandar Road Asphalt Resurfacing & Milling' on Mira Bhayandar Road.",
            created_at=datetime.datetime(2026, 10, 15, 10, 0),
        ),
        AuditLog(
            id="AUD-2026-002",
            action_type="PROJECT_CREATED",
            project_id=proj_b.id,
            actor="R. Menon",
            department="Water Department",
            note="Registered project 'Mira Bhayandar Road 600mm Potable Water Trunk Main' on Mira Bhayandar Road.",
            created_at=datetime.datetime(2026, 10, 16, 14, 0),
        ),
        AuditLog(
            id="AUD-2026-003",
            action_type="CONFLICT_DETECTED",
            project_id=proj_b.id,
            conflict_id=conf_1.id,
            actor="System (Deterministic Conflict Engine)",
            department="CivicSync Core",
            note=f"Deterministic conflict detected on Mira Bhayandar Road between PRJ-2026-001 (Roads) and PRJ-2026-002 (Water) (Distance ~{dist_ab}m, Overlap 11 days).",
            created_at=datetime.datetime(2026, 10, 16, 14, 25),
        ),
        AuditLog(
            id="AUD-2026-004",
            action_type="REPORT_GENERATED",
            project_id=proj_a.id,
            conflict_id=conf_1.id,
            actor="System (CivicSync Engine)",
            department="CivicSync Core",
            note="Conflict Report v1 generated. Precedence rule applied: Underground utility work must precede resurfacing to prevent road re-digging.",
            created_at=datetime.datetime(2026, 10, 16, 14, 26),
        ),
        AuditLog(
            id="AUD-2026-005",
            action_type="DEPARTMENT_ACKNOWLEDGED",
            project_id=proj_a.id,
            conflict_id=conf_1.id,
            actor="E. Sharma",
            department="Roads Department",
            note="Roads Department acknowledged conflict CONF-2026-001 report v1. Water Department acknowledgment pending.",
            created_at=datetime.datetime(2026, 10, 18, 9, 30),
        ),
        AuditLog(
            id="AUD-2026-006",
            action_type="PROJECT_CREATED",
            project_id=proj_c.id,
            actor="V. Patel",
            department="Electricity Department",
            note="Registered project 'Shanti Nagar Sector 4 HT Cable Undergrounding'.",
            created_at=datetime.datetime(2026, 10, 17, 9, 0),
        ),
        AuditLog(
            id="AUD-2026-007",
            action_type="PROJECT_CREATED",
            project_id=proj_d.id,
            actor="K. Rao",
            department="Telecom Department",
            note="Registered project 'Shanti Nagar 5G Optical Fiber Micro-Trenching'.",
            created_at=datetime.datetime(2026, 10, 17, 11, 0),
        ),
        AuditLog(
            id="AUD-2026-008",
            action_type="CONFLICT_DETECTED",
            project_id=proj_d.id,
            conflict_id=conf_2.id,
            actor="System (Deterministic Conflict Engine)",
            department="CivicSync Core",
            note="Conflict CONF-2026-002 detected: Dual underground cabling projects on Shanti Nagar Main Road. Joint duct-sharing coordination required.",
            created_at=datetime.datetime(2026, 10, 17, 11, 50),
        ),
        AuditLog(
            id="AUD-2026-009",
            action_type="ADMIN_OVERRIDE",
            project_id=proj_e.id,
            actor="City Administrator (Simulated)",
            department="Executive Administration",
            note="Approval override granted for PRJ-2026-005 on Kanakia Road. Reason: 'Critical public safety override: aging medium-pressure gas valve leak hazard confirmed by safety inspector.'",
            created_at=datetime.datetime(2026, 10, 14, 11, 15),
        ),
        AuditLog(
            id="AUD-2026-010",
            action_type="APPROVAL_GRANTED",
            project_id=proj_f.id,
            actor="City Administrator (Simulated)",
            department="Executive Administration",
            note="Project 'Pleasant Park Stormwater Culvert Desilting & RCC Lining' approved after clean conflict check report.",
            created_at=datetime.datetime(2026, 10, 10, 14, 5),
        ),
    ]

    db.add_all(audit_events)
    db.commit()
