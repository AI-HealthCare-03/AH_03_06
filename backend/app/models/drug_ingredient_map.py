# app/models/drug_ingredient_map.py
# DRUG_INGREDIENT_MAP 테이블 모델
# 약품 ↔ 성분 N:M 매핑 (제품허가목록 주성분 + DUR 성분 매핑)

from sqlalchemy import Column, BigInteger, String, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from app.database import Base


class DrugIngredientMap(Base):
    """약품-성분 매핑 테이블"""
    __tablename__ = "drug_ingredient_map"

    id = Column(BigInteger, primary_key=True, autoincrement=True)             # 고유 ID
    drug_id = Column(BigInteger, ForeignKey("drug_info.drug_id"), nullable=False)  # 약품 ID (DRUG_INFO 참조)
    ingredient_code = Column(String(20), nullable=False)                      # 성분코드
    ingredient_name = Column(String(200), nullable=True)                      # 성분명 (한글)
    is_main = Column(Boolean, nullable=False, default=True)                   # 주성분 여부 (True=주성분)

    created_at = Column(DateTime, nullable=False, server_default=func.now())   # 등록일시

    __table_args__ = (
        UniqueConstraint("drug_id", "ingredient_code", name="uq_drug_ingredient"),
    )