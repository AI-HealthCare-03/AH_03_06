# app/services/guide_service.py
# 복약 가이드 서비스 (Phase 1: Stub)
#
# 4개 엔드포인트 각각에 대응하는 함수 4개:
#   request_guide_generation()  → POST   /api/v1/medication_guides/generate
#   get_medication_guide(id)    → GET    /api/v1/medication_guides/{id}
#   list_medication_guides()    → GET    /api/v1/medication_guides
#   delete_medication_guide(id) → DELETE /api/v1/medication_guides/{id}
#
# Phase 1: 모두 하드코딩된 가짜 데이터 반환 (와이어링 검증용)
# Phase 2: 04 노트북 RAG·LLM 통합 + MedicationGuide 모델 DB 연동

from datetime import datetime

from app.schemas.guide import (
    GenerateGuideRequest,
    GenerateGuideResponse,
    MedicationGuideSchema,
    GuideListResponse,
    DeleteGuideResponse,
)


# ===== Phase 1 Stub 상수 =====

STUB_DISCLAIMER = (
    "본 서비스는 일반적인 정보 제공 목적이며, 의학적 진단·처방·치료를 "
    "대체하지 않습니다. 실제 복약 결정은 반드시 의사·약사와 상담하시기 바랍니다."
)

# Phase 1 가짜 가이드 본문 (Phase 2에서 04 노트북 LLM 출력으로 교체)
STUB_MAIN_CONTENT = (
    "[Phase 1 stub 응답]\n\n"
    "아모잘탄정 5mg은 고혈압 치료에 사용되는 복합제로, "
    "암로디핀과 로사르탄 성분이 결합되어 있습니다.\n\n"
    "- 효능: 혈압을 낮추는 데 사용됩니다.\n"
    "- 복용법: 매일 같은 시각에 1정 복용하세요.\n"
    "- 주의: 자몽주스와 함께 드시지 마세요.\n"
    "- 부작용: 어지러움, 부종 등이 나타날 수 있습니다.\n"
    "- 보관: 직사광선을 피해 실온 보관하세요.\n"
)

STUB_REFERENCES = "식품의약품안전처 의약품개요정보(e약은요). 2026 조회."

STUB_SAFETY_RECOMMENDATIONS = (
    "복용 전 의사·약사와 상의하세요. "
    "다른 약과 같이 드시는 경우 상호작용을 확인해주세요."
)


def _make_stub_guide(guide_id: int = 1) -> MedicationGuideSchema:
    """Phase 1 stub 가이드 1건 생성 (단건 조회·목록 조회에서 공통 사용)"""
    return MedicationGuideSchema(
        guide_id=guide_id,
        safety_block=None,                      # Phase 1: 차단 케이스 없음
        safety_warn=None,                       # Phase 1: 경고 케이스 없음
        safety_info="65세 이상은 노인주의 약품에 해당합니다.",  # 정보 안내 예시
        main_content=STUB_MAIN_CONTENT,
        references=STUB_REFERENCES,
        safety_recommendations=STUB_SAFETY_RECOMMENDATIONS,
        is_fallback=False,                      # Phase 1: 게이트 발동 X
        created_at=datetime.now().isoformat(timespec="seconds"),
        disclaimer=STUB_DISCLAIMER,
        medication_id=42,
        drug_name="아모잘탄정 5mg",
    )


# ===== 1. 생성 요청 (POST /generate) =====

def request_guide_generation(
    request: GenerateGuideRequest,
) -> GenerateGuideResponse:
    """복약 가이드 생성 요청 (Phase 1: Stub)

    Phase 1: 실제 생성 없이 "생성 중" 메시지만 즉시 응답.
    Phase 2 확장 예정:
    - medication_id로 처방 약 조회 및 본인 약 검증
    - 03 노트북 safety_check_all 호출 (BLOCK/WARN/INFO 결정)
    - 04 노트북 RAG·LLM 파이프라인 호출 (게이트 포함)
    - MedicationGuide 모델로 DB 저장
    - 백그라운드 처리 (Redis Stream 또는 FastAPI BackgroundTasks)
    """
    return GenerateGuideResponse(
        detail="medication_guide_generating"
    )


# ===== 2. 단건 조회 (GET /{id}) =====

def get_medication_guide(
    guide_id: int,
) -> MedicationGuideSchema:
    """복약 가이드 단건 조회 (Phase 1: Stub)

    Phase 1: guide_id 무시하고 동일한 가짜 가이드 반환.
    Phase 2: MedicationGuide.id로 DB 조회 + 본인 가이드 권한 검증.
    """
    return _make_stub_guide(guide_id=guide_id)


# ===== 3. 목록 조회 (GET /) =====

def list_medication_guides() -> GuideListResponse:
    """복약 가이드 목록 조회 (Phase 1: Stub)

    Phase 1: 가짜 가이드 1개를 list로 반환.
    Phase 2: MedicationGuide.user_id로 본인 가이드 전체 조회 (created_at DESC).
    """
    return GuideListResponse(
        guides=[_make_stub_guide(guide_id=1)],
        total=1,
    )


# ===== 4. 삭제 (DELETE /{id}) =====

def delete_medication_guide(
    guide_id: int,
) -> DeleteGuideResponse:
    """복약 가이드 삭제 (Phase 1: Stub)

    Phase 1: 실제 삭제 없이 성공 메시지만 반환.
    Phase 2: MedicationGuide.id 조회 + 본인 가이드 권한 검증 후 DELETE.
    """
    return DeleteGuideResponse(
        detail="medication_guide_deleted"
    )