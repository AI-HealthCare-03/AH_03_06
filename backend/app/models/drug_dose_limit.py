# app/models/drug_dose_limit.py
# DRUG_DOSE_LIMIT 테이블 모델
# 성분 단위 1일 최대 투여량 (식약처 1일최대투여량 데이터)

from sqlalchemy import Column, BigInteger, String, DECIMAL, DateTime
from sqlalchemy.sql import func
from app.database import Base


class DrugDoseLimit(Base):
    """성분 단위 1일 최대 투여량 테이블"""
    __tablename__ = "drug_dose_limit"

    id = Column(BigInteger, primary_key=True, autoincrement=True)             # 고유 ID
    ingredient_code = Column(String(20), nullable=False)                      # 성분코드 (예: M222875)
    ingredient_name_ko = Column(String(200), nullable=True)                   # 성분명 (한글)
    dosage_form_code = Column(String(20), nullable=True)                      # 제형코드
    dosage_form = Column(String(50), nullable=True)                           # 제형명 (정제, 캡슐 등)
    route = Column(String(20), nullable=True)                                 # 투여경로 (경구 / 주사 등)
    dose_unit = Column(String(20), nullable=True)                             # 투여단위 (정, mg 등)
    max_daily_dose = Column(DECIMAL(10, 2), nullable=False)                   # 1일 최대 투여량

    created_at = Column(DateTime, nullable=False, server_default=func.now())   # 등록일시