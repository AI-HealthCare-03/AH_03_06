# app/models/profile.py
from sqlalchemy import Column, BigInteger, String, Integer, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class ProfileItem(Base):
    """선택 가능한 프로필 이미지 목록"""
    __tablename__ = "profile_item"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False)
    image_url = Column(String(255), nullable=False)
    required_point = Column(Integer, nullable=False, default=0)
    is_default = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=func.now())

    user_profile_items = relationship("UserProfileItem", back_populates="profile_item")


class UserProfileItem(Base):
    """유저별 프로필 해금 현황"""
    __tablename__ = "user_profile_item"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("user.id"), nullable=False)
    profile_item_id = Column(BigInteger, ForeignKey("profile_item.id"), nullable=False)
    is_selected = Column(Boolean, nullable=False, default=False)
    unlocked_at = Column(DateTime, nullable=False, default=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "profile_item_id", name="uq_user_profile_item"),
    )

    user = relationship("User", back_populates="profile_items")
    profile_item = relationship("ProfileItem", back_populates="user_profile_items")