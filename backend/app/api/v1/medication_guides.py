# api/v1/medication_guides.py
# 복약 가이드 관련 엔드포인트 담당
# 가이드 생성 요청 (비동기 패턴)
# 가이드 단건/목록 조회
# 가이드 삭제
# 가이드 미리보기 (데모, item_seq 직접 입력)
# 자동완성 (데모, drug_name → item_seq)

import json
from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.guide import (
    GenerateGuideRequest,
    GenerateGuideResponse,
    MedicationGuideSchema,
    GuideListResponse,
    DeleteGuideResponse,
)
from app.services import guide_service
from app.services.llm_service import (
    generate_guide_for_drug,
    generate_guide_for_drug_async,
    generate_guide_for_drug_stream,
)
from app.utils.auth import get_current_user
from app.utils.rag import get_chroma_client
from app.models.user import User

router = APIRouter()


# 데모 자동완성용 약품 캐시 — drug_info_rag + drug_detail_rag 메타데이터를
# (item_seq, drug_name) dedupe (양쪽 존재 시 먼저 등록된 이름 유지)

_drug_list_cache: list[dict[str, str]] | None = None

_DRUG_SOURCE_COLLECTIONS = ("drug_info_rag", "drug_detail_rag")


def _get_drug_list() -> list[dict[str, str]]:
    global _drug_list_cache
    if _drug_list_cache is None:
        client = get_chroma_client()
        seen: dict[str, str] = {}
        # chroma SQLite IN(...) 변수 한도 회피 — 페이지네이션 fetch
        BATCH = 1000
        for coll_name in _DRUG_SOURCE_COLLECTIONS:
            try:
                coll = client.get_collection(coll_name)
            except Exception:
                continue  # 컬렉션 미존재 환경도 허용
            offset = 0
            while True:
                try:
                    res = coll.get(include=["metadatas"], limit=BATCH, offset=offset)
                except Exception:
                    break
                metas = res.get("metadatas") or []
                if not metas:
                    break
                for meta in metas:
                    seq = meta.get("item_seq")
                    name = meta.get("drug_name")
                    if seq and name and seq not in seen:
                        seen[seq] = name
                if len(metas) < BATCH:
                    break
                offset += BATCH
        _drug_list_cache = sorted(
            ({"item_seq": seq, "drug_name": name} for seq, name in seen.items()),
            key=lambda d: d["drug_name"],
        )
    return _drug_list_cache


# 데모/검증용 임시 스키마. 추후 medication_id 흐름 통합 시 정식 스키마로 흡수.

class GuidePreviewRequest(BaseModel):
    item_seq: str
    drug_name: str = ""
    user_query: str | None = None
    patient: dict[str, Any] | None = None
    safety: dict[str, Any] | None = None
    top_k: int = 3


class GuidePreviewResponse(BaseModel):
    drug_name: str
    main_content: str
    is_fallback: bool
    disclaimer: str
    references: str | None = None
    safety_block: str | None = None
    safety_warn: str | None = None
    safety_info: str | None = None
    safety_recommendations: str | None = None


class DrugSuggestItem(BaseModel):
    item_seq: str
    drug_name: str


class DrugSuggestResponse(BaseModel):
    drugs: list[DrugSuggestItem]
    total: int  # 필터 적용 전 전체 약품 수 (사용자에게 검색 가능 범위 표시용)


# POST /api/v1/medication_guides/generate - 복약 가이드 생성 요청
@router.post("/generate", response_model=GenerateGuideResponse, status_code=202)
def request_medication_guide_generation(
    request: GenerateGuideRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return guide_service.request_guide_generation(request)


# GET /api/v1/medication_guides/drug-suggest - 데모 자동완성 검색
# (static path 라 /{guide_id} 보다 먼저 정의)
@router.get("/drug-suggest", response_model=DrugSuggestResponse)
def drug_suggest(q: str = "", limit: int = 20):
    drugs = _get_drug_list()
    total = len(drugs)
    if q.strip():
        q_lower = q.strip().lower()
        drugs = [d for d in drugs if q_lower in d["drug_name"].lower()]
    return {"drugs": drugs[:limit], "total": total}


# GET /api/v1/medication_guides/{guide_id} - 복약 가이드 단건 조회
@router.get("/{guide_id}", response_model=MedicationGuideSchema)
def get_medication_guide(
    guide_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return guide_service.get_medication_guide(guide_id)


# GET /api/v1/medication_guides - 복약 가이드 목록 조회
@router.get("", response_model=GuideListResponse)
def list_medication_guides(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return guide_service.list_medication_guides()


# DELETE /api/v1/medication_guides/{guide_id} - 복약 가이드 삭제
@router.delete("/{guide_id}", response_model=DeleteGuideResponse)
def delete_medication_guide(
    guide_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return guide_service.delete_medication_guide(guide_id)


# POST /api/v1/medication_guides/preview - 데모 가이드 생성 (item_seq 직접 입력)
# (인증·DB·medication_id 흐름 우회. 추후 정식 medication_id 흐름과 통합 시 제거)
# async 전환 — 임베딩 3회(drug_info/drug_detail/guideline) 동시 호출 + chat completion await.
# 롤백 시: async/await 두 단어 제거 + generate_guide_for_drug_async → generate_guide_for_drug.
@router.post("/preview", response_model=GuidePreviewResponse)
async def preview_medication_guide(request: GuidePreviewRequest):
    payload = await generate_guide_for_drug_async(
        item_seq=request.item_seq,
        drug_name=request.drug_name,
        user_query=request.user_query,
        patient=request.patient,
        safety=request.safety,
        top_k=request.top_k,
    )
    return payload


# POST /api/v1/medication_guides/preview-stream - 데모 가이드 NDJSON 스트림.
# 응답 라인 시퀀스: meta(1) → token(N) → done(1). 각 라인은 단일 JSON 객체 + '\n'.
#   meta : {"type":"meta", drug_name, is_fallback, safety_block, disclaimer, references, safety_*}
#   token: {"type":"token","text":"..."}    (정상: chat completion 청크 반복 / 거절: FALLBACK_TEXT 한 번)
#   done : {"type":"done"}
# 기존 /preview JSON 단발은 그대로 보존 — 프론트는 호출 URL만 갈아끼우면 됨.
@router.post("/preview-stream")
async def preview_medication_guide_stream(request: GuidePreviewRequest):
    async def ndjson_iter():
        async for event in generate_guide_for_drug_stream(
            item_seq=request.item_seq,
            drug_name=request.drug_name,
            user_query=request.user_query,
            patient=request.patient,
            safety=request.safety,
            top_k=request.top_k,
        ):
            yield json.dumps(event, ensure_ascii=False) + "\n"

    return StreamingResponse(ndjson_iter(), media_type="application/x-ndjson")