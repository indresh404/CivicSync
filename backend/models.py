import datetime
from sqlalchemy import (
    Column,
    String,
    Float,
    Integer,
    Boolean,
    Date,
    DateTime,
    Text,
    ForeignKey,
)
from sqlalchemy.orm import relationship
from backend.database import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    department = Column(String(100), nullable=False, index=True)
    project_type = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)
    road_name = Column(String(255), nullable=False, index=True)
    road_type = Column(String(50), nullable=False, default="Residential")  # Arterial or Residential
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    end_latitude = Column(Float, nullable=True)
    end_longitude = Column(Float, nullable=True)
    radius_meters = Column(Float, default=25.0)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(String(50), nullable=False, default="Planned")  # Planned, Approved, Ongoing, Completed
    
    conflict_check_performed = Column(Boolean, default=False)
    conflict_check_version = Column(Integer, default=0)
    conflict_check_at = Column(DateTime, nullable=True)
    
    is_overridden = Column(Boolean, default=False)
    override_reason = Column(Text, nullable=True)
    override_by = Column(String(100), nullable=True)
    override_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    conflicts_as_a = relationship("Conflict", foreign_keys="Conflict.project_a_id", back_populates="project_a", cascade="all, delete-orphan")
    conflicts_as_b = relationship("Conflict", foreign_keys="Conflict.project_b_id", back_populates="project_b", cascade="all, delete-orphan")


class Conflict(Base):
    __tablename__ = "conflicts"

    id = Column(String(50), primary_key=True, index=True)
    project_a_id = Column(String(50), ForeignKey("projects.id"), nullable=False)
    project_b_id = Column(String(50), ForeignKey("projects.id"), nullable=False)
    calculated_distance = Column(Float, nullable=False)
    threshold = Column(Float, nullable=False, default=50.0)
    overlap_start = Column(Date, nullable=False)
    overlap_end = Column(Date, nullable=False)
    overlapping_days = Column(Integer, nullable=False)
    
    proximity_score = Column(Float, nullable=False)
    overlap_score = Column(Float, nullable=False)
    road_importance_score = Column(Float, nullable=False)
    severity_score = Column(Float, nullable=False)
    severity_level = Column(String(20), nullable=False)  # High, Medium, Low
    
    conflict_reason = Column(Text, nullable=False)
    suggested_sequence = Column(Text, nullable=False)
    suggested_dates = Column(Text, nullable=True)
    
    status = Column(String(50), nullable=False, default="Awaiting Acknowledgment")  # Awaiting Acknowledgment, Ready for Review, Resolved, Overridden, Closed
    report_version = Column(Integer, default=1)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    project_a = relationship("Project", foreign_keys=[project_a_id], back_populates="conflicts_as_a")
    project_b = relationship("Project", foreign_keys=[project_b_id], back_populates="conflicts_as_b")
    acknowledgments = relationship("Acknowledgment", back_populates="conflict", cascade="all, delete-orphan")


class Acknowledgment(Base):
    __tablename__ = "acknowledgments"

    id = Column(String(50), primary_key=True, index=True)
    conflict_id = Column(String(50), ForeignKey("conflicts.id"), nullable=False)
    department = Column(String(100), nullable=False)
    acknowledged_by = Column(String(100), nullable=False)
    report_version = Column(Integer, default=1)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    conflict = relationship("Conflict", back_populates="acknowledgments")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(50), primary_key=True, index=True)
    action_type = Column(String(100), nullable=False, index=True)
    project_id = Column(String(50), nullable=True, index=True)
    conflict_id = Column(String(50), nullable=True, index=True)
    actor = Column(String(100), nullable=False)
    department = Column(String(100), nullable=False)
    note = Column(Text, nullable=False)
    previous_state = Column(Text, nullable=True)
    new_state = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
