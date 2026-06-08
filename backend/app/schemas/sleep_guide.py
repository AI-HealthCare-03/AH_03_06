# app/schemas/sleep_guide.py
# 수면 가이드 요청/응답 스키마

import re
from typing import Optional

from pydantic import BaseModel, Field, field_validator

_TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


# 생성 요청

class CaffeineEntry(BaseModel):
    caffeine_drink_type_id: int
    cups: int                      # 1 이상. 0잔은 프론트에서 제외 권장


class SleepGenerateRequest(BaseModel):
    # 수면 시각 — "HH:MM" 24시간 형식
    weekday_bedtime: str = Field(..., examples=["23:30"])
    weekday_wakeup: str = Field(..., examples=["07:00"])
    weekend_bedtime: str = Field(..., examples=["00:30"])
    weekend_wakeup: str = Field(..., examples=["08:30"])

    # 단축 수면 설문 5문항 (각 0~3)
    brief_survey_q1: int
    brief_survey_q2: int
    brief_survey_q3: int
    brief_survey_q4: int
    brief_survey_q5: int

    # ESS 졸림 척도 8문항 (선택, 전부 입력 or 전부 생략)
    ess_q1: Optional[int] = None
    ess_q2: Optional[int] = None
    ess_q3: Optional[int] = None
    ess_q4: Optional[int] = None
    ess_q5: Optional[int] = None
    ess_q6: Optional[int] = None
    ess_q7: Optional[int] = None
    ess_q8: Optional[int] = None

    # 카페인 음료 (선택)
    caffeine_entries: list[CaffeineEntry] = []

    # 수면 방해 원인 (DB 저장 X, LLM 컨텍스트로만 활용 — 시안 8개 라벨)
    disturbance_causes: list[str] = []

    @field_validator("weekday_bedtime", "weekday_wakeup", "weekend_bedtime", "weekend_wakeup")
    def validate_time_format(cls, v):
        if not _TIME_RE.match(v.strip()):
            raise ValueError("invalid_time_format")
        return v.strip()


class SleepGenerateResponse(BaseModel):
    detail: str          # "sleep_guide_created"
    guide_id: int        # 생성된 가이드 ID (바로 GET 조회 가능)


# 단건 조회 응답

class SleepGuideSchema(BaseModel):
    guide_id: int

    # 출력 7섹션
    key_point: Optional[str] = None
    today_actions: Optional[str] = None
    weekly_goal: Optional[str] = None
    coping_strategy: Optional[str] = None
    lifestyle_adjustment: Optional[str] = None
    consultation_recommendation: Optional[str] = None
    next_checkup_guide: Optional[str] = None

    # 분석 결과
    sleep_hours_avg: Optional[float] = None
    rhythm_diff_hours: Optional[float] = None
    caffeine_mg_daily: Optional[int] = None
    brief_survey_total: int
    ess_score: Optional[int] = None
    sleep_hours_class: int
    rhythm_diff_class: int
    brief_survey_class: int
    ess_class: Optional[int] = None
    overall_status: int                       # 0정상/1주의/2위험
    expected_improvements: Optional[list] = None
    consultation_required: bool
    consultation_reasons: Optional[list] = None
    is_fallback: bool

    created_at: str
    disclaimer: str
    references: list[str] = []                # RAG 참고 임상지침 title (정션)


# 목록 조회 응답

class SleepGuideListItem(BaseModel):
    guide_id: int
    overall_status: int
    sleep_hours_avg: Optional[float] = None
    key_point: Optional[str] = None           # 발췌 (목록 카드용)
    is_fallback: bool
    created_at: str


class SleepGuideListResponse(BaseModel):
    guides: list[SleepGuideListItem]
    total: int


# 삭제 응답

class DeleteSleepGuideResponse(BaseModel):
    detail: str          # "sleep_guide_deleted"
