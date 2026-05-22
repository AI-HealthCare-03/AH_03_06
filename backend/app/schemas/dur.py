# app/schemas/dur.py
# DUR 통합 안전성 검사 API 요청/응답 스키마.
#
# 엔드포인트: POST /api/v1/dur/check
# 서비스   : app.services.dur_service.safety_check_all

from pydantic import BaseModel, Field


# ===== 요청 =====

class MedicationItem(BaseModel):
    """검사 대상 약 1건의 필수 정보 (03 노트북 medications 원소 형식 동일)."""
    item_seq: int = Field(..., description="품목일련번호 (식약처 제품 식별자)")
    daily_amount: float = Field(..., description="1일 복용량 (수치)")
    dose_unit: str = Field(..., description="복용 단위 (예: '정', 'mg')")


class Patient(BaseModel):
    """환자 컨텍스트. 노인주의 검증에 필요. None 가능."""
    age: int = Field(..., description="만 나이. 65 이상이면 노인주의 INFO 활성")


class DurCheckRequest(BaseModel):
    """DUR 검사 요청 본문."""
    medications: list[MedicationItem] = Field(default_factory=list)
    patient: Patient | None = None


# ===== 응답 =====

class DurSummary(BaseModel):
    """알림 개수 요약 (safety_check_all summary 그대로)."""
    total_alerts: int
    block_count: int
    warn_count: int
    info_count: int


class DurCheckResponse(BaseModel):
    """DUR 검사 응답.

    safety_check_all 반환 dict 와 1:1 매핑.
    각 alert 원소는 검증 종류별 키 구성이 달라 list[dict] 로 받는다
    (공통 키: level / type / message, 카테고리별 추가 필드).
    """
    duplicates_ingredient: list[dict] = Field(default_factory=list)   # BLOCK 동일성분
    duplicates_efficacy: list[dict] = Field(default_factory=list)     # WARN 효능군 중복
    elderly_cautions: list[dict] = Field(default_factory=list)        # INFO 노인주의
    dose_exceeded: list[dict] = Field(default_factory=list)           # WARN 1일 최대량 초과
    recall_warnings: list[dict] = Field(default_factory=list)         # BLOCK 회수약
    summary: DurSummary
    disclaimer: str
