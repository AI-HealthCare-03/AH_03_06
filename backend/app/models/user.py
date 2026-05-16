# app/models/user.py
# 사용자 관련 테이블 모델
# USER, SOCIAL_LOGIN, REFRESH_TOKEN

from sqlalchemy import Column, BigInteger, String, DateTime, Text, SmallInteger, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    """사용자 계정 인증 정보 테이블"""
    __tablename__ = "user"

    id = Column(BigInteger, primary_key=True, autoincrement=True)           # 사용자 고유 ID
    email = Column(String(255), unique=True, nullable=False)                # 이메일 (로그인 식별자)
    password_hash = Column(String(255), nullable=True)                      # 해시 처리된 비밀번호 (소셜 로그인 시 NULL)
    name = Column(String(50), nullable=False)                               # 실명
    nickname = Column(String(50), unique=True, nullable=False)              # 닉네임 (서비스 내 표시 이름)
    profile_image_url = Column(String(255), nullable=True)                  # 프로필 이미지 URL
    created_at = Column(DateTime, nullable=False, default=func.now())       # 생성일시
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())  # 수정일시

    social_logins = relationship("SocialLogin", back_populates="user")
    refresh_tokens = relationship("RefreshToken", back_populates="user")