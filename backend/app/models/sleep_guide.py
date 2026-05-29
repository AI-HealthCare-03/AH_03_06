# app/models/sleep_guide.py
# 수면 가이드 결과 + RAG 참고 가이드라인 정션

from sqlalchemy import (
    Column, BigInteger, SmallInteger, Integer, Text, Boolean, DateTime, ForeignKey, JSON
)
from sqlalchemy.types import DECIMAL
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class SleepGuide(Base):
    """LLM 생성 수면 가이드 결과. 7섹션 텍스트 + 4가지 항목별 분류 + 종합 위험 + 기대 개선치.

    S-801 화면의 ▶ 항목과 7개 텍스트 컬럼이 1:1 매핑됨.
    overall_status = 4항목 중 최고값 (FR-803-1).
    """
    __tablename__ = "sleep_guide"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("user.id"), nullable=False)
    survey_response_id = Column(BigInteger, ForeignKey("sleep_survey_response.id"), nullable=False)

    # 출력 7섹션 (S-801 ▶ 항목과 1:1)
    key_point = Column(Text, nullable=True)                       # ▶ 가장 중요한 포인트
    today_actions = Column(Text, nullable=True)                   # ▶ 오늘부터 할 일 3가지
    weekly_goal = Column(Text, nullable=True)                     # ▶ 이번 주 수면 목표
    coping_strategy = Column(Text, nullable=True)                 # ▶ 잠 안 올 때 대처
    lifestyle_adjustment = Column(Text, nullable=True)            # ▶ 생활습관 조정
    consultation_recommendation = Column(Text, nullable=True)     # ▶ 상담 권장 (조건부)
    next_checkup_guide = Column(Text, nullable=True)              # ▶ 다음 점검 안내

    # 분석 결과 수치
    sleep_hours_avg = Column(DECIMAL(3, 1), nullable=True)        # 가중평균 (주중×5 + 주말×2) / 7
    rhythm_diff_hours = Column(DECIMAL(3, 1), nullable=True)      # 사회적 시차
    caffeine_mg_daily = Column(Integer, nullable=True)            # 카페인 일일 합계 mg
    brief_survey_total = Column(SmallInteger, nullable=False)     # 단축 설문 합계 (0~15)
    ess_score = Column(SmallInteger, nullable=True)               # ESS 합계 (0~24, 미입력 NULL)

    # 4가지 분류 + 종합 (0: 정상, 1: 주의, 2: 위험)
    sleep_hours_class = Column(SmallInteger, nullable=False)
    rhythm_diff_class = Column(SmallInteger, nullable=False)
    brief_survey_class = Column(SmallInteger, nullable=False)
    ess_class = Column(SmallInteger, nullable=True)               # ESS 미입력 NULL
    overall_status = Column(SmallInteger, nullable=False)         # 4항목 중 최고값

    # 다변량 회귀 기반 기대 개선치 (카페인/흡연/음주/리듬 항목별)
    expected_improvements = Column(JSON, nullable=True)

    # 상담 권장 메타 (단축 설문 ≥11 / ESS ≥16 / 등 조건)
    consultation_required = Column(Boolean, nullable=False, default=False)
    consultation_reasons = Column(JSON, nullable=True)            # ["insomnia_suspected", "ess_high"] 등

    is_fallback = Column(Boolean, nullable=False, default=False)  # 3회 재생성 실패 시 TRUE
    created_at = Column(DateTime, nullable=False, default=func.now())

    survey_response = relationship("SleepSurveyResponse")
    guideline_links = relationship(
        "SleepGuideGuideline",
        back_populates="sleep_guide",
        cascade="all, delete-orphan",
    )


class SleepGuideGuideline(Base):
    """수면 가이드 ↔ 임상진료지침 N:M 정션. RAG 참고 이력 + 유사도 점수."""
    __tablename__ = "sleep_guide_guideline"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    sleep_guide_id = Column(BigInteger, ForeignKey("sleep_guide.id"), nullable=False)
    clinical_guideline_id = Column(BigInteger, ForeignKey("clinical_guideline.id"), nullable=False)
    relevance_score = Column(DECIMAL(4, 3), nullable=True)        # 0.000~1.000
    created_at = Column(DateTime, nullable=False, default=func.now())

    sleep_guide = relationship("SleepGuide", back_populates="guideline_links")
    clinical_guideline = relationship("ClinicalGuideline")
