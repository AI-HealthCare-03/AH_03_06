# app/models/medication_schedule.py

from sqlalchemy import Column, BigInteger, String, Boolean, Time, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class MedicationSchedule(Base):
    """복약 일정 테이블"""
    __tablename__ = "medication_schedules"

    schedule_id           = Column(BigInteger, primary_key=True, autoincrement=True)
    prescribed_medicine_id = Column(BigInteger, ForeignKey("prescription.id"), nullable=False)
    intake_time           = Column(Time, nullable=False)
    dosage_message        = Column(String(255), nullable=True)
    notification_type     = Column(String(10), nullable=False, default="PUSH")
    is_active             = Column(Boolean, nullable=False, default=True)
    created_at            = Column(DateTime, nullable=False, default=func.now())

    # 관계 정의
    prescription    = relationship("Prescription", back_populates="medication_schedules")
    schedule_days   = relationship("ScheduleDay", back_populates="medication_schedule", cascade="all, delete-orphan")
    medication_logs = relationship("MedicationLog", back_populates="medication_schedule", cascade="all, delete-orphan")
    notifications   = relationship("Notification", back_populates="medication_schedule", cascade="all, delete-orphan")