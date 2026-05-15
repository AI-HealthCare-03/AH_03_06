# app/models/social_login.py
# SocialLogin 테이블 모델

from sqlalchemy import Column, BigInteger, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class SocialLogin(Base):
    """소셜 로그인 인증 정보 테이블 (Google)"""
    __tablename__ = "social_login"

    id = Column(BigInteger, primary_key=True, autoincrement=True)           # 고유 ID
    user_id = Column(BigInteger, ForeignKey("user.id"), nullable=False)     # 사용자 ID (USER.id 참조)
    provider = Column(String(20), nullable=False)                           # 소셜 로그인 제공자 (google)
    provider_id = Column(String(255), nullable=False)                       # 제공자 고유 ID
    access_token = Column(Text, nullable=True)                              # 액세스 토큰
    created_at = Column(DateTime, nullable=False, default=func.now())       # 생성일시
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())  # 수정일시

    user = relationship("User", back_populates="social_logins")