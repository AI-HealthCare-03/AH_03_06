# app/models/fcm_token.py
# FCM 토큰 테이블 모델

from sqlalchemy import Column, BigInteger, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class FcmToken(Base):
    """FCM 토큰 테이블"""
    __tablename__ = "fcm_tokens"

    id         = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id    = Column(BigInteger, ForeignKey("user.id"), nullable=False)
    token      = Column(String(255), nullable=False)
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="fcm_tokens")