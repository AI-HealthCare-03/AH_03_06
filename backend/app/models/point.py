from sqlalchemy import Column, BigInteger, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class UserPoint(Base):
    """유저별 포인트 잔액 테이블 (캐싱)"""
    __tablename__ = "user_point"

    user_id = Column(BigInteger, ForeignKey("user.id"), primary_key=True)
    balance = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="point")
    history = relationship("PointHistory", back_populates="user_point",
                           primaryjoin="UserPoint.user_id == PointHistory.user_id",
                           foreign_keys="PointHistory.user_id")


class PointHistory(Base):
    """포인트 적립/차감 이력 테이블 (원장)"""
    __tablename__ = "point_history"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("user.id"), nullable=False)
    event_type = Column(String(50), nullable=False)
    amount = Column(Integer, nullable=False)
    balance_snapshot = Column(Integer, nullable=False)
    description = Column(String(100), nullable=True)
    created_at = Column(DateTime, nullable=False, default=func.now())

    user = relationship("User", back_populates="point_history",
                        foreign_keys=[user_id])
    user_point = relationship("UserPoint", back_populates="history",
                              primaryjoin="PointHistory.user_id == UserPoint.user_id",
                              foreign_keys="PointHistory.user_id")