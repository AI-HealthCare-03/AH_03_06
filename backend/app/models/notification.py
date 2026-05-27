# app/models/notification.py

from sqlalchemy import Column, BigInteger, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Notification(Base):
    """알림 이력 테이블"""
    __tablename__ = "notifications"

    notification_id   = Column(BigInteger, primary_key=True, autoincrement=True)
    schedule_id       = Column(BigInteger, ForeignKey("medication_schedules.schedule_id"), nullable=False)
    notification_time = Column(DateTime, nullable=False)
    notification_type = Column(String(10), nullable=False)  # REGULAR | REMINDER
    message           = Column(Text, nullable=True)
    is_sent           = Column(Boolean, nullable=False, default=False)

    # 관계 정의
    medication_schedule = relationship("MedicationSchedule", back_populates="notifications")