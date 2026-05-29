# app/models/medication_log.py

from sqlalchemy import Column, BigInteger, String, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class MedicationLog(Base):
    """복약 기록 테이블"""
    __tablename__ = "medication_logs"

    log_id      = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id     = Column(BigInteger, ForeignKey("user.id"), nullable=False)
    schedule_id = Column(BigInteger, ForeignKey("medication_schedules.schedule_id"), nullable=False)
    intake_date = Column(Date, nullable=False)
    status      = Column(String(10), nullable=False)  # TAKEN | MISSED
    created_at  = Column(DateTime, nullable=False, default=func.now())
    checked_at  = Column(DateTime, nullable=True)

    # 관계 정의
    user                = relationship("User", back_populates="medication_logs")
    medication_schedule = relationship("MedicationSchedule", back_populates="medication_logs")