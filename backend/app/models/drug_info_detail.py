# app/models/drug_info_detail.py
# DRUG_INFO_DETAIL 테이블 모델
# 약품 자연어 정보 (효능·용법·주의사항·부작용·보관법)

from sqlalchemy import Column, BigInteger, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class DrugInfoDetail(Base):
    """약품 상세 정보 테이블 (e약은요 / 허가상세)"""
    __tablename__ = "drug_info_detail"

    id = Column(BigInteger, primary_key=True, autoincrement=True)             # 고유 ID
    drug_id = Column(BigInteger, ForeignKey("drug_info.drug_id"), nullable=False)  # 약품 ID (DRUG_INFO 참조)

    efficacy = Column(Text, nullable=True)                                    # 효능효과
    usage_method = Column(Text, nullable=True)                                # 용법용량
    precautions_before = Column(Text, nullable=True)                          # 사용 전 알아야 할 내용
    precautions_usage = Column(Text, nullable=True)                           # 사용상 주의사항
    drug_food_interactions = Column(Text, nullable=True)                      # 약·음식 상호작용
    side_effects = Column(Text, nullable=True)                                # 이상반응 / 부작용
    storage_method = Column(Text, nullable=True)                              # 보관법

    source_type = Column(String(200), nullable=False)                         # 출처 구분 (e_drug / permit_detail)

    created_at = Column(DateTime, nullable=False, default=func.now())          # 등록일시
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())  # 수정일시