from sqlalchemy import Column, BigInteger, Integer, String, Boolean, Time, DateTime, Date, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class MedicationSchedule(Base):
    """복약 일정 테이블"""
    __tablename__ = "medication_schedules"

    schedule_id            = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id                = Column(BigInteger, ForeignKey("user.id"), nullable=False)
    prescribed_medicine_id = Column(BigInteger, ForeignKey("prescription.id"), nullable=True)
    drug_name              = Column(String(255), nullable=False)
    intake_time            = Column(Time, nullable=False)
    dosage_message         = Column(String(255), nullable=True)
    notification_type      = Column(String(10), nullable=False, default="PUSH")
    is_active              = Column(Boolean, nullable=False, default=True)
    is_custom              = Column(Boolean, nullable=False, default=False)
    start_date             = Column(Date, nullable=True)
    end_date               = Column(Date, nullable=True)
    interval_days          = Column(Integer, nullable=True)   # N일마다 복용(격일=2·주1회=7·4주=28). NULL/1=매일(요일 기반)
    is_as_needed           = Column(Boolean, nullable=False, default=False)   # 필요시 복용(PRN) — 정해진 시간 없음
    meal_basis             = Column(String(10), nullable=True)   # 식사 기준: 식전·식후·식간·상관없음. NULL=미지정
    timing_offset_min      = Column(Integer, nullable=True)   # 식사 기준 오프셋(분). 식후 30분=30
    created_at             = Column(DateTime, nullable=False, default=func.now())

    # 관계 정의
    user            = relationship("User", back_populates="medication_schedules")
    prescription    = relationship("Prescription", back_populates="medication_schedules")
    schedule_days   = relationship("ScheduleDay", back_populates="medication_schedule", cascade="all, delete-orphan")
    medication_logs = relationship("MedicationLog", back_populates="medication_schedule", cascade="all, delete-orphan")
    notifications   = relationship("Notification", back_populates="medication_schedule", cascade="all, delete-orphan")