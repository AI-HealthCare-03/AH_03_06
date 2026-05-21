# app/models/dur_concurrent_ingredient.py
# DUR_CONCURRENT_INGREDIENT 테이블 모델
# 성분 단위 병용금기 페어 (식약처 DUR 성분 데이터)

from sqlalchemy import Column, BigInteger, Integer, String, Text, Date, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from app.database import Base


class DurConcurrentIngredient(Base):
    """성분 단위 병용금기 테이블"""
    __tablename__ = "dur_concurrent_ingredient"

    id = Column(BigInteger, primary_key=True, autoincrement=True)             # 고유 ID
    dur_seq = Column(Integer, nullable=False)                                 # DUR 일련번호 (원본 식별자)
    dur_type = Column(String(50), nullable=False)                             # DUR 유형 (병용금기 등)
    ingredient_code_a = Column(String(20), nullable=False)                    # DUR성분코드 A
    ingredient_name_a = Column(String(200), nullable=True)                    # 성분명 A
    ingredient_code_b = Column(String(20), nullable=False)                    # 병용금기 DUR성분코드 B
    ingredient_name_b = Column(String(200), nullable=True)                    # 병용금기 성분명 B
    prohibition_reason = Column(Text, nullable=True)                          # 금기 내용 (경고 메시지)
    grade = Column(String(20), nullable=True)                                 # 등급 (위험도)
    notice_date = Column(Date, nullable=True)                                 # 고시 일자

    created_at = Column(DateTime, nullable=False, default=func.now())          # 등록일시

    __table_args__ = (
        UniqueConstraint("dur_seq", "ingredient_code_a", "ingredient_code_b", name="uq_dur_ingredient"),
    )