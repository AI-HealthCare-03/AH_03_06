# app/schemas/guide.py
# 복약 가이드 API 요청/응답 스키마
#
# 4개 엔드포인트 공통 사용:
#   POST   /api/v1/medication_guides/generate    (생성 요청)
#   GET    /api/v1/medication_guides/{id}        (단건 조회)
#   GET    /api/v1/medication_guides             (목록 조회)
#   DELETE /api/v1/medication_guides/{id}        (삭제)

from pydantic import BaseModel


# POST /api/v1/medication_guides/generate

class GenerateGuideRequest(BaseModel):
    """복약 가이드 생성 요청 본문

    medication_id: 처방 약 고유 ID (사용자가 등록한 복용약 중 하나)
    refresh: 캐시 무시하고 재생성 여부 (기본 false)
    """
    medication_id: int
    refresh: bool = False


class GenerateGuideResponse(BaseModel):
    """복약 가이드 생성 응답 (블로킹).

    POST 가 생성·저장까지 마치고 guide_id 를 반환하면, 프론트는 그 id 로 GET 조회한다.
    """
    detail: str       # 예: "medication_guide_created"
    guide_id: int | None = None   # 블로킹 생성 완료 후 GET 이동용


# GET /api/v1/medication_guides/{id}
# GET /api/v1/medication_guides (목록 항목 공통)

class GuideSection(BaseModel):
    """구조화 본문 섹션 (Phase B). quote_raw 는 게이트 통과 후 제외 — 화면엔 quote_display 만."""
    title: str
    scope: str                  # 적용 대상 (전체 / 간기능부전 환자 / 투여 중지 후 …)
    gloss: str
    quote_display: str
    source: str


class MedicationGuideSchema(BaseModel):
    """복약 가이드 단건 본문 (단건 조회 / 목록 항목 공통)."""

    # ----- DB 저장 컬럼 -----
    guide_id: int                              # PK
    safety_block: str | None = None            # 차단 안내 (동일성분·회수약)
    safety_warn: str | None = None             # 경고 안내 (최대량 초과)
    safety_info: str | None = None             # 정보 안내 (노인주의 등)
    main_content: str                          # 본문(구조화 JSON 직렬화 저장; 레거시는 마크다운)
    references: list[str] = []                 # 검색된 출처 목록 (수면 SleepGuideSchema 와 동형)
    safety_recommendations: str | None = None  # 안전 권고
    is_fallback: bool                          # 환각 차단 회피 응답 여부
    created_at: str                            # ISO 형식 (예: 2026-05-20T15:30:00)

    # ----- 응답 시 추가 정보 (DB에는 저장하지 않음) -----
    disclaimer: str                            # 면책 안내 (법적 필수)

    # ----- 의약품 정보 (저장된 가이드 row 에서 채움) -----
    medication_id: int | None = None
    drug_name: str | None = None

    # ----- 구조화 본문 (Phase B) — main_content(JSON 직렬화)에서 디코드. 레거시(마크다운)면 비어 있음 -----
    key_point: str | None = None
    sections: list[GuideSection] = []
    safety_note: str | None = None
    fallback_message: str | None = None


class GuideListResponse(BaseModel):
    """복약 가이드 목록 응답

    사용자 본인의 모든 가이드 반환 (최신순 정렬 권장).
    """
    guides: list[MedicationGuideSchema]
    total: int


# DELETE /api/v1/medication_guides/{id}

class DeleteGuideResponse(BaseModel):
    """복약 가이드 삭제 응답 (200 OK)"""
    detail: str  # 예: "medication_guide_deleted"