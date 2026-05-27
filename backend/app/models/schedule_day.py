# app/models/schedule_day.py

from sqlalchemy import Column, BigInteger, String, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class ScheduleDay(Base):
    """복약 요일 테이블"""
    __tablename__ = "schedule_days"

    schedule_day_id = Column(BigInteger, primary_key=True, autoincrement=True)
    schedule_id     = Column(BigInteger, ForeignKey("medication_schedules.schedule_id"), nullable=False)
    day_of_week     = Column(String(3), nullable=False)  # MON | TUE | WED | THU | FRI | SAT | SUN

    # 관계 정의
    medication_schedule = relationship("MedicationSchedule", back_populates="schedule_days")