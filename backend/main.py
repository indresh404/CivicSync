import datetime
import uuid
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Query, status, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc

from backend.config import (
    CORS_ORIGINS,
    CONFLICT_DISTANCE_THRESHOLD_METERS,
    ASSUMED_COST_PER_REDIG,
    COOLDOWN_MONTHS,
    MONSOON_START,
    MONSOON_END,
    PORT,
)
from backend.database import engine, Base, get_db
from backend.models import Department, User, Project, Conflict, Acknowledgment, AuditLog, Config
from backend.schemas import (
    LoginRequest,
    TokenResponse,
    UserResponse,
    PreviewConflictRequest,
    PreviewConflictResponse,
    PotentialConflictItem,
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectDetailResponse,
    ConflictResponse,
    AcknowledgmentCreate,
    AcknowledgmentResponse,
    ApproveRequest,
    OverrideRequest,
    ProposeJointRequest,
    StatusChangeRequest,
    AuditLogResponse,
    RoadHistoryResponse,
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
    check_cooldown_warning,
    check_monsoon_warning,
    UNDERGROUND_TYPES,
)
from backend.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    get_current_user_optional,
    require_admin,
    PRESET_USERS,
    DEPARTMENTS,
)
from backend.mongo_db import mongo_manager
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
    title="DigSync API",
    description="Deterministic GovTech Infrastructure & Road-Work Coordination Platform",
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
    user_id: Optional[str] = None,
    previous_state: Optional[str] = None,
    new_state: Optional[str] = None,
):
    event_id = f"AUD-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.datetime.utcnow()
    log = AuditLog(
        id=event_id,
        action_type=action_type,
        project_id=project_id,
        conflict_id=conflict_id,
        user_id=user_id,
        actor=actor,
        department=department,
        note=note,
        previous_state=previous_state,
        new_state=new_state,
        timestamp=now,
        created_at=now,
    )
    db.add(log)
    db.commit()

    if mongo_manager.is_connected:
        mongo_manager.save_audit({
            "id": event_id,
            "action_type": action_type,
            "project_id": project_id,
            "conflict_id": conflict_id,
            "user_id": user_id,
            "actor": actor,
            "department": department,
            "note": note,
            "timestamp": now.isoformat(),
        })

    return log

# Helper: hydrate conflict with project names
def hydrate_conflict_data(conf: Conflict, db: Session) -> ConflictResponse:
    p_a = db.query(Project).filter(Project.id == conf.project_a_id).first()
    p_b = db.query(Project).filter(Project.id == conf.project_b_id).first()

    return ConflictResponse(
        id=conf.id,
        project_a_id=conf.project_a_id,
        project_b_id=conf.project_b_id,
        calculated_distance=conf.calculated_distance,
        threshold=conf.threshold,
        overlap_start=conf.overlap_start,
        overlap_end=conf.overlap_end,
        overlapping_days=conf.overlapping_days,
        severity_score=conf.severity_score,
        severity_breakdown=conf.severity_breakdown,
        suggested_sequence=conf.suggested_sequence,
        suggested_dates=conf.suggested_dates,
        resolution=conf.resolution or "Pending",
        status=conf.status,
        ack_a=conf.ack_a or False,
        ack_b=conf.ack_b or False,
        ack_a_by=conf.ack_a_by,
        ack_b_by=conf.ack_b_by,
        proximity_score=conf.proximity_score or 0.0,
        overlap_score=conf.overlap_score or 0.0,
        road_importance_score=conf.road_importance_score or 0.0,
        severity_level=conf.severity_level or "Medium",
        conflict_reason=conf.conflict_reason or "",
        report_version=conf.report_version or 1,
        created_at=conf.created_at,
        updated_at=conf.updated_at,
        project_a_name=p_a.title if p_a else "Unknown",
        project_a_dept=p_a.department if p_a else "Unknown",
        project_a_type=p_a.project_type if p_a else "Unknown",
        project_b_name=p_b.title if p_b else "Unknown",
        project_b_dept=p_b.department if p_b else "Unknown",
        project_b_type=p_b.project_type if p_b else "Unknown",
        road_name=p_a.road_name if p_a else (p_b.road_name if p_b else ""),
        acknowledgments=conf.acknowledgments,
    )

# Internal conflict detector
def run_conflict_detection(db: Session, project: Project, actor: str = "System"):
    existing_candidates = (
        db.query(Project)
        .filter(
            Project.id != project.id,
            Project.status.in_(["Planned", "Approved", "Ongoing"]),
        )
        .all()
    )

    threshold = CONFLICT_DISTANCE_THRESHOLD_METERS
    conflicts_detected = []

    # Map existing conflicts
    existing_conflicts = (
        db.query(Conflict)
        .filter(or_(Conflict.project_a_id == project.id, Conflict.project_b_id == project.id))
        .all()
    )
    existing_map = {
        (min(c.project_a_id, c.project_b_id), max(c.project_a_id, c.project_b_id)): c
        for c in existing_conflicts
    }

    for other in existing_candidates:
        dist = calculate_project_distance(project, other)
        if dist > threshold:
            continue

        has_overlap, o_start, o_end, o_days = check_date_overlap(
            project.start_date, project.end_date, other.start_date, other.end_date
        )
        if not has_overlap or o_days <= 0:
            continue

        sev = calculate_severity(dist, threshold, o_days, project.road_type, other.road_type)
        seq = generate_sequencing_recommendation(project, other, o_start, o_end, o_days)

        pair_key = (min(project.id, other.id), max(project.id, other.id))
        reason = (
            f"Distance {dist}m < {threshold}m threshold on '{project.road_name}' "
            f"with {o_days} days date overlap."
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
            conf.severity_breakdown = sev["severity_breakdown"]
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
                severity_breakdown=sev["severity_breakdown"],
                conflict_reason=reason,
                suggested_sequence=seq["suggested_sequence"],
                suggested_dates=seq["suggested_dates"],
                resolution="Pending",
                status="Awaiting Acknowledgment",
                ack_a=False,
                ack_b=False,
                report_version=1,
                created_at=datetime.datetime.utcnow(),
            )
            db.add(new_conf)
            conflicts_detected.append(new_conf)

    project.conflict_check_performed = True
    project.conflict_check_version += 1
    project.conflict_check_at = datetime.datetime.utcnow()
    project.has_conflict = len(conflicts_detected) > 0
    db.commit()

    action = "REPORT_REFRESHED" if project.conflict_check_version > 1 else "CONFLICT_DETECTED"
    log_audit_event(
        db=db,
        action_type=action,
        actor=actor,
        department=project.department,
        note=f"Conflict detection: {len(conflicts_detected)} conflict(s) for {project.id} ({project.title}).",
        project_id=project.id,
    )

    return conflicts_detected

# ==============================================================================
# REST API ENDPOINTS
# ==============================================================================

@app.get("/health")
@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "DigSync Municipal Coordination Platform",
        "version": "1.0.0",
        "mongo_connected": mongo_manager.is_connected,
        "cooldown_months": COOLDOWN_MONTHS,
        "conflict_threshold_meters": CONFLICT_DISTANCE_THRESHOLD_METERS,
    }

# --- AUTHENTICATION ---

@app.post("/auth/login", response_model=TokenResponse)
@app.post("/api/auth/login", response_model=TokenResponse)
def login(creds: LoginRequest, db: Session = Depends(get_db)):
    # 1. Check database or preset demo users
    user = db.query(User).filter(User.email == creds.email).first()
    if not user:
        # Check preset users
        preset = next((u for u in PRESET_USERS if u["email"] == creds.email), None)
        if not preset or not verify_password(creds.password, preset["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid municipal credentials.",
            )
        user_dict = {
            "id": preset["id"],
            "email": preset["email"],
            "name": preset["name"],
            "department_id": preset["department_id"],
            "role": preset["role"],
        }
    else:
        if not verify_password(creds.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid municipal credentials.",
            )
        user_dict = {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "department_id": user.department_id,
            "role": user.role,
        }

    token = create_access_token(
        {
            "sub": user_dict["id"],
            "email": user_dict["email"],
            "name": user_dict["name"],
            "department_id": user_dict["department_id"],
            "role": user_dict["role"],
        }
    )

    log_audit_event(
        db=db,
        action_type="USER_LOGIN",
        actor=user_dict["name"],
        department=user_dict.get("department_id", "Municipal"),
        note=f"User {user_dict['email']} logged in successfully.",
        user_id=user_dict["id"],
    )

    return TokenResponse(access_token=token, token_type="bearer", user=user_dict)

@app.get("/me", response_model=UserResponse)
@app.get("/api/me", response_model=UserResponse)
def get_me(user: Dict[str, Any] = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        department_id=user.get("department_id"),
        department_name=user.get("department_name", "Municipal"),
        role=user["role"],
    )

# --- LIVE PREVIEW CONFLICTS (Stateless check while drawing) ---

@app.post("/projects/preview-conflicts", response_model=PreviewConflictResponse)
@app.post("/api/projects/preview-conflicts", response_model=PreviewConflictResponse)
def preview_conflicts(data: PreviewConflictRequest, db: Session = Depends(get_db)):
    """
    Business Rule 1 & Live Preview:
    Stateless spatial and temporal conflict preview used in real-time as users draw geometries.
    Also checks Cooldown (Rule 4) and Monsoon window (Rule 5).
    """
    # 1. Existing projects in Planned/Approved/Ongoing
    candidates = (
        db.query(Project)
        .filter(Project.status.in_(["Planned", "Approved", "Ongoing"]))
        .all()
    )

    threshold = CONFLICT_DISTANCE_THRESHOLD_METERS
    conflicts_found: List[PotentialConflictItem] = []

    # Create dummy project for math functions
    class TempProject:
        lat = data.lat
        lng = data.lng
        latitude = data.lat
        longitude = data.lng
        end_lat = data.end_lat
        end_lng = data.end_lng
        end_latitude = data.end_lat
        end_longitude = data.end_lng
        start_date = data.start_date
        end_date = data.end_date
        road_type = data.road_type
        road_name = data.road_name
        project_type = data.project_type
        department = data.department or "Draft Department"
        title = "Draft Project"

    temp_p = TempProject()

    for cand in candidates:
        dist = calculate_project_distance(temp_p, cand)
        if dist > threshold:
            continue

        has_overlap, o_start, o_end, o_days = check_date_overlap(
            data.start_date, data.end_date, cand.start_date, cand.end_date
        )
        if not has_overlap or o_days <= 0:
            continue

        sev = calculate_severity(dist, threshold, o_days, data.road_type, cand.road_type)
        seq = generate_sequencing_recommendation(temp_p, cand, o_start, o_end, o_days)

        conflicts_found.append(
            PotentialConflictItem(
                existing_project_id=cand.id,
                existing_project_title=cand.title,
                existing_department=cand.department,
                existing_project_type=cand.project_type,
                distance_meters=round(dist, 1),
                overlapping_days=o_days,
                severity_score=sev["severity_score"],
                severity_level=sev["severity_level"],
                suggested_sequence=seq["suggested_sequence"],
                severity_breakdown=sev["severity_breakdown"],
            )
        )

    # 2. Check Cooldown Rule (Rule 4)
    cooldown_warning = None
    if data.project_type in UNDERGROUND_TYPES:
        recent_resurfacing = (
            db.query(Project)
            .filter(
                Project.road_name.ilike(f"%{data.road_name.strip()}%"),
                Project.project_type == "Resurfacing",
                Project.status == "Completed",
            )
            .order_by(desc(Project.end_date))
            .first()
        )
        if recent_resurfacing:
            cooldown_warning = check_cooldown_warning(
                data.road_name,
                data.project_type,
                recent_resurfacing.end_date,
                reference_date=data.start_date,
                cooldown_months=COOLDOWN_MONTHS,
            )

    # 3. Check Monsoon Window (Rule 5)
    monsoon_warning = check_monsoon_warning(
        data.start_date, data.end_date, MONSOON_START, MONSOON_END
    )

    return PreviewConflictResponse(
        has_conflicts=len(conflicts_found) > 0,
        conflict_count=len(conflicts_found),
        conflicts=conflicts_found,
        cooldown_warning=cooldown_warning,
        monsoon_warning=monsoon_warning,
    )

# --- PROJECTS CRUD & LIFECYCLE ---

@app.get("/projects", response_model=List[ProjectResponse])
@app.get("/api/projects", response_model=List[ProjectResponse])
def get_projects(
    department: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    date_from: Optional[datetime.date] = Query(None),
    date_to: Optional[datetime.date] = Query(None),
    road_name: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Project)

    if department and department != "ALL":
        query = query.filter(
            or_(Project.department == department, Project.department_id == department)
        )
    if status and status != "ALL":
        query = query.filter(Project.status == status)
    if date_from:
        query = query.filter(Project.end_date >= date_from)
    if date_to:
        query = query.filter(Project.start_date <= date_to)
    if road_name:
        query = query.filter(Project.road_name.ilike(f"%{road_name}%"))

    projects = query.order_by(desc(Project.created_at)).all()

    # Hydrate active conflict count
    result = []
    for p in projects:
        c_count = (
            db.query(Conflict)
            .filter(
                or_(Conflict.project_a_id == p.id, Conflict.project_b_id == p.id),
                Conflict.resolution != "Overridden",
            )
            .count()
        )
        p.active_conflicts_count = c_count
        result.append(p)

    return result

@app.post("/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
@app.post("/api/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    data: ProjectCreate,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    # Cooldown check justification verification
    if data.project_type in UNDERGROUND_TYPES:
        recent_resurf = (
            db.query(Project)
            .filter(
                Project.road_name.ilike(f"%{data.road_name.strip()}%"),
                Project.project_type == "Resurfacing",
                Project.status == "Completed",
            )
            .order_by(desc(Project.end_date))
            .first()
        )
        if recent_resurf:
            c_warn = check_cooldown_warning(
                data.road_name, data.project_type, recent_resurf.end_date, data.start_date, COOLDOWN_MONTHS
            )
            if c_warn and not data.cooldown_justification:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cooldown Policy Violation: Road was resurfaced {c_warn['months_ago']} months ago. Underground excavation requires a mandatory justification note.",
                )

    new_id = f"PRJ-{uuid.uuid4().hex[:6].upper()}"
    p_title = data.title or data.name or f"{data.project_type} on {data.road_name}"
    dept = data.department or "Roads Department"
    dept_id = data.department_id or "DEPT-ROADS"
    user_actor = current_user["name"] if current_user else "Civic Engineer"

    lat_val = data.lat if data.lat is not None else (data.latitude or 19.2812)
    lng_val = data.lng if data.lng is not None else (data.longitude or 72.8561)
    end_lat_val = data.end_lat if data.end_lat is not None else data.end_latitude
    end_lng_val = data.end_lng if data.end_lng is not None else data.end_longitude
    rad_val = data.radius_m if data.radius_m is not None else (data.radius_meters or 25.0)

    project = Project(
        id=new_id,
        title=p_title,
        name=p_title,
        department_id=dept_id,
        department=dept,
        created_by=user_actor,
        project_type=data.project_type,
        geometry_type=data.geometry_type or "point",
        lat=lat_val,
        lng=lng_val,
        latitude=lat_val,
        longitude=lng_val,
        end_lat=end_lat_val,
        end_lng=end_lng_val,
        end_latitude=end_lat_val,
        end_longitude=end_lng_val,
        radius_m=rad_val,
        radius_meters=rad_val,
        road_name=data.road_name,
        road_type=data.road_type,
        description=data.description,
        start_date=data.start_date,
        end_date=data.end_date,
        status="Planned",
        has_conflict=False,
        conflict_check_performed=False,
        cooldown_justification=data.cooldown_justification,
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    log_audit_event(
        db=db,
        action_type="PROJECT_CREATED",
        actor=user_actor,
        department=dept,
        note=f"Project '{project.title}' registered on {project.road_name} ({project.start_date} to {project.end_date}).",
        project_id=project.id,
    )

    if mongo_manager.is_connected:
        mongo_manager.save_project({
            "id": project.id,
            "title": project.title,
            "department": project.department,
            "project_type": project.project_type,
            "road_name": project.road_name,
            "status": project.status,
            "lat": project.lat,
            "lng": project.lng,
        })

    return project

@app.get("/projects/{project_id}", response_model=ProjectDetailResponse)
@app.get("/api/projects/{project_id}", response_model=ProjectDetailResponse)
def get_project_detail(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    conflicts = (
        db.query(Conflict)
        .filter(or_(Conflict.project_a_id == project.id, Conflict.project_b_id == project.id))
        .all()
    )

    hydrated = [hydrate_conflict_data(c, db) for c in conflicts]
    project.active_conflicts_count = len([c for c in hydrated if c.resolution != "Overridden"])

    resp = ProjectDetailResponse.model_validate(project)
    resp.conflicts = hydrated
    return resp

@app.post("/projects/{project_id}/submit", response_model=List[ConflictResponse])
@app.post("/api/projects/{project_id}/submit", response_model=List[ConflictResponse])
@app.post("/api/projects/{project_id}/conflict-check", response_model=List[ConflictResponse])
def submit_and_check_conflicts(
    project_id: str,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """
    Submits project, runs deterministic collision engine against all active works,
    and produces Conflict records with explainable breakdown.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    actor = current_user["name"] if current_user else "Municipal Officer"
    conflicts = run_conflict_detection(db, project, actor=actor)
    return [hydrate_conflict_data(c, db) for c in conflicts]

# --- CONFLICT RESOLUTION, JOINT TRENCHING & ACKNOWLEDGMENTS ---

@app.get("/conflicts", response_model=List[ConflictResponse])
@app.get("/api/conflicts", response_model=List[ConflictResponse])
def get_conflicts(
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Conflict)
    if status and status != "ALL":
        q = q.filter(or_(Conflict.status == status, Conflict.resolution == status))
    if severity and severity != "ALL":
        q = q.filter(Conflict.severity_level == severity)

    conflicts = q.order_by(desc(Conflict.created_at)).all()
    return [hydrate_conflict_data(c, db) for c in conflicts]

@app.get("/conflicts/{conflict_id}", response_model=ConflictResponse)
@app.get("/api/conflicts/{conflict_id}", response_model=ConflictResponse)
def get_conflict(conflict_id: str, db: Session = Depends(get_db)):
    c = db.query(Conflict).filter(Conflict.id == conflict_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Conflict not found.")
    return hydrate_conflict_data(c, db)

@app.post("/conflicts/{conflict_id}/acknowledge", response_model=ConflictResponse)
@app.post("/api/conflicts/{conflict_id}/acknowledge", response_model=ConflictResponse)
def acknowledge_conflict(
    conflict_id: str,
    payload: Optional[AcknowledgmentCreate] = None,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """
    Records department acknowledgment (ack_a or ack_b).
    When both departments acknowledge, status transitions to 'Sequenced'.
    """
    conf = db.query(Conflict).filter(Conflict.id == conflict_id).first()
    if not conf:
        raise HTTPException(status_code=404, detail="Conflict not found.")

    p_a = db.query(Project).filter(Project.id == conf.project_a_id).first()
    p_b = db.query(Project).filter(Project.id == conf.project_b_id).first()

    actor_name = current_user["name"] if current_user else (payload.acknowledged_by if payload else "Municipal Engineer")
    actor_dept = current_user["department_name"] if current_user else (payload.department if payload else "Engineering")
    note = payload.note if payload else "Sequencing acknowledged and agreed."

    # Determine which department is acknowledging
    if p_a and (actor_dept == p_a.department or actor_dept == p_a.department_id or not conf.ack_a):
        conf.ack_a = True
        conf.ack_a_at = datetime.datetime.utcnow()
        conf.ack_a_by = actor_name
    elif p_b and (actor_dept == p_b.department or actor_dept == p_b.department_id or not conf.ack_b):
        conf.ack_b = True
        conf.ack_b_at = datetime.datetime.utcnow()
        conf.ack_b_by = actor_name
    else:
        conf.ack_b = True
        conf.ack_b_at = datetime.datetime.utcnow()
        conf.ack_b_by = actor_name

    # Create Acknowledgment record
    ack_obj = Acknowledgment(
        id=f"ACK-{uuid.uuid4().hex[:6].upper()}",
        conflict_id=conf.id,
        department=actor_dept,
        acknowledged_by=actor_name,
        report_version=conf.report_version,
        note=note,
    )
    db.add(ack_obj)

    # If both acknowledged -> Sequenced resolution
    if conf.ack_a and conf.ack_b:
        conf.resolution = "Sequenced"
        conf.status = "Resolved"

    db.commit()

    log_audit_event(
        db=db,
        action_type="DEPARTMENT_ACKNOWLEDGED",
        actor=actor_name,
        department=actor_dept,
        note=f"Acknowledgment recorded for conflict {conf.id} by {actor_name} ({actor_dept}). Ack status: A={conf.ack_a}, B={conf.ack_b}.",
        conflict_id=conf.id,
        project_id=conf.project_a_id,
    )

    return hydrate_conflict_data(conf, db)

@app.post("/conflicts/{conflict_id}/propose-joint", response_model=ConflictResponse)
@app.post("/api/conflicts/{conflict_id}/propose-joint", response_model=ConflictResponse)
def propose_joint_trenching(
    conflict_id: str,
    payload: Optional[ProposeJointRequest] = None,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """
    Business Rule 7: Joint Trenching.
    Proposes merging work scopes with shared dates and synchronized trench digging.
    """
    conf = db.query(Conflict).filter(Conflict.id == conflict_id).first()
    if not conf:
        raise HTTPException(status_code=404, detail="Conflict not found.")

    actor = current_user["name"] if current_user else "Inter-Agency Liaison"
    dept = current_user.get("department_name", "Coordination Cell") if current_user else "Joint Utility Board"

    conf.resolution = "JointTrench"
    conf.status = "Resolved"
    conf.ack_a = True
    conf.ack_b = True
    db.commit()

    log_audit_event(
        db=db,
        action_type="JOINT_TRENCH_AGREED",
        actor=actor,
        department=dept,
        note=f"Joint trenching protocol ratified for conflict {conf.id}. Utilities will share single trench excavation and common backfilling.",
        conflict_id=conf.id,
        project_id=conf.project_a_id,
    )

    return hydrate_conflict_data(conf, db)

@app.post("/conflicts/{conflict_id}/override", response_model=ConflictResponse)
@app.post("/api/conflicts/{conflict_id}/override", response_model=ConflictResponse)
def override_conflict(
    conflict_id: str,
    payload: OverrideRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """
    Business Rule 6 & 8: Administrative conflict override with mandatory justification note.
    """
    if not payload.reason or len(payload.reason.strip()) < 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A substantive administrative override justification is required.",
        )

    conf = db.query(Conflict).filter(Conflict.id == conflict_id).first()
    if not conf:
        raise HTTPException(status_code=404, detail="Conflict not found.")

    actor = payload.override_by or (current_user["name"] if current_user else "City Administrator")

    conf.resolution = "Overridden"
    conf.status = "Overridden"
    db.commit()

    log_audit_event(
        db=db,
        action_type="ADMIN_OVERRIDE",
        actor=actor,
        department="Municipal Administration",
        note=f"Administrative conflict override on {conf.id}. Reason: {payload.reason}",
        conflict_id=conf.id,
        project_id=conf.project_a_id,
    )

    return hydrate_conflict_data(conf, db)

# --- APPROVAL GATE (Business Rule 6) ---

@app.post("/projects/{project_id}/approve", response_model=ProjectResponse)
@app.post("/api/projects/{project_id}/approve", response_model=ProjectResponse)
def approve_project(
    project_id: str,
    payload: Optional[ApproveRequest] = None,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """
    Business Rule 6: Approval Gate.
    1. Planned -> Approved requires a generated conflict report (even with 0 conflicts).
    2. If conflicts exist, both departments must acknowledge (ack_a & ack_b) OR override granted.
    3. Blocks with precise explanation if conditions are not satisfied.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    # Gate 1: Conflict check performed?
    if not project.conflict_check_performed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Approval Gate Blocked: Conflict analysis report has not been generated for this project. Please run conflict detection first.",
        )

    # Gate 2: Any unresolved conflicts without override?
    conflicts = (
        db.query(Conflict)
        .filter(or_(Conflict.project_a_id == project.id, Conflict.project_b_id == project.id))
        .all()
    )

    for c in conflicts:
        if c.resolution == "Overridden" or c.resolution == "JointTrench":
            continue
        if not (c.ack_a and c.ack_b):
            p_other_id = c.project_b_id if c.project_a_id == project.id else c.project_a_id
            other_p = db.query(Project).filter(Project.id == p_other_id).first()
            other_dept = other_p.department if other_p else "peer department"
            missing_ack = "Roads" if not c.ack_a else other_dept

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Approval Gate Blocked: Active conflict {c.id} requires acknowledgment from {missing_ack}. Both departments must acknowledge or obtain an administrative override.",
            )

    actor = current_user["name"] if current_user else (payload.approver if payload else "Chief Municipal Engineer")
    dept = current_user.get("department_name", "Municipal Administration") if current_user else "Executive Administration"

    project.status = "Approved"
    project.updated_at = datetime.datetime.utcnow()
    db.commit()

    log_audit_event(
        db=db,
        action_type="APPROVAL_GRANTED",
        actor=actor,
        department=dept,
        note=f"Project '{project.title}' successfully verified and Approved for execution.",
        project_id=project.id,
        previous_state="Planned",
        new_state="Approved",
    )

    return project

@app.post("/projects/{project_id}/status", response_model=ProjectResponse)
@app.post("/api/projects/{project_id}/status", response_model=ProjectResponse)
def update_project_status(
    project_id: str,
    payload: StatusChangeRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    old_status = project.status
    project.status = payload.new_status
    project.updated_at = datetime.datetime.utcnow()
    db.commit()

    actor = current_user["name"] if current_user else payload.actor
    dept = current_user.get("department_name", payload.department) if current_user else payload.department

    log_audit_event(
        db=db,
        action_type="STATUS_CHANGED",
        actor=actor,
        department=dept,
        note=f"Project status changed from {old_status} to {payload.new_status}. {payload.note or ''}".strip(),
        project_id=project.id,
        previous_state=old_status,
        new_state=payload.new_status,
    )
    return project

# --- ROAD HISTORY (Screen 6) ---

@app.get("/roads/{road_name}/history", response_model=RoadHistoryResponse)
@app.get("/api/roads/{road_name}/history", response_model=RoadHistoryResponse)
def get_road_history(road_name: str, db: Session = Depends(get_db)):
    """
    Returns vertical timeline of every project and conflict on that road,
    with 'dug N times in 12 months' headline stat.
    """
    projects = (
        db.query(Project)
        .filter(Project.road_name.ilike(f"%{road_name.strip()}%"))
        .order_by(desc(Project.start_date))
        .all()
    )

    one_year_ago = datetime.date.today() - datetime.timedelta(days=365)
    excavations_12m = sum(
        1 for p in projects
        if p.status in ["Ongoing", "Completed"]
        and p.start_date >= one_year_ago
        and p.project_type != "Other"
    )

    p_ids = [p.id for p in projects]
    conflicts = (
        db.query(Conflict)
        .filter(or_(Conflict.project_a_id.in_(p_ids), Conflict.project_b_id.in_(p_ids)))
        .all()
    )
    hydrated_conflicts = [hydrate_conflict_data(c, db) for c in conflicts]

    headline = f"Dug {excavations_12m} times in the last 12 months" if excavations_12m > 0 else "Zero excavations in the last 12 months"

    return RoadHistoryResponse(
        road_name=road_name,
        headline_stat=headline,
        excavations_last_12_months=excavations_12m,
        total_projects=len(projects),
        projects=projects,
        conflicts=hydrated_conflicts,
    )

# --- PUBLIC WORKS PAGE (Citizen View, No Auth) ---

@app.get("/public/works")
@app.get("/api/public/works")
def get_public_works(db: Session = Depends(get_db)):
    """
    Public unauthenticated endpoint for citizens:
    returns approved and ongoing road works with department, road name, and duration.
    """
    works = (
        db.query(Project)
        .filter(Project.status.in_(["Approved", "Ongoing"]))
        .order_by(Project.start_date)
        .all()
    )
    return [
        {
            "id": w.id,
            "title": w.title,
            "department": w.department,
            "road_name": w.road_name,
            "project_type": w.project_type,
            "start_date": w.start_date,
            "end_date": w.end_date,
            "status": w.status,
            "lat": w.lat,
            "lng": w.lng,
            "end_lat": w.end_lat,
            "end_lng": w.end_lng,
        }
        for w in works
    ]

# --- DASHBOARD & ANALYTICS ---

@app.get("/dashboard", response_model=DashboardStatsResponse)
@app.get("/api/dashboard", response_model=DashboardStatsResponse)
def get_dashboard_stats(db: Session = Depends(get_db)):
    projects = db.query(Project).all()
    conflicts = db.query(Conflict).all()

    planned = sum(1 for p in projects if p.status == "Planned")
    approved = sum(1 for p in projects if p.status == "Approved")
    ongoing = sum(1 for p in projects if p.status == "Ongoing")
    completed = sum(1 for p in projects if p.status == "Completed")

    active_conflicts = [c for c in conflicts if c.resolution != "Overridden"]
    awaiting_ack = sum(1 for c in active_conflicts if not (c.ack_a and c.ack_b))

    conflicts_caught = len(conflicts)
    avoided_cost = conflicts_caught * ASSUMED_COST_PER_REDIG

    kpis = DashboardKPIs(
        total_projects=len(projects),
        planned=planned,
        approved=approved,
        ongoing=ongoing,
        completed=completed,
        active_conflicts=len(active_conflicts),
        awaiting_acknowledgment=awaiting_ack,
        illustrative_avoided_cost=avoided_cost,
        cost_assumption_note=f"Assumption: Rs {int(ASSUMED_COST_PER_REDIG):,} per prevented repeat excavation",
    )

    # Road flag counts
    road_map: Dict[str, Dict[str, int]] = {}
    for p in projects:
        r = p.road_name
        if r not in road_map:
            road_map[r] = {"projects": 0, "conflicts": 0}
        road_map[r]["projects"] += 1

    for c in conflicts:
        p_a = db.query(Project).filter(Project.id == c.project_a_id).first()
        if p_a and p_a.road_name in road_map:
            road_map[p_a.road_name]["conflicts"] += 1

    top_roads = [
        RoadFlagCount(road_name=r, conflict_count=d["conflicts"], project_count=d["projects"])
        for r, d in sorted(road_map.items(), key=lambda x: x[1]["conflicts"], reverse=True)[:5]
    ]

    dept_colors = {d["name"]: d["color"] for d in DEPARTMENTS}
    dept_map: Dict[str, Dict[str, int]] = {}
    for p in projects:
        d = p.department
        if d not in dept_map:
            dept_map[d] = {"projects": 0, "conflicts": 0}
        dept_map[d]["projects"] += 1

    for c in conflicts:
        p_a = db.query(Project).filter(Project.id == c.project_a_id).first()
        if p_a and p_a.department in dept_map:
            dept_map[p_a.department]["conflicts"] += 1

    dept_dist = [
        DepartmentDistribution(
            department=d,
            project_count=cnt["projects"],
            conflict_count=cnt["conflicts"],
            color=dept_colors.get(d, "#3B82F6"),
        )
        for d, cnt in dept_map.items()
    ]

    return DashboardStatsResponse(
        kpis=kpis,
        top_flagged_roads=top_roads,
        department_distribution=dept_dist,
    )

# --- AUDIT TRAIL ---

@app.get("/audit", response_model=List[AuditLogResponse])
@app.get("/api/audit", response_model=List[AuditLogResponse])
@app.get("/api/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    project_id: Optional[str] = Query(None),
    action_type: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    q = db.query(AuditLog)
    if project_id:
        q = q.filter(AuditLog.project_id == project_id)
    if action_type and action_type != "ALL":
        q = q.filter(AuditLog.action_type == action_type)

    return q.order_by(desc(AuditLog.created_at)).limit(limit).all()

# --- DEMO SEED ---

@app.post("/admin/seed-demo")
@app.post("/api/admin/seed-demo")
@app.post("/api/reset-demo")
def seed_demo(db: Session = Depends(get_db)):
    """Loads the 3 scripted scenarios and full background municipal dataset."""
    seed_database(db, force=True)
    return {
        "status": "success",
        "message": "DigSync demo scenarios seeded successfully (Scenario A, Scenario B, Scenario C, and background city grid).",
    }
