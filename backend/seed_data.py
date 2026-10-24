import datetime
from sqlalchemy.orm import Session
from backend.models import Department, User, Project, Conflict, Acknowledgment, AuditLog, Config
from backend.auth import DEPARTMENTS, PRESET_USERS
from backend.conflict_engine import (
    calculate_project_distance,
    check_date_overlap,
    calculate_severity,
    generate_sequencing_recommendation,
)
from backend.mongo_db import mongo_manager

def seed_database(db: Session, force: bool = False):
    """
    Seed CivicSync deterministic demonstration dataset:
    - 6 Departments
    - 1 Admin user + 1 user per department (7 total)
    - Scenario A: Roads resurfacing vs Water pipeline, arterial road, overlapping dates -> High severity, sequencing suggestion.
    - Scenario B: Electricity cabling vs Telecom, residential road -> Medium, joint trenching.
    - Scenario C: Gas line planned on road resurfaced 3 months ago -> cooldown warning, admin override with reason.
    - ~15 background projects across city grid
    - Audit logs and configs
    """
    existing_count = db.query(Project).count()
    if existing_count > 0 and not force:
        return

    if force:
        db.query(Acknowledgment).delete()
        db.query(AuditLog).delete()
        db.query(Conflict).delete()
        db.query(Project).delete()
        db.query(User).delete()
        db.query(Department).delete()
        db.query(Config).delete()
        db.commit()

    # 1. Seed Departments
    dept_objs = []
    for d in DEPARTMENTS:
        dept = Department(id=d["id"], name=d["name"], color=d["color"])
        dept_objs.append(dept)
    db.add_all(dept_objs)

    # 2. Seed Users
    user_objs = []
    for u in PRESET_USERS:
        usr = User(
            id=u["id"],
            email=u["email"],
            name=u["name"],
            department_id=u["department_id"],
            role=u["role"],
            password_hash=u["password_hash"],
        )
        user_objs.append(usr)
    db.add_all(user_objs)

    # 3. Seed Config values
    config_items = [
        Config(key="distance_threshold_m", value="50.0", description="Conflict spatial threshold in meters"),
        Config(key="cooldown_months", value="24", description="Dig cooldown window after resurfacing"),
        Config(key="avg_dig_cost", value="350000.0", description="Average municipal re-excavation cost in INR"),
        Config(key="monsoon_start", value="06-01", description="Monsoon window start date (MM-DD)"),
        Config(key="monsoon_end", value="09-30", description="Monsoon window end date (MM-DD)"),
        Config(key="weight_closeness", value="0.45", description="Severity weight: proximity"),
        Config(key="weight_overlap", value="0.35", description="Severity weight: date overlap"),
        Config(key="weight_road", value="0.20", description="Severity weight: road importance"),
    ]
    db.add_all(config_items)
    db.commit()

    # -------------------------------------------------------------
    # SCRIPTED SCENARIOS
    # -------------------------------------------------------------

    # SCENARIO A: Roads resurfacing vs Water pipeline on arterial road (High Severity)
    proj_a1 = Project(
        id="PRJ-2026-001",
        title="Mira Bhayandar Road Asphalt Resurfacing & Milling [Scenario A]",
        name="Mira Bhayandar Road Asphalt Resurfacing & Milling [Scenario A]",
        department_id="DEPT-ROADS",
        department="Roads Department",
        project_type="Resurfacing",
        geometry_type="line",
        lat=19.2848,
        lng=72.8665,
        latitude=19.2848,
        longitude=72.8665,
        end_lat=19.2855,
        end_lng=72.8682,
        end_latitude=19.2855,
        end_longitude=72.8682,
        radius_m=30.0,
        radius_meters=30.0,
        road_name="Mira Bhayandar Road",
        road_type="Arterial",
        description="Heavy-duty bituminous milling and mastic resurfacing on the central Mira Bhayandar arterial corridor.",
        start_date=datetime.date(2026, 11, 5),
        end_date=datetime.date(2026, 11, 20),
        status="Planned",
        has_conflict=True,
        conflict_check_performed=True,
        conflict_check_version=1,
        conflict_check_at=datetime.datetime(2026, 10, 15, 10, 30),
        is_overridden=False,
        created_at=datetime.datetime(2026, 10, 15, 10, 0),
    )

    proj_a2 = Project(
        id="PRJ-2026-002",
        title="Mira Bhayandar Road 600mm Potable Water Trunk Main [Scenario A]",
        name="Mira Bhayandar Road 600mm Potable Water Trunk Main [Scenario A]",
        department_id="DEPT-WATER",
        department="Water Department",
        project_type="Pipeline",
        geometry_type="line",
        lat=19.2850,
        lng=72.8668,
        latitude=19.2850,
        longitude=72.8668,
        end_lat=19.2857,
        end_lng=72.8685,
        end_latitude=19.2857,
        end_longitude=72.8685,
        radius_m=25.0,
        radius_meters=25.0,
        road_name="Mira Bhayandar Road",
        road_type="Arterial",
        description="Laying 600mm ductile iron potable water supply pipeline to enhance water pressure to Mira Road East.",
        start_date=datetime.date(2026, 11, 10),
        end_date=datetime.date(2026, 11, 25),
        status="Planned",
        has_conflict=True,
        conflict_check_performed=True,
        conflict_check_version=1,
        conflict_check_at=datetime.datetime(2026, 10, 16, 14, 20),
        is_overridden=False,
        created_at=datetime.datetime(2026, 10, 16, 14, 0),
    )

    # SCENARIO B: Electricity cabling vs Telecom on residential road (Medium Severity, Joint Trench candidate)
    proj_b1 = Project(
        id="PRJ-2026-003",
        title="Silver Park 11kV Underground Power Ducting [Scenario B]",
        name="Silver Park 11kV Underground Power Ducting [Scenario B]",
        department_id="DEPT-ELEC",
        department="Electricity Department",
        project_type="Cabling",
        geometry_type="point",
        lat=19.2828,
        lng=72.8580,
        latitude=19.2828,
        longitude=72.8580,
        radius_m=35.0,
        radius_meters=35.0,
        road_name="Silver Park Residential Lane",
        road_type="Residential",
        description="Underground ducting of power distribution lines to eliminate overhead wiring.",
        start_date=datetime.date(2026, 11, 15),
        end_date=datetime.date(2026, 11, 30),
        status="Planned",
        has_conflict=True,
        conflict_check_performed=True,
        conflict_check_version=1,
        conflict_check_at=datetime.datetime(2026, 10, 17, 9, 15),
        is_overridden=False,
        created_at=datetime.datetime(2026, 10, 17, 9, 0),
    )

    proj_b2 = Project(
        id="PRJ-2026-004",
        title="Silver Park 5G Fiber Optic Micro-Trenching [Scenario B]",
        name="Silver Park 5G Fiber Optic Micro-Trenching [Scenario B]",
        department_id="DEPT-TELE",
        department="Telecom Department",
        project_type="Cabling",
        geometry_type="point",
        lat=19.2830,
        lng=72.8582,
        latitude=19.2830,
        longitude=72.8582,
        radius_m=25.0,
        radius_meters=25.0,
        road_name="Silver Park Residential Lane",
        road_type="Residential",
        description="Micro-trenching for civic smart sensors and carrier-neutral fiber optic backhaul.",
        start_date=datetime.date(2026, 11, 18),
        end_date=datetime.date(2026, 12, 2),
        status="Planned",
        has_conflict=True,
        conflict_check_performed=True,
        conflict_check_version=1,
        conflict_check_at=datetime.datetime(2026, 10, 17, 11, 45),
        is_overridden=False,
        created_at=datetime.datetime(2026, 10, 17, 11, 0),
    )

    # SCENARIO C: Gas line planned on road resurfaced 3 months ago (Cooldown Warning, Admin Override)
    # Reference: road completed resurfacing 3 months ago (July 2026)
    proj_c_past = Project(
        id="PRJ-2026-000",
        title="Kanakia Road Complete Asphalt Overlay [Completed 3 Mos Ago]",
        name="Kanakia Road Complete Asphalt Overlay [Completed 3 Mos Ago]",
        department_id="DEPT-ROADS",
        department="Roads Department",
        project_type="Resurfacing",
        geometry_type="line",
        lat=19.2780,
        lng=72.8710,
        latitude=19.2780,
        longitude=72.8710,
        end_lat=19.2790,
        end_lng=72.8720,
        end_latitude=19.2790,
        end_longitude=72.8720,
        radius_m=30.0,
        radius_meters=30.0,
        road_name="Kanakia Road",
        road_type="Arterial",
        description="Full-depth asphalt surfacing completed under municipal capital works budget.",
        start_date=datetime.date(2026, 6, 15),
        end_date=datetime.date(2026, 7, 20),
        status="Completed",
        has_conflict=False,
        conflict_check_performed=True,
        conflict_check_version=1,
        conflict_check_at=datetime.datetime(2026, 6, 10, 10, 0),
        is_overridden=False,
        created_at=datetime.datetime(2026, 6, 5, 9, 0),
    )

    proj_c_new = Project(
        id="PRJ-2026-005",
        title="Kanakia Road Emergency Gas Pipeline Valve Replacement [Scenario C]",
        name="Kanakia Road Emergency Gas Pipeline Valve Replacement [Scenario C]",
        department_id="DEPT-GAS",
        department="Gas Department",
        project_type="Gas line",
        geometry_type="point",
        lat=19.2785,
        lng=72.8715,
        latitude=19.2785,
        longitude=72.8715,
        radius_m=20.0,
        radius_meters=20.0,
        road_name="Kanakia Road",
        road_type="Arterial",
        description="Medium-pressure gas line valve replacement due to safety inspection leak alerts.",
        start_date=datetime.date(2026, 10, 25),
        end_date=datetime.date(2026, 11, 8),
        status="Approved",
        has_conflict=False,
        conflict_check_performed=True,
        conflict_check_version=1,
        conflict_check_at=datetime.datetime(2026, 10, 12, 16, 0),
        is_overridden=True,
        override_reason="EMERGENCY SAFETY OVERRIDE: Certified underground valve seal failure detected by municipal gas audit. Immediate excavation authorized under Municipal Disaster Management Act.",
        override_by="Rajesh Sharma (City Commissioner)",
        override_at=datetime.datetime(2026, 10, 14, 11, 15),
        cooldown_justification="Safety emergency: valve leak threatens residential society blocks nearby. Cold-patch restoration bond posted.",
        created_at=datetime.datetime(2026, 10, 12, 15, 30),
    )

    # 10 BACKGROUND PROJECTS across departments & statuses
    background_projects = [
        Project(
            id="PRJ-2026-006",
            title="Pleasant Park Stormwater Culvert Desilting & RCC Lining",
            name="Pleasant Park Stormwater Culvert Desilting & RCC Lining",
            department_id="DEPT-SEWER",
            department="Sewerage Department",
            project_type="Sewerage",
            geometry_type="point",
            lat=19.2692,
            lng=72.8735,
            latitude=19.2692,
            longitude=72.8735,
            radius_m=20.0,
            radius_meters=20.0,
            road_name="Pleasant Park Link Road",
            road_type="Residential",
            description="Culvert desilting and reinforced cement concrete relining for flood mitigation.",
            start_date=datetime.date(2026, 11, 1),
            end_date=datetime.date(2026, 11, 14),
            status="Approved",
            has_conflict=False,
            conflict_check_performed=True,
            created_at=datetime.datetime(2026, 10, 10, 12, 0),
        ),
        Project(
            id="PRJ-2026-007",
            title="Western Express Highway Junction Kerb Pavers & Slip Road",
            name="Western Express Highway Junction Kerb Pavers & Slip Road",
            department_id="DEPT-ROADS",
            department="Roads Department",
            project_type="Resurfacing",
            geometry_type="line",
            lat=19.2625,
            lng=72.8805,
            latitude=19.2625,
            longitude=72.8805,
            end_lat=19.2640,
            end_lng=72.8820,
            end_latitude=19.2640,
            end_longitude=72.8820,
            radius_m=25.0,
            radius_meters=25.0,
            road_name="Western Express Highway Junction",
            road_type="Arterial",
            description="Ongoing kerb paver installation and pedestrian crossing realignment.",
            start_date=datetime.date(2026, 10, 1),
            end_date=datetime.date(2026, 10, 31),
            status="Ongoing",
            has_conflict=False,
            conflict_check_performed=True,
            created_at=datetime.datetime(2026, 9, 25, 9, 0),
        ),
        Project(
            id="PRJ-2026-008",
            title="Station Road Feeder Line Chamber Overhaul",
            name="Station Road Feeder Line Chamber Overhaul",
            department_id="DEPT-WATER",
            department="Water Department",
            project_type="Pipeline",
            geometry_type="point",
            lat=19.2810,
            lng=72.8540,
            latitude=19.2810,
            longitude=72.8540,
            radius_m=20.0,
            radius_meters=20.0,
            road_name="Station Road (Mira Road East)",
            road_type="Residential",
            description="Pipeline rehabilitation and pressure stabilization valve chamber.",
            start_date=datetime.date(2026, 9, 1),
            end_date=datetime.date(2026, 9, 18),
            status="Completed",
            has_conflict=False,
            conflict_check_performed=True,
            created_at=datetime.datetime(2026, 8, 20, 10, 0),
        ),
        Project(
            id="PRJ-2026-009",
            title="Beverly Park Substation Transformer Feeder Augmentation",
            name="Beverly Park Substation Transformer Feeder Augmentation",
            department_id="DEPT-ELEC",
            department="Electricity Department",
            project_type="Cabling",
            geometry_type="point",
            lat=19.2750,
            lng=72.8640,
            latitude=19.2750,
            longitude=72.8640,
            radius_m=25.0,
            radius_meters=25.0,
            road_name="Beverly Park Avenue",
            road_type="Arterial",
            description="Reinforcing electrical feeder bus to handle peak evening residential loads.",
            start_date=datetime.date(2026, 11, 22),
            end_date=datetime.date(2026, 12, 5),
            status="Planned",
            has_conflict=False,
            conflict_check_performed=True,
            created_at=datetime.datetime(2026, 10, 14, 11, 0),
        ),
        Project(
            id="PRJ-2026-010",
            title="Poonam Sagar Underground Sewage Main Interceptor",
            name="Poonam Sagar Underground Sewage Main Interceptor",
            department_id="DEPT-SEWER",
            department="Sewerage Department",
            project_type="Sewerage",
            geometry_type="line",
            lat=19.2890,
            lng=72.8550,
            latitude=19.2890,
            longitude=72.8550,
            end_lat=19.2905,
            end_lng=72.8570,
            end_latitude=19.2905,
            end_longitude=72.8570,
            radius_m=30.0,
            radius_meters=30.0,
            road_name="Poonam Sagar Road",
            road_type="Residential",
            description="Trenchless pipe-jacking of 900mm gravity sewer main.",
            start_date=datetime.date(2026, 12, 1),
            end_date=datetime.date(2026, 12, 20),
            status="Planned",
            has_conflict=False,
            conflict_check_performed=True,
            created_at=datetime.datetime(2026, 10, 18, 16, 0),
        ),
        Project(
            id="PRJ-2026-011",
            title="Hatkesh Udyog Nagar Optical Backhaul Connectivity",
            name="Hatkesh Udyog Nagar Optical Backhaul Connectivity",
            department_id="DEPT-TELE",
            department="Telecom Department",
            project_type="Cabling",
            geometry_type="point",
            lat=19.2710,
            lng=72.8680,
            latitude=19.2710,
            longitude=72.8680,
            radius_m=20.0,
            radius_meters=20.0,
            road_name="Hatkesh Main Road",
            road_type="Arterial",
            description="Underground fiber laying connecting commercial industrial IT park.",
            start_date=datetime.date(2026, 10, 18),
            end_date=datetime.date(2026, 11, 4),
            status="Ongoing",
            has_conflict=False,
            conflict_check_performed=True,
            created_at=datetime.datetime(2026, 10, 5, 14, 0),
        ),
        Project(
            id="PRJ-2026-012",
            title="GCC Club Road Pothole Patching & Bituminous Seal",
            name="GCC Club Road Pothole Patching & Bituminous Seal",
            department_id="DEPT-ROADS",
            department="Roads Department",
            project_type="Resurfacing",
            geometry_type="point",
            lat=19.2875,
            lng=72.8740,
            latitude=19.2875,
            longitude=72.8740,
            radius_m=20.0,
            radius_meters=20.0,
            road_name="GCC Club Road",
            road_type="Residential",
            description="Preventive micro-surfacing following pre-monsoon inspections.",
            start_date=datetime.date(2026, 9, 10),
            end_date=datetime.date(2026, 9, 25),
            status="Completed",
            has_conflict=False,
            conflict_check_performed=True,
            created_at=datetime.datetime(2026, 9, 1, 10, 0),
        ),
        Project(
            id="PRJ-2026-013",
            title="Jangid Complex Domestic PNG Connection Grid",
            name="Jangid Complex Domestic PNG Connection Grid",
            department_id="DEPT-GAS",
            department="Gas Department",
            project_type="Gas line",
            geometry_type="point",
            lat=19.2860,
            lng=72.8620,
            latitude=19.2860,
            longitude=72.8620,
            radius_m=15.0,
            radius_meters=15.0,
            road_name="Jangid Complex Internal Road",
            road_type="Residential",
            description="Piped natural gas connections to 400 residential flats.",
            start_date=datetime.date(2026, 11, 12),
            end_date=datetime.date(2026, 11, 28),
            status="Approved",
            has_conflict=False,
            conflict_check_performed=True,
            created_at=datetime.datetime(2026, 10, 11, 9, 30),
        ),
        Project(
            id="PRJ-2026-014",
            title="Maxus Mall Junction Signal Smart Sensor Network",
            name="Maxus Mall Junction Signal Smart Sensor Network",
            department_id="DEPT-TELE",
            department="Telecom Department",
            project_type="Other",
            geometry_type="point",
            lat=19.2940,
            lng=72.8520,
            latitude=19.2940,
            longitude=72.8520,
            radius_m=20.0,
            radius_meters=20.0,
            road_name="150 Feet Road",
            road_type="Arterial",
            description="Traffic surveillance camera fiber feeds and loop sensors.",
            start_date=datetime.date(2026, 10, 20),
            end_date=datetime.date(2026, 11, 10),
            status="Ongoing",
            has_conflict=False,
            conflict_check_performed=True,
            created_at=datetime.datetime(2026, 10, 2, 11, 0),
        ),
        Project(
            id="PRJ-2026-015",
            title="Srishti Housing Sector 3 Water Sluice Valve Replacement",
            name="Srishti Housing Sector 3 Water Sluice Valve Replacement",
            department_id="DEPT-WATER",
            department="Water Department",
            project_type="Pipeline",
            geometry_type="point",
            lat=19.2730,
            lng=72.8790,
            latitude=19.2730,
            longitude=72.8790,
            radius_m=15.0,
            radius_meters=15.0,
            road_name="Srishti Main Road",
            road_type="Residential",
            description="Replacement of corroded sluice gate valve chamber.",
            start_date=datetime.date(2026, 11, 5),
            end_date=datetime.date(2026, 11, 15),
            status="Approved",
            has_conflict=False,
            conflict_check_performed=True,
            created_at=datetime.datetime(2026, 10, 8, 15, 0),
        ),
    ]

    all_projects = [proj_a1, proj_a2, proj_b1, proj_b2, proj_c_past, proj_c_new] + background_projects
    db.add_all(all_projects)
    db.commit()

    # 4. Create Conflicts for Scenario A & Scenario B
    # Conflict 1: Scenario A (High Severity)
    dist_a = calculate_project_distance(proj_a1, proj_a2)
    _, start_a, end_a, days_a = check_date_overlap(
        proj_a1.start_date, proj_a1.end_date, proj_a2.start_date, proj_a2.end_date
    )
    sev_a = calculate_severity(dist_a, 50.0, days_a, proj_a1.road_type, proj_a2.road_type)
    seq_a = generate_sequencing_recommendation(proj_a1, proj_a2, start_a, end_a, days_a)

    conf_a = Conflict(
        id="CONF-2026-001",
        project_a_id=proj_a1.id,
        project_b_id=proj_a2.id,
        calculated_distance=dist_a,
        threshold=50.0,
        overlap_start=start_a,
        overlap_end=end_a,
        overlapping_days=days_a,
        proximity_score=sev_a["proximity_score"],
        overlap_score=sev_a["overlap_score"],
        road_importance_score=sev_a["road_importance_score"],
        severity_score=sev_a["severity_score"],
        severity_level="High",
        severity_breakdown=sev_a["severity_breakdown"],
        conflict_reason=(
            f"High-severity arterial conflict: {dist_a}m apart on '{proj_a1.road_name}', "
            f"with {days_a} days overlapping schedule. CivicSync sequencing rule required."
        ),
        suggested_sequence=seq_a["suggested_sequence"],
        suggested_dates=seq_a["suggested_dates"],
        resolution="Pending",
        status="Awaiting Acknowledgment",
        ack_a=True,   # Roads Department acknowledged
        ack_b=False,  # Water Department pending
        ack_a_by="Amit Patil (Chief Roads Engineer)",
        ack_a_at=datetime.datetime(2026, 10, 18, 9, 30),
        report_version=1,
        created_at=datetime.datetime(2026, 10, 16, 14, 25),
    )

    # Conflict 2: Scenario B (Medium Severity, Residential Road)
    dist_b = calculate_project_distance(proj_b1, proj_b2)
    _, start_b, end_b, days_b = check_date_overlap(
        proj_b1.start_date, proj_b1.end_date, proj_b2.start_date, proj_b2.end_date
    )
    sev_b = calculate_severity(dist_b, 50.0, days_b, proj_b1.road_type, proj_b2.road_type)
    seq_b = generate_sequencing_recommendation(proj_b1, proj_b2, start_b, end_b, days_b)

    conf_b = Conflict(
        id="CONF-2026-002",
        project_a_id=proj_b1.id,
        project_b_id=proj_b2.id,
        calculated_distance=dist_b,
        threshold=50.0,
        overlap_start=start_b,
        overlap_end=end_b,
        overlapping_days=days_b,
        proximity_score=sev_b["proximity_score"],
        overlap_score=sev_b["overlap_score"],
        road_importance_score=sev_b["road_importance_score"],
        severity_score=sev_b["severity_score"],
        severity_level="Medium",
        severity_breakdown=sev_b["severity_breakdown"],
        conflict_reason=(
            f"Subterranean utility clash: {dist_b}m separation on '{proj_b1.road_name}', "
            f"with {days_b} days concurrent digging. Ideal candidate for Joint Trenching."
        ),
        suggested_sequence=seq_b["suggested_sequence"],
        suggested_dates=seq_b["suggested_dates"],
        resolution="Pending",
        status="Awaiting Acknowledgment",
        ack_a=False,
        ack_b=False,
        report_version=1,
        created_at=datetime.datetime(2026, 10, 17, 11, 50),
    )

    db.add_all([conf_a, conf_b])
    db.commit()

    # 5. Acknowledgment for Conflict 1
    ack_a = Acknowledgment(
        id="ACK-2026-001",
        conflict_id=conf_a.id,
        department="Roads Department",
        acknowledged_by="Amit Patil (Chief Roads Engineer)",
        report_version=1,
        note="Roads Department agrees to hold resurfacing until Water Department finishes ductile iron trunk pipeline.",
        created_at=datetime.datetime(2026, 10, 18, 9, 30),
    )
    db.add(ack_a)

    # 6. Audit Trail
    audit_events = [
        AuditLog(
            id="AUD-2026-001",
            action_type="PROJECT_CREATED",
            project_id=proj_a1.id,
            actor="Amit Patil",
            department="Roads Department",
            note="Registered project 'Mira Bhayandar Road Asphalt Resurfacing & Milling' on Mira Bhayandar Road.",
            created_at=datetime.datetime(2026, 10, 15, 10, 0),
        ),
        AuditLog(
            id="AUD-2026-002",
            action_type="PROJECT_CREATED",
            project_id=proj_a2.id,
            actor="Priya Deshmukh",
            department="Water Department",
            note="Registered project 'Mira Bhayandar Road 600mm Potable Water Trunk Main' on Mira Bhayandar Road.",
            created_at=datetime.datetime(2026, 10, 16, 14, 0),
        ),
        AuditLog(
            id="AUD-2026-003",
            action_type="CONFLICT_DETECTED",
            project_id=proj_a2.id,
            conflict_id=conf_a.id,
            actor="System (CivicSync Conflict Engine)",
            department="CivicSync Engine",
            note=f"High-severity conflict detected on Mira Bhayandar Road between PRJ-2026-001 and PRJ-2026-002 ({dist_a}m separation, {days_a} days overlap).",
            created_at=datetime.datetime(2026, 10, 16, 14, 25),
        ),
        AuditLog(
            id="AUD-2026-004",
            action_type="REPORT_GENERATED",
            project_id=proj_a1.id,
            conflict_id=conf_a.id,
            actor="System (CivicSync Engine)",
            department="CivicSync Engine",
            note="Conflict Report v1 generated. Precedence rule applied: Underground pipeline work must precede asphalt resurfacing.",
            created_at=datetime.datetime(2026, 10, 16, 14, 26),
        ),
        AuditLog(
            id="AUD-2026-005",
            action_type="DEPARTMENT_ACKNOWLEDGED",
            project_id=proj_a1.id,
            conflict_id=conf_a.id,
            actor="Amit Patil",
            department="Roads Department",
            note="Roads Department acknowledged conflict report. Awaiting Water Department acknowledgment.",
            created_at=datetime.datetime(2026, 10, 18, 9, 30),
        ),
        AuditLog(
            id="AUD-2026-006",
            action_type="ADMIN_OVERRIDE",
            project_id=proj_c_new.id,
            actor="Rajesh Sharma (City Commissioner)",
            department="Municipal Administration",
            note="Approval override granted for PRJ-2026-005 on Kanakia Road despite 3-month cooldown. Reason: Emergency public safety gas valve leak repair.",
            created_at=datetime.datetime(2026, 10, 14, 11, 15),
        ),
    ]
    db.add_all(audit_events)
    db.commit()

    # Sync to MongoDB if connected
    if mongo_manager.is_connected:
        for p in all_projects:
            mongo_manager.save_project({
                "id": p.id,
                "title": p.title,
                "department_id": p.department_id,
                "project_type": p.project_type,
                "geometry_type": p.geometry_type,
                "lat": p.lat,
                "lng": p.lng,
                "road_name": p.road_name,
                "status": p.status,
                "has_conflict": p.has_conflict,
            })
        for c in [conf_a, conf_b]:
            mongo_manager.save_conflict({
                "id": c.id,
                "project_a_id": c.project_a_id,
                "project_b_id": c.project_b_id,
                "severity_score": c.severity_score,
                "resolution": c.resolution,
                "ack_a": c.ack_a,
                "ack_b": c.ack_b,
            })
