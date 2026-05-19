# app/models/user.py
from sqlalchemy import Column, BigInteger, String, DateTime, Date, Boolean, DECIMAL, SmallInteger, ForeignKey, Text, CHAR
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    """사용자 계정 인증 정보 테이블"""
    __tablename__ = "user"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=True)
    name = Column(String(50), nullable=False)
    nickname = Column(String(50), unique=True, nullable=False)
    profile_image_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    social_logins = relationship("SocialLogin", back_populates="user")
    refresh_tokens = relationship("RefreshToken", back_populates="user")
    health_checkups = relationship("HealthCheckup", back_populates="user")
    profile = relationship("UserProfile", back_populates="user", uselist=False)
    health_info = relationship("UserHealthInfo", back_populates="user", uselist=False)
    underlying_diseases = relationship("UserUnderlyingDisease", back_populates="user")
    health_goals = relationship("UserHealthGoal", back_populates="user")


class UserProfile(Base):
    """사용자 기본 프로필 테이블 (생년월일, 성별)"""
    __tablename__ = "user_profile"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("user.id"), nullable=False, unique=True)
    birthday = Column(Date, nullable=False)
    gender = Column(CHAR(1), nullable=False)
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="profile")


class UserHealthInfo(Base):
    """사용자 건강 기본 정보 테이블"""
    __tablename__ = "user_health_info"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("user.id"), nullable=False, unique=True)
    height = Column(DECIMAL(5, 2), nullable=False)
    weight = Column(DECIMAL(5, 2), nullable=False)
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="health_info")


class UserUnderlyingDisease(Base):
    """사용자 기저질환 테이블"""
    __tablename__ = "user_underlying_disease"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("user.id"), nullable=False)
    disease_name = Column(String(255), nullable=False)
    created_at = Column(DateTime, nullable=False, default=func.now())

    user = relationship("User", back_populates="underlying_diseases")


class HealthGoalType(Base):
    """건강 목표 카테고리 테이블"""
    __tablename__ = "health_goal_type"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)

    user_health_goals = relationship("UserHealthGoal", back_populates="goal_type")


class UserHealthGoal(Base):
    """사용자 건강 목표 테이블"""
    __tablename__ = "user_health_goal"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("user.id"), nullable=False)
    goal_type_id = Column(BigInteger, ForeignKey("health_goal_type.id"), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="health_goals")
    goal_type = relationship("HealthGoalType", back_populates="user_health_goals")