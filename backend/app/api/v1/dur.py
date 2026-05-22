# app/api/v1/dur.py
# DUR 통합 안전성 검사 엔드포인트.
#
# Phase 1: 클라이언트가 약 목록을 body 로 직접 보낸다 (medication DB 미연동, B안).
# Phase 2(다음): user-medication 모델·DB 연동 후 user_id로 약 목록 자동 조회.

from fastapi import APIRouter, Depends

from app.schemas.dur import DurCheckRequest, DurCheckResponse, DurSummary
from app.services import dur_service
from app.utils.auth import get_current_user
from app.models.user import User


router = APIRouter()


# DUR 검사 면책 — 노트북 한계를 명시 (사용자 요청 문구 그대로)
DUR_DISCLAIMER = (
    "본 검사는 식약처 공공데이터(품목허가목록·DUR·1일최대투여량·회수약) 기반 "
    "교육·연구용 참고 정보이며, 1일 최대량 커버리지 48%·단위 변환 미구현·"
    "DUR 8유형 중 5개만 구현 등의 한계가 있습니다. "
    "실제 복약 결정은 의·약사 판단을 따라야 합니다."
)


# POST /api/v1/dur/check - 5겹 규칙 기반 통합 안전성 검사
@router.post("/check", response_model=DurCheckResponse)
def dur_check(
    request: DurCheckRequest,
    current_user: User = Depends(get_current_user),
):
    """사용자가 복용 중인 여러 약을 한 번에 받아 5겹 규칙 검증.

    검증 순서:
      1. 동일성분 중복     (BLOCK)
      2. 효능군 중복       (WARN)
      3. 노인주의          (INFO, patient.age ≥ 65 일 때만)
      4. 1일 최대량 초과   (WARN)
      5. 회수약            (BLOCK)

    TODO (04 RAG 통합 시점):
        본 함수가 반환하는 safety dict 를 04 RAG 파이프라인의
        prepare_rag_context(safety=...) 인자로 그대로 전달하는 흐름.
    """
    # Pydantic 모델 → dict (서비스 함수가 노트북 시그니처대로 dict 받음)
    meds = [m.model_dump() for m in request.medications]
    patient = request.patient.model_dump() if request.patient else None

    result = dur_service.safety_check_all(meds, patient)

    return DurCheckResponse(
        duplicates_ingredient=result['duplicates_ingredient'],
        duplicates_efficacy=result['duplicates_efficacy'],
        elderly_cautions=result['elderly_cautions'],
        dose_exceeded=result['dose_exceeded'],
        recall_warnings=result['recall_warnings'],
        summary=DurSummary(**result['summary']),
        disclaimer=DUR_DISCLAIMER,
    )
