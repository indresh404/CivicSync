import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

# --- Auth Schemas ---
class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    role: str

# --- Preview Conflicts Schema (stateless live check) ---
class PreviewConflictRequest(BaseModel):
    project_type: str
    geometry_type: str = "point"  # point|line
    lat: float
    lng: float
    end_lat: Optional[float] = None
    end_lng: Optional[float] = None
    radius_m: float = 25.0
    road_name: str
    road_type: str = "Residential"  # Arterial|Residential
    start_date: datetime.date
    end_date: datetime.date
    department_id: Optional[str] = "DEPT-ROADS"
    department: Optional[str] = "Roads Department"

class PotentialConflictItem(BaseModel):
    existing_project_id: str
    existing_project_title: str
    existing_department: str
    existing_project_type: str
    distance_meters: float
    overlapping_days: int
    severity_score: float
    severity_level: str
    suggested_sequence: str
    severity_breakdown: Optional[Dict[str, Any]] = None

class PreviewConflictResponse(BaseModel):
    has_conflicts: bool
    conflict_count: int
    conflicts: List[PotentialConflictItem]
    cooldown_warning: Optional[Dict[str, Any]] = None
    monsoon_warning: Optional[Dict[str, Any]] = None

# --- Project Schemas ---
class ProjectCreate(BaseModel):
    title: Optional[str] = None
    name: Optional[str] = None
    department_id: Optional[str] = None
    department: Optional[str] = None
    project_type: str
    description: Optional[str] = None
    road_name: str
    road_type: str = "Residential"
    geometry_type: str = "point"
    lat: Optional[float] = None
    lng: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    end_lat: Optional[float] = None
    end_lng: Optional[float] = None
    end_latitude: Optional[float] = None
    end_longitude: Optional[float] = None
    radius_m: Optional[float] = 25.0
    radius_meters: Optional[float] = 25.0
    start_date: datetime.date
    end_date: datetime.date
    cooldown_justification: Optional[str] = None

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[datetime.date] = None
    end_date: Optional[datetime.date] = None
    status: Optional[str] = None
    cooldown_justification: Optional[str] = None

class ProjectResponse(BaseModel):
    id: str
    title: str
    name: str
    department_id: str
    department: str
    project_type: str
    geometry_type: str
    description: Optional[str] = None
    road_name: str
    road_type: str
    lat: float
    lng: float
    latitude: float
    longitude: float
    end_lat: Optional[float] = None
    end_lng: Optional[float] = None
    end_latitude: Optional[float] = None
    end_longitude: Optional[float] = None
    radius_m: float
    radius_meters: float
    start_date: datetime.date
    end_date: datetime.date
    status: str
    has_conflict: bool
    conflict_check_performed: bool
    conflict_check_version: int
    conflict_check_at: Optional[datetime.datetime] = None
    is_overridden: bool
    override_reason: Optional[str] = None
    override_by: Optional[str] = None
    override_at: Optional[datetime.datetime] = None
    cooldown_justification: Optional[str] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    active_conflicts_count: Optional[int] = 0

    class Config:
        from_attributes = True

# --- Conflict Schemas ---
class ConflictResponse(BaseModel):
    id: str
    project_a_id: str
    project_b_id: str
    calculated_distance: float
    threshold: float
    overlap_start: datetime.date
    overlap_end: datetime.date
    overlapping_days: int
    severity_score: float
    severity_breakdown: Optional[Dict[str, Any]] = None
    suggested_sequence: str
    suggested_dates: Optional[str] = None
    resolution: str  # Pending|Sequenced|JointTrench|Overridden
    status: str
    ack_a: bool
    ack_b: bool
    ack_a_by: Optional[str] = None
    ack_b_by: Optional[str] = None
    proximity_score: float
    overlap_score: float
    road_importance_score: float
    severity_level: str
    conflict_reason: str
    report_version: int
    created_at: datetime.datetime
    updated_at: datetime.datetime

    # Hydrated metadata for display
    project_a_name: Optional[str] = None
    project_a_dept: Optional[str] = None
    project_a_type: Optional[str] = None
    project_b_name: Optional[str] = None
    project_b_dept: Optional[str] = None
    project_b_type: Optional[str] = None
    road_name: Optional[str] = None
    acknowledgments: Optional[List[Any]] = []

    class Config:
        from_attributes = True

class ProjectDetailResponse(ProjectResponse):
    conflicts: List[ConflictResponse] = []

class AcknowledgmentCreate(BaseModel):
    department: str
    acknowledged_by: str
    note: Optional[str] = None

class AcknowledgmentResponse(BaseModel):
    id: str
    conflict_id: str
    department: str
    acknowledged_by: str
    report_version: int
    note: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# --- Resolution & Gate Action Schemas ---
class ApproveRequest(BaseModel):
    approver: str = "Chief Municipal Engineer"
    department: str = "Municipal Administration"
    notes: Optional[str] = None

class OverrideRequest(BaseModel):
    reason: str
    override_by: Optional[str] = "City Administrator"

class ProposeJointRequest(BaseModel):
    proposed_by: Optional[str] = None
    notes: Optional[str] = None
    shared_start_date: Optional[datetime.date] = None
    shared_end_date: Optional[datetime.date] = None

class StatusChangeRequest(BaseModel):
    new_status: str  # Planned, Approved, Ongoing, Completed
    actor: str = "System"
    department: str = "Administration"
    note: Optional[str] = None

# --- Audit & Road History Schemas ---
class AuditLogResponse(BaseModel):
    id: str
    action_type: str
    project_id: Optional[str] = None
    conflict_id: Optional[str] = None
    user_id: Optional[str] = None
    actor: str
    department: str
    note: str
    timestamp: datetime.datetime
    created_at: datetime.datetime
    previous_state: Optional[str] = None
    new_state: Optional[str] = None

    class Config:
        from_attributes = True

class RoadHistoryResponse(BaseModel):
    road_name: str
    headline_stat: str
    excavations_last_12_months: int
    total_projects: int
    projects: List[ProjectResponse]
    conflicts: List[ConflictResponse]

# --- Dashboard Schemas ---
class DashboardKPIs(BaseModel):
    total_projects: int
    planned: int
    approved: int
    ongoing: int
    completed: int
    active_conflicts: int
    awaiting_acknowledgment: int
    illustrative_avoided_cost: float
    cost_assumption_note: str

class RoadFlagCount(BaseModel):
    road_name: str
    conflict_count: int
    project_count: int

class DepartmentDistribution(BaseModel):
    department: str
    project_count: int
    conflict_count: int
    color: str

class DashboardStatsResponse(BaseModel):
    kpis: DashboardKPIs
    top_flagged_roads: List[RoadFlagCount]
    department_distribution: List[DepartmentDistribution]
