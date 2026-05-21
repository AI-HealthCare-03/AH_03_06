# app/models/dur_concurrent_product.py
# DUR_CONCURRENT_PRODUCT 테이블 모델
# 품목 단위 병용금기 페어 (식약처 DUR 품목 데이터, 약 40만 행)

from sqlalchemy import Column, BigInteger, Integer, String, Text, Date, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from app.database import Base


class DurConcurrentProduct(Base):
    """품목 단위 병용금기 테이블"""
    __tablename__ = "dur_concurrent_product"

    id = Column(BigInteger, primary_key=True, autoincrement=True)             # 고유 ID
    dur_seq = Column(Integer, nullable=False)                                 # DUR 일련번호 (원본 식별자)
    dur_type = Column(String(50), nullable=False)                             # DUR 유형
    item_seq_a = Column(BigInteger, nullable=False)                           # 품목일련번호 A
    item_name_a = Column(String(200), nullable=True)                          # 품목명 A
    item_seq_b = Column(BigInteger, nullable=False)                           # 병용금기 품목기준코드 B
    item_name_b = Column(String(200), nullable=True)                          # 병용금기 품목명 B
    prohibition_reason = Column(Text, nullable=True)                          # 금기 내용 (경고 메시지)
    grade = Column(String(20), nullable=True)                                 # 등급
    notice_date = Column(Date, nullable=True)                                 # 고시 일자

    created_at = Column(DateTime, nullable=False, default=func.now())          # 등록일시

    __table_args__ = (
        UniqueConstraint("dur_seq", "item_seq_a", "item_seq_b", name="uq_dur_product"),
    )