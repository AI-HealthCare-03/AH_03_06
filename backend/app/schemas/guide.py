# app/schemas/guide.py
# 복약 가이드 API 요청/응답 스키마
#
# 4개 엔드포인트 공통 사용:
#   POST   /api/v1/medication_guides/generate    (생성 요청)
#   GET    /api/v1/medication_guides/{id}        (단건 조회)
#   GET    /api/v1/medication_guides             (목록 조회)
#   DELETE /api/v1/medication_guides/{id}        (삭제)
#
# ERD 참조: 3.12 MEDICATION_GUIDE (5/19 확정)

from pydantic import BaseModel


# ===== POST /api/v1/medication_guides/generate =====

class GenerateGuideRequest(BaseModel):
    """복약 가이드 생성 요청 본문

    medication_id: 처방 약 고유 ID (사용자가 등록한 복용약 중 하나)
    refresh: 캐시 무시하고 재생성 여부 (기본 false)
    """
    medication_id: int
    refresh: bool = False


class GenerateGuideResponse(BaseModel):
    """복약 가이드 생성 요청 응답 (202 Accepted)

    팀 가이드 비동기 패턴 (식단/운동/수면 가이드와 동일):
    POST는 "생성 중" 메시지만 즉시 응답하고,
    실제 가이드 본문은 백그라운드 RAG·LLM 처리 완료 후
    GET 엔드포인트로 조회한다.
    """
    detail: str  # 예: "medication_guide_generating"


# ===== GET /api/v1/medication_guides/{id} =====
# ===== GET /api/v1/medication_guides (목록 항목 공통) =====

class MedicationGuideSchema(BaseModel):
    """복약 가이드 단건 본문 (ERD MEDICATION_GUIDE 컬럼 기반)

    단건 조회 응답 / 목록 응답 각 항목 / Phase 2에서 DB row 매핑 대상.
    """

    # ----- ERD 컬럼 (DB 저장) -----
    guide_id: int                              # ERD: id (PK)
    safety_block: str | None = None            # 차단 안내 (동일성분·회수약)
    safety_warn: str | None = None             # 경고 안내 (최대량 초과)
    safety_info: str | None = None             # 정보 안내 (노인주의 등)
    main_content: str                          # 가이드 본문 (발췌+보충, 필수)
    references: str | None = None              # 사용된 출처 (식약처·nedrug·학회)
    safety_recommendations: str | None = None  # 안전 권고
    is_fallback: bool                          # 환각 차단 회피 응답 여부
    created_at: str                            # ISO 형식 (예: 2026-05-20T15:30:00)

    # ----- 응답 시 추가 정보 (DB에는 저장하지 않음) -----
    disclaimer: str                            # 면책 안내 (NFR-501-2 법적 필수)

    # ----- 의약품 정보 (Phase 2: medication 테이블 JOIN으로 채움) -----
    medication_id: int | None = None
    drug_name: str | None = None


class GuideListResponse(BaseModel):
    """복약 가이드 목록 응답

    사용자 본인의 모든 가이드 반환 (최신순 정렬 권장).
    """
    guides: list[MedicationGuideSchema]
    total: int


# ===== DELETE /api/v1/medication_guides/{id} =====

class DeleteGuideResponse(BaseModel):
    """복약 가이드 삭제 응답 (200 OK)"""
    detail: str  # 예: "medication_guide_deleted"