import datetime
import uuid
from typing import List, Optional
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc

from backend.config import (
    CORS_ORIGINS,
    CONFLICT_DISTANCE_THRESHOLD_METERS,
    ASSUMED_COST_PER_REDIG,
    DATABASE_URL,
)
from backend.database import engine, Base, get_db
from backend.models import Project, Conflict, Acknowledgment, AuditLog
from backend.schemas import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectDetailResponse,
    ConflictResponse,
    AcknowledgmentCreate,
    AcknowledgmentResponse,
    ApproveRequest,
    OverrideRequest,
    StatusChangeRequest,
    AuditLogResponse,
    DashboardStatsResponse,
    DashboardKPIs,
    RoadFlagCount,
    DepartmentDistribution,
)
from backend.conflict_engine import (
    calculate_project_distance,
    check_date_overlap,
    calculate_severity,
    generate_sequencing_recommendation,
)
from backend.seed_data import seed_database

# Create DB tables
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure demo data is seeded if database is fresh
    db = next(get_db())
    try:
        seed_database(db, force=False)
    finally:
        db.close()
    yield

app = FastAPI(
    title="CivicSync API",
    description="Deterministic Smart City Infrastructure Coordination Platform API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper: log audit event
def log_audit_event(
    db: Session,
    action_type: str,
    actor: str,
    department: str,
    note: str,
    project_id: Optional[str] = None,
    conflict_id: Optional[str] = None,
    previous_state: Optional[str] = None,
    new_state: Optional[str] = None,
):
    event_id = f"AUD-{uuid.uuid4().hex[:8].upper()}"
    log = AuditLog(
        id=event_id,
        action_type=action_type,
        project_id=project_id,
        conflict_id=conflict_id,
        actor=actor,
        department=department,
        note=note,
        previous_state=previous_state,
        new_state=new_state,
        created_at=datetime.datetime.utcnow(),
    )
    db.add(log)
    db.commit()
    return log

# Internal helper: run conflict check for a project
def run_conflict_check_internal(db: Session, project: Project, actor: str = "System"):
    # Projects to compare: Planned, Approved, Ongoing (exclude Completed)
    existing_projects = (
        db.query(Project)
        .filter(
            Project.id != project.id,
            Project.status.in_(["Planned", "Approved", "Ongoing"]),
        )
        .all()
    )

    threshold = CONFLICT_DISTANCE_THRESHOLD_METERS
    conflicts_detected = []
    
    # Existing active conflicts involving this project
    existing_conflicts = (
        db.query(Conflict)
        .filter(or_(Conflict.project_a_id == project.id, Conflict.project_b_id == project.id))
        .all()
    )
    existing_map = {
        (min(c.project_a_id, c.project_b_id), max(c.project_a_id, c.project_b_id)): c
        for c in existing_conflicts
    }

    for other in existing_projects:
        # 1. Proximity check
        dist = calculate_project_distance(project, other)
        if dist > threshold:
            continue

        # 2. Schedule overlap check (inclusive)
        has_overlap, o_start, o_end, o_days = check_date_overlap(
            project.start_date, project.end_date, other.start_date, other.end_date
        )
        if not has_overlap or o_days <= 0:
            continue

        # Both criteria met -> Conflict!
        sev = calculate_severity(dist, threshold, o_days, project.road_type, other.road_type)
        seq = generate_sequencing_recommendation(project, other, o_start, o_end, o_days)

        pair_key = (min(project.id, other.id), max(project.id, other.id))
        reason = (
            f"Spatial proximity {dist}m <= {threshold}m threshold on '{project.road_name}' "
            f"with {o_days} days inclusive schedule overlap."
        )

        if pair_key in existing_map:
            conf = existing_map[pair_key]
            conf.calculated_distance = dist
            conf.threshold = threshold
            conf.overlap_start = o_start
            conf.overlap_end = o_end
            conf.overlapping_days = o_days
            conf.proximity_score = sev["proximity_score"]
            conf.overlap_score = sev["overlap_score"]
            conf.road_importance_score = sev["road_importance_score"]
            conf.severity_score = sev["severity_score"]
            conf.severity_level = sev["severity_level"]
            conf.conflict_reason = reason
            conf.suggested_sequence = seq["suggested_sequence"]
            conf.suggested_dates = seq["suggested_dates"]
            conf.report_version += 1
            conf.status = "Awaiting Acknowledgment"
            conf.updated_at = datetime.datetime.utcnow()
            conflicts_detected.append(conf)
        else:
            conf_id = f"CONF-{uuid.uuid4().hex[:6].upper()}"
            new_conf = Conflict(
                id=conf_id,
                project_a_id=project.id,
                project_b_id=other.id,
                calculated_distance=dist,
                threshold=threshold,
                overlap_start=o_start,
                overlap_end=o_end,
                overlapping_days=o_days,
                proximity_score=sev["proximity_score"],
                overlap_score=sev["overlap_score"],
                road_importance_score=sev["road_importance_score"],
                severity_score=sev["severity_score"],
                severity_level=sev["severity_level"],
                conflict_reason=reason,
                suggested_sequence=seq["suggested_sequence"],
                suggested_dates=seq["suggested_dates"],
                status="Awaiting Acknowledgment",
                report_version=1,
                created_at=datetime.datetime.utcnow(),
            )
            db.add(new_conf)
            conflicts_detected.append(new_conf)

    project.conflict_check_performed = True
    project.conflict_check_version += 1
    project.conflict_check_at = datetime.datetime.utcnow()
    db.commit()

    action = "REPORT_REFRESHED" if project.conflict_check_version > 1 else "CONFLICT_DETECTED"
    if conflicts_detected:
        note = f"Conflict analysis executed: {len(conflicts_detected)} active conflict(s) detected for {project.id} ({project.name})."
    else:
        note = f"Conflict analysis executed: Zero spatial or schedule conflicts detected for {project.id} ({project.name})."

    log_audit_event(
        db=db,
        action_type=action,
        actor=actor,
        department=project.department,
        note=note,
        project_id=project.id,
    )

    return conflicts_detected


# --- API Routes ---

@app.get("/api/health")
def health_check():
    is_postgres = "postgresql" in DATABASE_URL
    return {
        "status": "healthy",
        "service": "CivicSync Core API",
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "database_mode": "PostgreSQL (Production)" if is_postgres else "SQLite (Local Demo Mode)",
        "conflict_threshold_meters": CONFLICT_DISTANCE_THRESHOLD_METERS,
        "assumed_cost_per_redig": ASSUMED_COST_PER_REDIG,
    }

@app.get("/api/projects", response_model=List[ProjectResponse])
def get_projects(
    department: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    project_type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Project)
    if department:
        query = query.filter(Project.department == department)
    if status_filter:
        query = query.filter(Project.status == status_filter)
    if project_type:
        query = query.filter(Project.project_type == project_type)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                Project.name.ilike(pattern),
                Project.id.ilike(pattern),
                Project.road_name.ilike(pattern),
                Project.department.ilike(pattern),
            )
        )

    projects = query.order_by(desc(Project.created_at)).all()
    results = []

    for p in projects:
        active_confs = (
            db.query(Conflict)
            .filter(
                or_(Conflict.project_a_id == p.id, Conflict.project_b_id == p.id),
                Conflict.status != "Closed",
            )
            .count()
        )
        resp = ProjectResponse.model_validate(p)
        resp.active_conflicts_count = active_confs
        resp.has_conflicts = active_confs > 0
        results.append(resp)

    return results

@app.post("/api/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    proj_id = f"PRJ-{datetime.datetime.utcnow().year}-{uuid.uuid4().hex[:4].upper()}"
    new_project = Project(
        id=proj_id,
        name=data.name,
        department=data.department,
        project_type=data.project_type,
        description=data.description,
        road_name=data.road_name,
        road_type=data.road_type,
        latitude=data.latitude,
        longitude=data.longitude,
        end_latitude=data.end_latitude,
        end_longitude=data.end_longitude,
        radius_meters=data.radius_meters,
        start_date=data.start_date,
        end_date=data.end_date,
        status="Planned",
        conflict_check_performed=False,
        conflict_check_version=0,
        is_overridden=False,
        created_at=datetime.datetime.utcnow(),
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)

    log_audit_event(
        db=db,
        action_type="PROJECT_CREATED",
        actor=f"{data.department} Officer",
        department=data.department,
        note=f"Project '{new_project.name}' registered for {new_project.road_name} ({new_project.road_type}).",
        project_id=new_project.id,
    )

    detected = run_conflict_check_internal(db, new_project, actor=f"{data.department} Officer")

    resp = ProjectResponse.model_validate(new_project)
    resp.active_conflicts_count = len(detected)
    resp.has_conflicts = len(detected) > 0
    return resp

@app.get("/api/projects/{project_id}", response_model=ProjectDetailResponse)
def get_project_detail(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    confs = (
        db.query(Conflict)
        .filter(or_(Conflict.project_a_id == project.id, Conflict.project_b_id == project.id))
        .all()
    )

    conf_responses = []
    for c in confs:
        c_resp = ConflictResponse.model_validate(c)
        c_resp.project_a_name = c.project_a.name if c.project_a else ""
        c_resp.project_a_dept = c.project_a.department if c.project_a else ""
        c_resp.project_a_type = c.project_a.project_type if c.project_a else ""
        c_resp.project_b_name = c.project_b.name if c.project_b else ""
        c_resp.project_b_dept = c.project_b.department if c.project_b else ""
        c_resp.project_b_type = c.project_b.project_type if c.project_b else ""
        c_resp.road_name = c.project_a.road_name if c.project_a else ""
        conf_responses.append(c_resp)

    resp = ProjectDetailResponse.model_validate(project)
    resp.active_conflicts_count = len([c for c in confs if c.status != "Closed"])
    resp.has_conflicts = resp.active_conflicts_count > 0
    resp.conflicts = conf_responses
    return resp

@app.patch("/api/projects/{project_id}", response_model=ProjectResponse)
def update_project(project_id: str, data: ProjectUpdate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    prev_state = f"Status: {project.status}, Dates: {project.start_date} to {project.end_date}"

    if data.name is not None:
        project.name = data.name
    if data.description is not None:
        project.description = data.description
    if data.road_type is not None:
        project.road_type = data.road_type
    if data.start_date is not None:
        project.start_date = data.start_date
    if data.end_date is not None:
        if project.start_date and data.end_date < project.start_date:
            raise HTTPException(status_code=400, detail="End date cannot precede start date")
        project.end_date = data.end_date

    project.updated_at = datetime.datetime.utcnow()
    db.commit()

    if data.start_date is not None or data.end_date is not None:
        run_conflict_check_internal(db, project, actor="System (Schedule Update)")

    new_state = f"Status: {project.status}, Dates: {project.start_date} to {project.end_date}"
    log_audit_event(
        db=db,
        action_type="PROJECT_UPDATED",
        actor=f"{project.department} Officer",
        department=project.department,
        note=f"Project {project.id} updated.",
        project_id=project.id,
        previous_state=prev_state,
        new_state=new_state,
    )

    return project

@app.post("/api/projects/{project_id}/conflict-check", response_model=List[ConflictResponse])
def trigger_conflict_check(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    confs = run_conflict_check_internal(db, project, actor=f"{project.department} User")

    results = []
    for c in confs:
        c_resp = ConflictResponse.model_validate(c)
        c_resp.project_a_name = c.project_a.name if c.project_a else ""
        c_resp.project_a_dept = c.project_a.department if c.project_a else ""
        c_resp.project_a_type = c.project_a.project_type if c.project_a else ""
        c_resp.project_b_name = c.project_b.name if c.project_b else ""
        c_resp.project_b_dept = c.project_b.department if c.project_b else ""
        c_resp.project_b_type = c.project_b.project_type if c.project_b else ""
        c_resp.road_name = c.project_a.road_name if c.project_a else ""
        results.append(c_resp)

    return results

@app.get("/api/conflicts", response_model=List[ConflictResponse])
def get_conflicts(
    severity: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    department: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Conflict)
    if severity:
        query = query.filter(Conflict.severity_level == severity)
    if status_filter:
        query = query.filter(Conflict.status == status_filter)

    conflicts = query.order_by(desc(Conflict.severity_score)).all()
    results = []

    for c in conflicts:
        if department:
            depts = [c.project_a.department, c.project_b.department]
            if department not in depts:
                continue

        c_resp = ConflictResponse.model_validate(c)
        c_resp.project_a_name = c.project_a.name if c.project_a else ""
        c_resp.project_a_dept = c.project_a.department if c.project_a else ""
        c_resp.project_a_type = c.project_a.project_type if c.project_a else ""
        c_resp.project_b_name = c.project_b.name if c.project_b else ""
        c_resp.project_b_dept = c.project_b.department if c.project_b else ""
        c_resp.project_b_type = c.project_b.project_type if c.project_b else ""
        c_resp.road_name = c.project_a.road_name if c.project_a else ""
        results.append(c_resp)

    return results

@app.get("/api/conflicts/{conflict_id}", response_model=ConflictResponse)
def get_conflict_detail(conflict_id: str, db: Session = Depends(get_db)):
    conflict = db.query(Conflict).filter(Conflict.id == conflict_id).first()
    if not conflict:
        raise HTTPException(status_code=404, detail="Conflict not found")

    c_resp = ConflictResponse.model_validate(conflict)
    c_resp.project_a_name = conflict.project_a.name if conflict.project_a else ""
    c_resp.project_a_dept = conflict.project_a.department if conflict.project_a else ""
    c_resp.project_a_type = conflict.project_a.project_type if conflict.project_a else ""
    c_resp.project_b_name = conflict.project_b.name if conflict.project_b else ""
    c_resp.project_b_dept = conflict.project_b.department if conflict.project_b else ""
    c_resp.project_b_type = conflict.project_b.project_type if conflict.project_b else ""
    c_resp.road_name = conflict.project_a.road_name if conflict.project_a else ""
    return c_resp

@app.post("/api/conflicts/{conflict_id}/acknowledge", response_model=AcknowledgmentResponse)
def acknowledge_conflict(
    conflict_id: str, data: AcknowledgmentCreate, db: Session = Depends(get_db)
):
    conflict = db.query(Conflict).filter(Conflict.id == conflict_id).first()
    if not conflict:
        raise HTTPException(status_code=404, detail="Conflict not found")

    involved_depts = [conflict.project_a.department, conflict.project_b.department]
    if data.department not in involved_depts:
        raise HTTPException(
            status_code=400,
            detail=f"Department '{data.department}' is not involved in this conflict. Involved: {', '.join(involved_depts)}.",
        )

    existing_ack = (
        db.query(Acknowledgment)
        .filter(
            Acknowledgment.conflict_id == conflict.id,
            Acknowledgment.department == data.department,
            Acknowledgment.report_version == conflict.report_version,
        )
        .first()
    )
    if existing_ack:
        return existing_ack

    ack_id = f"ACK-{uuid.uuid4().hex[:6].upper()}"
    new_ack = Acknowledgment(
        id=ack_id,
        conflict_id=conflict.id,
        department=data.department,
        acknowledged_by=data.acknowledged_by,
        report_version=conflict.report_version,
        note=data.note,
        created_at=datetime.datetime.utcnow(),
    )
    db.add(new_ack)
    db.commit()
    db.refresh(new_ack)

    all_acks = (
        db.query(Acknowledgment)
        .filter(
            Acknowledgment.conflict_id == conflict.id,
            Acknowledgment.report_version == conflict.report_version,
        )
        .all()
    )
    acked_depts = {a.department for a in all_acks}
    if involved_depts[0] in acked_depts and involved_depts[1] in acked_depts:
        conflict.status = "Ready for Review"
        db.commit()

    log_audit_event(
        db=db,
        action_type="DEPARTMENT_ACKNOWLEDGED",
        actor=data.acknowledged_by,
        department=data.department,
        note=f"{data.department} acknowledged conflict {conflict.id} (report v{conflict.report_version}). Note: {data.note or 'No notes provided.'}",
        project_id=conflict.project_a_id,
        conflict_id=conflict.id,
    )

    return new_ack

@app.post("/api/projects/{project_id}/approve", response_model=ProjectResponse)
def approve_project(project_id: str, data: ApproveRequest, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.conflict_check_performed:
        log_audit_event(
            db=db,
            action_type="APPROVAL_BLOCKED",
            actor=data.approved_by,
            department=project.department,
            note=f"Approval blocked: Conflict check has never been executed for project {project.id}.",
            project_id=project.id,
        )
        raise HTTPException(
            status_code=400,
            detail="Project cannot be approved: A conflict report check must be performed first.",
        )

    active_conflicts = (
        db.query(Conflict)
        .filter(
            or_(Conflict.project_a_id == project.id, Conflict.project_b_id == project.id),
            Conflict.status.in_(["Awaiting Acknowledgment", "Ready for Review"]),
        )
        .all()
    )

    unacknowledged = []
    for c in active_conflicts:
        dept_a = c.project_a.department
        dept_b = c.project_b.department
        current_acks = {
            a.department
            for a in c.acknowledgments
            if a.report_version == c.report_version
        }
        if dept_a not in current_acks or dept_b not in current_acks:
            missing = [d for d in [dept_a, dept_b] if d not in current_acks]
            unacknowledged.append(f"Conflict {c.id} missing acknowledgment from: {', '.join(missing)}")

    if unacknowledged:
        log_audit_event(
            db=db,
            action_type="APPROVAL_BLOCKED",
            actor=data.approved_by,
            department=project.department,
            note=f"Approval blocked for {project.id}: Pending departmental acknowledgments. {'; '.join(unacknowledged)}",
            project_id=project.id,
        )
        raise HTTPException(
            status_code=400,
            detail=f"Approval blocked: All involved departments must acknowledge conflict reports before approval. Issues: {'; '.join(unacknowledged)}. Use Admin Override if exceptional clearance is justified.",
        )

    project.status = "Approved"
    project.updated_at = datetime.datetime.utcnow()

    for c in active_conflicts:
        c.status = "Resolved"

    db.commit()

    log_audit_event(
        db=db,
        action_type="APPROVAL_GRANTED",
        actor=data.approved_by,
        department=project.department,
        note=f"Project {project.id} ({project.name}) granted standard approval. All conflict criteria satisfied.",
        project_id=project.id,
    )

    return project

@app.post("/api/projects/{project_id}/override", response_model=ProjectResponse)
def override_project(
    project_id: str, data: OverrideRequest, db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not data.override_reason or len(data.override_reason.strip()) < 5:
        log_audit_event(
            db=db,
            action_type="APPROVAL_BLOCKED",
            actor=data.override_by,
            department="Administration",
            note=f"Admin override rejected for {project.id}: Mandatory justification was empty or too brief.",
            project_id=project.id,
        )
        raise HTTPException(
            status_code=400,
            detail="Admin override rejected: A non-empty, detailed justification reason is mandatory for executive override.",
        )

    prev_status = project.status
    project.status = "Approved"
    project.is_overridden = True
    project.override_reason = data.override_reason.strip()
    project.override_by = data.override_by
    project.override_at = datetime.datetime.utcnow()
    project.updated_at = datetime.datetime.utcnow()

    associated_conflicts = (
        db.query(Conflict)
        .filter(or_(Conflict.project_a_id == project.id, Conflict.project_b_id == project.id))
        .all()
    )
    for c in associated_conflicts:
        c.status = "Overridden"

    db.commit()

    log_audit_event(
        db=db,
        action_type="ADMIN_OVERRIDE",
        actor=data.override_by,
        department="Administration",
        note=f"Executive override applied to {project.id}. Prior status: {prev_status} -> Approved. Reason: '{data.override_reason}'",
        project_id=project.id,
    )

    return project

@app.post("/api/projects/{project_id}/status", response_model=ProjectResponse)
def change_project_status(
    project_id: str, data: StatusChangeRequest, db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    valid_statuses = ["Planned", "Approved", "Ongoing", "Completed"]
    if data.new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status '{data.new_status}'.")

    if data.new_status == "Approved" and project.status == "Planned":
        raise HTTPException(
            status_code=400,
            detail="Cannot move to Approved directly via status endpoint. Use the /approve or /override endpoint to satisfy the approval gate.",
        )

    prev_status = project.status
    project.status = data.new_status
    project.updated_at = datetime.datetime.utcnow()
    db.commit()

    log_audit_event(
        db=db,
        action_type="STATUS_CHANGED",
        actor=data.changed_by,
        department=project.department,
        note=f"Status transitioned from {prev_status} to {data.new_status}. {data.note or ''}",
        project_id=project.id,
        previous_state=prev_status,
        new_state=data.new_status,
    )

    return project

@app.get("/api/dashboard", response_model=DashboardStatsResponse)
def get_dashboard_stats(db: Session = Depends(get_db)):
    total = db.query(Project).count()
    planned = db.query(Project).filter(Project.status == "Planned").count()
    approved = db.query(Project).filter(Project.status == "Approved").count()
    ongoing = db.query(Project).filter(Project.status == "Ongoing").count()
    completed = db.query(Project).filter(Project.status == "Completed").count()

    active_conflicts = (
        db.query(Conflict)
        .filter(Conflict.status.in_(["Awaiting Acknowledgment", "Ready for Review"]))
        .count()
    )
    awaiting_ack = (
        db.query(Conflict)
        .filter(Conflict.status == "Awaiting Acknowledgment")
        .count()
    )

    prevented_events = (
        db.query(Conflict)
        .filter(Conflict.status.in_(["Resolved", "Awaiting Acknowledgment", "Ready for Review"]))
        .count()
    )
    avoided_cost = prevented_events * ASSUMED_COST_PER_REDIG

    road_query = (
        db.query(Project.road_name)
        .join(Conflict, or_(Conflict.project_a_id == Project.id, Conflict.project_b_id == Project.id))
        .all()
    )
    road_counts: dict = {}
    for r in road_query:
        road = r[0]
        road_counts[road] = road_counts.get(road, 0) + 1

    top_roads = [
        RoadFlagCount(road_name=k, flagged_conflicts=v)
        for k, v in sorted(road_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    ]

    all_projects = db.query(Project).all()
    dept_map: dict = {}
    for p in all_projects:
        dept_map[p.department] = dept_map.get(p.department, 0) + 1

    dept_dist = [
        DepartmentDistribution(department=k, count=v)
        for k, v in sorted(dept_map.items(), key=lambda x: x[1], reverse=True)
    ]

    sev_counts = {"High": 0, "Medium": 0, "Low": 0}
    for c in db.query(Conflict).all():
        sev_counts[c.severity_level] = sev_counts.get(c.severity_level, 0) + 1

    return DashboardStatsResponse(
        kpis=DashboardKPIs(
            total_projects=total,
            planned=planned,
            approved=approved,
            ongoing=ongoing,
            completed=completed,
            active_conflicts=active_conflicts,
            awaiting_acknowledgment=awaiting_ack,
            illustrative_avoided_cost=avoided_cost,
            cost_assumption_note=(
                f"Illustrative metric based on {prevented_events} prevented re-dig events "
                f"* ${ASSUMED_COST_PER_REDIG:,.0f} assumed average municipal excavation & restoration cost."
            ),
        ),
        top_flagged_roads=top_roads,
        department_distribution=dept_dist,
        status_distribution={
            "Planned": planned,
            "Approved": approved,
            "Ongoing": ongoing,
            "Completed": completed,
        },
        severity_distribution=sev_counts,
    )

@app.get("/api/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    action_type: Optional[str] = None,
    department: Optional[str] = None,
    project_id: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(AuditLog)
    if action_type:
        query = query.filter(AuditLog.action_type == action_type)
    if department:
        query = query.filter(AuditLog.department == department)
    if project_id:
        query = query.filter(AuditLog.project_id == project_id)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                AuditLog.note.ilike(pattern),
                AuditLog.actor.ilike(pattern),
                AuditLog.id.ilike(pattern),
                AuditLog.project_id.ilike(pattern),
            )
        )

    logs = query.order_by(desc(AuditLog.created_at)).all()
    return logs

@app.post("/api/reset-demo")
def reset_demo_database(db: Session = Depends(get_db)):
    seed_database(db, force=True)
    return {"status": "success", "message": "Demo database successfully reset with official seed scenario."}
