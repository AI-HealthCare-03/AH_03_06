from sqlalchemy import Column, BigInteger, Date, DateTime, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Attendance(Base):
    """출석 기록 테이블"""
    __tablename__ = "attendance"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("user.id"), nullable=False)
    checked_at = Column(Date, nullable=False)
    created_at = Column(DateTime, nullable=False, default=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "checked_at", name="uq_user_date"),
    )

    user = relationship("User", back_populates="attendances")


class AttendanceStreak(Base):
    """연속 출석 현황 캐싱 테이블"""
    __tablename__ = "attendance_streak"

    user_id = Column(BigInteger, ForeignKey("user.id"), primary_key=True)
    current_streak = Column(Integer, nullable=False, default=0)
    max_streak = Column(Integer, nullable=False, default=0)
    last_checked_at = Column(Date, nullable=True)

    user = relationship("User", back_populates="attendance_streak")