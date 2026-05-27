# app/models/drug_info.py
# DRUG_INFO 테이블 모델
# 식약처 제품허가목록 + 회수 데이터 기반 약품 기준 정보

from sqlalchemy import Column, BigInteger, String, Boolean, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class DrugInfo(Base):
    """약품 기준 정보 테이블 (제품허가목록 + 회수 플래그)"""
    __tablename__ = "drug_info"

    drug_id      = Column(BigInteger, primary_key=True, autoincrement=True)
    drug_name    = Column(String(200), unique=True, nullable=False)
    generic_name = Column(String(200), nullable=True)
    drug_code    = Column(String(50), unique=True, nullable=True)
    manufacturer = Column(String(100), nullable=True)
    dosage_form  = Column(String(50), nullable=True)
    drug_type    = Column(String(20), nullable=True)
    atc_code     = Column(String(20), nullable=True)
    is_recalled  = Column(Boolean, nullable=False, default=False)
    recall_reason = Column(Text, nullable=True)
    created_at   = Column(DateTime, nullable=False, server_default=func.now())
    updated_at   = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())

    # 관계 정의
    prescriptions = relationship("Prescription", back_populates="drug_info")