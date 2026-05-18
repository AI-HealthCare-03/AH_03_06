# app/models/health_checkup.py
# HEALTH_CHECKUP 테이블 모델

from sqlalchemy import Column, BigInteger, Integer, DECIMAL, DateTime, ForeignKey
from sqlalchemy.dialects.mysql import YEAR
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class HealthCheckup(Base):
    """사용자 건강검진 결과 수치 테이블"""
    __tablename__ = "health_checkup"

    id = Column(BigInteger, primary_key=True, autoincrement=True)              # 고유 ID
    user_id = Column(BigInteger, ForeignKey("user.id"), nullable=False)        # 사용자 ID (USER.id 참조)
    checkup_year = Column(YEAR, nullable=False)                                # 검진 기준연도
    bp_systolic = Column(Integer, nullable=True)                               # 수축기 혈압
    bp_diastolic = Column(Integer, nullable=True)                              # 이완기 혈압
    fasting_glucose = Column(Integer, nullable=True)                           # 공복혈당
    total_cholesterol = Column(Integer, nullable=True)                         # 총콜레스테롤
    hdl = Column(Integer, nullable=True)                                       # HDL 콜레스테롤
    ldl = Column(Integer, nullable=True)                                       # LDL 콜레스테롤
    triglyceride = Column(Integer, nullable=True)                              # 중성지방
    height = Column(DECIMAL(5, 2), nullable=True)                              # 신장 (cm)
    weight = Column(DECIMAL(5, 2), nullable=True)                              # 체중 (kg)
    waist = Column(DECIMAL(5, 2), nullable=True)                               # 허리둘레 (cm)
    hemoglobin = Column(DECIMAL(5, 2), nullable=True)                          # 혈색소
    creatinine = Column(DECIMAL(5, 2), nullable=True)                          # 혈청크레아티닌
    ast = Column(Integer, nullable=True)                                       # AST
    alt = Column(Integer, nullable=True)                                       # ALT
    ggt = Column(Integer, nullable=True)                                       # 감마지티피
    created_at = Column(DateTime, nullable=False, default=func.now())          # 생성일시

    user = relationship("User", back_populates="health_checkups")