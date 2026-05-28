# app/models/sleep_survey.py
# 수면 가이드 생성 시점의 일회성 설문 응답 + 카페인 정션

from sqlalchemy import Column, BigInteger, SmallInteger, Time, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class SleepSurveyResponse(Base):
    """가이드 받기 시점 입력: 주중·주말 취침/기상 4종 + 단축 5문항 + ESS 8문항(선택).

    SLEEP_INFO(회원가입 평소 정보)와 분리한 이유:
      - SLEEP_INFO 는 1:1 (현재 상태만)
      - 본 테이블은 1:N (가이드 생성마다 누적, 이력 보존)
    """
    __tablename__ = "sleep_survey_response"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("user.id"), nullable=False)

    # 수면 시각 — 자동 파생: 평균 수면시간, 사회적 시차
    weekday_bedtime = Column(Time, nullable=False)
    weekday_wakeup = Column(Time, nullable=False)
    weekend_bedtime = Column(Time, nullable=False)
    weekend_wakeup = Column(Time, nullable=False)

    # 단축 수면 설문 5문항 (PSQI-K 기반 자체 단축형, 각 0~3)
    brief_survey_q1 = Column(SmallInteger, nullable=False)  # 입면 지연
    brief_survey_q2 = Column(SmallInteger, nullable=False)  # 중간 각성
    brief_survey_q3 = Column(SmallInteger, nullable=False)  # 조기 각성
    brief_survey_q4 = Column(SmallInteger, nullable=False)  # 전반적 수면 질
    brief_survey_q5 = Column(SmallInteger, nullable=False)  # 주간 지장

    # ESS 졸림 척도 8문항 (q5 ≥ 2점일 때 권유). 8개 전부 NULL or 전부 NOT NULL 이어야 함 (app 레벨 검증)
    ess_q1 = Column(SmallInteger, nullable=True)
    ess_q2 = Column(SmallInteger, nullable=True)
    ess_q3 = Column(SmallInteger, nullable=True)
    ess_q4 = Column(SmallInteger, nullable=True)
    ess_q5 = Column(SmallInteger, nullable=True)
    ess_q6 = Column(SmallInteger, nullable=True)
    ess_q7 = Column(SmallInteger, nullable=True)
    ess_q8 = Column(SmallInteger, nullable=True)

    created_at = Column(DateTime, nullable=False, default=func.now())

    caffeine_entries = relationship(
        "SleepSurveyCaffeine",
        back_populates="survey_response",
        cascade="all, delete-orphan",
    )


class SleepSurveyCaffeine(Base):
    """설문 응답에 첨부되는 카페인 음료 잔수 (N:M 정션). 0잔은 행 미생성."""
    __tablename__ = "sleep_survey_caffeine"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    survey_response_id = Column(BigInteger, ForeignKey("sleep_survey_response.id"), nullable=False)
    caffeine_drink_type_id = Column(BigInteger, ForeignKey("caffeine_drink_type.id"), nullable=False)
    cups = Column(SmallInteger, nullable=False)

    survey_response = relationship("SleepSurveyResponse", back_populates="caffeine_entries")
    drink_type = relationship("CaffeineDrinkType")
