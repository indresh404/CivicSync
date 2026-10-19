from datetime import date, datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator, ConfigDict

class ProjectBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=255)
    department: str = Field(..., min_length=2, max_length=100)
    project_type: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    road_name: str = Field(..., min_length=2, max_length=255)
    road_type: str = Field(default="Residential")  # Arterial or Residential
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    end_latitude: Optional[float] = Field(default=None, ge=-90.0, le=90.0)
    end_longitude: Optional[float] = Field(default=None, ge=-180.0, le=180.0)
    radius_meters: float = Field(default=25.0, ge=5.0, le=500.0)
    start_date: date
    end_date: date

    @field_validator("end_date")
    @classmethod
    def validate_dates(cls, end_date: date, info):
        start_date = info.data.get("start_date")
        if start_date and end_date < start_date:
            raise ValueError("End date cannot precede start date.")
        return end_date

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    road_type: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = None

class AcknowledgmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    conflict_id: str
    department: str
    acknowledged_by: str
    report_version: int
    note: Optional[str] = None
    created_at: datetime

class ConflictResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_a_id: str
    project_b_id: str
    calculated_distance: float
    threshold: float
    overlap_start: date
    overlap_end: date
    overlapping_days: int
    proximity_score: float
    overlap_score: float
    road_importance_score: float
    severity_score: float
    severity_level: str
    conflict_reason: str
    suggested_sequence: str
    suggested_dates: Optional[str] = None
    status: str
    report_version: int
    created_at: datetime
    updated_at: datetime
    acknowledgments: List[AcknowledgmentResponse] = []
    
    # Project summary context for frontend display
    project_a_name: Optional[str] = None
    project_a_dept: Optional[str] = None
    project_a_type: Optional[str] = None
    project_b_name: Optional[str] = None
    project_b_dept: Optional[str] = None
    project_b_type: Optional[str] = None
    road_name: Optional[str] = None

class ProjectResponse(ProjectBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    status: str
    conflict_check_performed: bool
    conflict_check_version: int
    conflict_check_at: Optional[datetime] = None
    is_overridden: bool
    override_reason: Optional[str] = None
    override_by: Optional[str] = None
    override_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    active_conflicts_count: int = 0
    has_conflicts: bool = False

class ProjectDetailResponse(ProjectResponse):
    conflicts: List[ConflictResponse] = []

class AcknowledgmentCreate(BaseModel):
    department: str = Field(..., min_length=2)
    acknowledged_by: str = Field(..., min_length=2)
    note: Optional[str] = None

class OverrideRequest(BaseModel):
    override_reason: str = Field(..., min_length=5, description="Non-empty mandatory justification for override")
    override_by: str = Field(..., min_length=2)

class ApproveRequest(BaseModel):
    approved_by: str = Field(..., min_length=2)

class StatusChangeRequest(BaseModel):
    new_status: str
    changed_by: str
    note: Optional[str] = None

class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    action_type: str
    project_id: Optional[str] = None
    conflict_id: Optional[str] = None
    actor: str
    department: str
    note: str
    previous_state: Optional[str] = None
    new_state: Optional[str] = None
    created_at: datetime

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
    flagged_conflicts: int

class DepartmentDistribution(BaseModel):
    department: str
    count: int

class DashboardStatsResponse(BaseModel):
    kpis: DashboardKPIs
    top_flagged_roads: List[RoadFlagCount]
    department_distribution: List[DepartmentDistribution]
    status_distribution: Dict[str, int]
    severity_distribution: Dict[str, int]
