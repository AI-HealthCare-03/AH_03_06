# app/models/clinical_guideline.py
# 임상진료지침 마스터 — 수면/식이/운동/복약 가이드 공통 풀

from sqlalchemy import Column, BigInteger, String, SmallInteger, Boolean, DateTime
from sqlalchemy.sql import func
from app.database import Base


class ClinicalGuideline(Base):
    """RAG 파이프라인이 참고하는 임상진료지침 메타데이터.

    ChromaDB에는 본문 청크가, 본 테이블에는 문서 단위 메타가 들어감.
    가이드 종류별로 활성/비활성 토글 가능 (가이드 생성에서 제외).
    """
    __tablename__ = "clinical_guideline"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    publisher = Column(String(255), nullable=False)
    publication_year = Column(SmallInteger, nullable=True)
    guide_category = Column(SmallInteger, nullable=False)        # 0: sleep, 1: diet, 2: exercise, 3: medication
    chroma_collection = Column(String(100), nullable=True)       # ChromaDB 컬렉션명
    source_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=func.now())
