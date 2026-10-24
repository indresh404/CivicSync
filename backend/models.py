import datetime
import json
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
    JSON,
)
from sqlalchemy.orm import relationship
from backend.database import Base

class Department(Base):
    __tablename__ = "departments"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    color = Column(String(20), nullable=False, default="#2563EB")

class User(Base):
    __tablename__ = "users"

    id = Column(String(50), primary_key=True, index=True)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False)
    department_id = Column(String(50), ForeignKey("departments.id"), nullable=True)
    role = Column(String(50), nullable=False, default="DEPARTMENT_USER")  # DEPARTMENT_USER, ADMIN

class Project(Base):
    __tablename__ = "projects"

    id = Column(String(50), primary_key=True, index=True)
    department_id = Column(String(50), nullable=False, index=True, default="Roads Department")
    department = Column(String(100), nullable=False, index=True, default="Roads Department")
    created_by = Column(String(100), nullable=True)
    title = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)  # Alias for backward compatibility
    project_type = Column(String(100), nullable=False, index=True)  # Resurfacing|Pipeline|Cabling|Sewerage|Gas line|Other
    geometry_type = Column(String(20), nullable=False, default="point")  # point|line
    
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    latitude = Column(Float, nullable=False)  # Alias
    longitude = Column(Float, nullable=False) # Alias
    end_lat = Column(Float, nullable=True)
    end_lng = Column(Float, nullable=True)
    end_latitude = Column(Float, nullable=True)  # Alias
    end_longitude = Column(Float, nullable=True) # Alias
    radius_m = Column(Float, default=25.0)
    radius_meters = Column(Float, default=25.0)  # Alias

    road_name = Column(String(255), nullable=False, index=True)
    road_type = Column(String(50), nullable=False, default="Residential")  # Arterial|Residential
    description = Column(Text, nullable=True)

    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(String(50), nullable=False, default="Planned")  # Planned|Approved|Ongoing|Completed
    
    has_conflict = Column(Boolean, default=False)
    conflict_check_performed = Column(Boolean, default=False)
    conflict_check_version = Column(Integer, default=0)
    conflict_check_at = Column(DateTime, nullable=True)
    
    is_overridden = Column(Boolean, default=False)
    override_reason = Column(Text, nullable=True)
    override_by = Column(String(100), nullable=True)
    override_at = Column(DateTime, nullable=True)
    cooldown_justification = Column(Text, nullable=True)

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
    
    severity_score = Column(Float, nullable=False)  # 0 to 100 or 0 to 1
    severity_breakdown = Column(JSON, nullable=True)
    suggested_sequence = Column(Text, nullable=False)
    suggested_dates = Column(Text, nullable=True)
    
    resolution = Column(String(50), nullable=False, default="Pending")  # Pending|Sequenced|JointTrench|Overridden
    status = Column(String(50), nullable=False, default="Awaiting Acknowledgment")  # UI status alias
    
    ack_a = Column(Boolean, default=False)
    ack_b = Column(Boolean, default=False)
    ack_a_at = Column(DateTime, nullable=True)
    ack_b_at = Column(DateTime, nullable=True)
    ack_a_by = Column(String(100), nullable=True)
    ack_b_by = Column(String(100), nullable=True)

    proximity_score = Column(Float, default=0.0)
    overlap_score = Column(Float, default=0.0)
    road_importance_score = Column(Float, default=0.0)
    severity_level = Column(String(20), default="Medium")  # High, Medium, Low
    conflict_reason = Column(Text, default="")
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
    user_id = Column(String(100), nullable=True)
    actor = Column(String(100), nullable=False)
    department = Column(String(100), nullable=False)
    note = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)  # Alias
    previous_state = Column(Text, nullable=True)
    new_state = Column(Text, nullable=True)

class Config(Base):
    __tablename__ = "configs"

    key = Column(String(100), primary_key=True)
    value = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
