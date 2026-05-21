# app/models/drug_info.py
# DRUG_INFO 테이블 모델
# 식약처 제품허가목록 + 회수 데이터 기반 약품 기준 정보

from sqlalchemy import Column, BigInteger, String, Boolean, Text, DateTime
from sqlalchemy.sql import func
from app.database import Base


class DrugInfo(Base):
    """약품 기준 정보 테이블 (제품허가목록 + 회수 플래그)"""
    __tablename__ = "drug_info"

    drug_id = Column(BigInteger, primary_key=True, autoincrement=True)         # 의약품 고유 ID
    drug_name = Column(String(200), unique=True, nullable=False)              # 표준 약품명
    generic_name = Column(String(200), nullable=True)                         # 일반명 / 성분명
    drug_code = Column(String(50), unique=True, nullable=True)                # 식약처 품목일련번호
    manufacturer = Column(String(100), nullable=True)                         # 제조사
    dosage_form = Column(String(50), nullable=True)                           # 제형 (정제, 캡슐 등)
    drug_type = Column(String(20), nullable=True)                             # 전문/일반 구분
    atc_code = Column(String(20), nullable=True)                              # ATC 분류 코드

    is_recalled = Column(Boolean, nullable=False, default=False)              # 회수 여부
    recall_reason = Column(Text, nullable=True)                               # 회수 사유 + 일자

    created_at = Column(DateTime, nullable=False, default=func.now())          # 등록일시
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())  # 수정일시