# app/models/refresh_token.py
# RefreshToken 테이블 모델

from sqlalchemy import Column, BigInteger, String, DateTime, Text, SmallInteger, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class RefreshToken(Base):
    """리프레시 토큰 테이블 (일반/소셜 통합 관리)"""
    __tablename__ = "refresh_token"

    id = Column(BigInteger, primary_key=True, autoincrement=True)           # 고유 ID
    user_id = Column(BigInteger, ForeignKey("user.id"), nullable=False)     # 사용자 ID (USER.id 참조)
    token = Column(Text, nullable=False)                                    # 리프레시 토큰 값
    provider = Column(String(20), nullable=False, default="local")          # 로그인 유형 (local/google)
    is_revoked = Column(SmallInteger, nullable=False, default=0)            # 무효화 여부 (0: 유효, 1: 무효)
    created_at = Column(DateTime, nullable=False, default=func.now())       # 생성일시
    expires_at = Column(DateTime, nullable=False)                           # 만료일시

    user = relationship("User", back_populates="refresh_tokens")