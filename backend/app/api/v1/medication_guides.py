# api/v1/medication_guides.py
import threading
from typing import Any

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.guide import (
    GenerateGuideRequest,
    GenerateGuideResponse,
    GuideSection,
    MedicationGuideSchema,
    GuideListResponse,
    DeleteGuideResponse,
)
from app.services import guide_service
from app.services.llm_service import generate_guide_for_drug_async
from app.utils.auth import get_current_user
from app.utils.rag import get_chroma_medication_client
from app.models.user import User
from app.limiter import limiter

router = APIRouter()

_drug_list_cache: list[dict[str, str]] | None = None
_drug_list_lock = threading.Lock()  # 콜드 빌드 중복 스캔 방지 (동시 첫 요청 직렬화)
_DRUG_SOURCE_COLLECTIONS = ("drug_info_rag", "drug_detail_rag")


def _get_drug_list() -> list[dict[str, str]]:
    global _drug_list_cache
    if _drug_list_cache is not None:
        return _drug_list_cache
    with _drug_list_lock:
        # 락 대기 중 다른 스레드가 이미 빌드했으면 그대로 재사용
        if _drug_list_cache is not None:
            return _drug_list_cache
        client = get_chroma_medication_client()
        seen: dict[str, str] = {}
        BATCH = 1000
        for coll_name in _DRUG_SOURCE_COLLECTIONS:
            try:
                coll = client.get_collection(coll_name)
            except Exception:
                continue
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


def warm_drug_list_cache() -> None:
    """백엔드 시작 시 백그라운드로 약품 목록 캐시를 미리 빌드 (콜드 스타트 제거)."""
    try:
        _get_drug_list()
    except Exception:
        pass


class GuidePreviewRequest(BaseModel):
    item_seq: str
    drug_name: str = ""
    user_query: str | None = None
    patient: dict[str, Any] | None = None
    safety: dict[str, Any] | None = None
    top_k: int = 3


class GuidePreviewResponse(BaseModel):
    drug_name: str
    key_point: str | None = None
    sections: list[GuideSection] = []
    safety_note: str | None = None
    fallback_message: str | None = None
    is_fallback: bool
    disclaimer: str
    references: list[str] = []
    safety_block: str | None = None


class DrugSuggestItem(BaseModel):
    item_seq: str
    drug_name: str


class DrugSuggestResponse(BaseModel):
    drugs: list[DrugSuggestItem]
    total: int


# POST /api/v1/medication_guides/generate
@router.post("/generate", response_model=GenerateGuideResponse, status_code=201)
@limiter.limit("5/minute")
async def request_medication_guide_generation(
    request: Request,
    body: GenerateGuideRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await guide_service.request_guide_generation(
        body, user_id=current_user.id, db=db
    )


# GET /api/v1/medication_guides/drug-suggest
@router.get("/drug-suggest", response_model=DrugSuggestResponse)
def drug_suggest(q: str = "", limit: int = 20):
    drugs = _get_drug_list()
    total = len(drugs)
    if q.strip():
        q_lower = q.strip().lower()
        drugs = [d for d in drugs if q_lower in d["drug_name"].lower()]
    return {"drugs": drugs[:limit], "total": total}


# GET /api/v1/medication_guides/{guide_id}
@router.get("/{guide_id}", response_model=MedicationGuideSchema)
def get_medication_guide(
    guide_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return guide_service.get_medication_guide(guide_id, user_id=current_user.id, db=db)


# GET /api/v1/medication_guides
@router.get("", response_model=GuideListResponse)
def list_medication_guides(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return guide_service.list_medication_guides(user_id=current_user.id, db=db)


# DELETE /api/v1/medication_guides/{guide_id}
@router.delete("/{guide_id}", response_model=DeleteGuideResponse)
def delete_medication_guide(
    guide_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return guide_service.delete_medication_guide(guide_id, user_id=current_user.id, db=db)


# POST /api/v1/medication_guides/preview
@router.post("/preview", response_model=GuidePreviewResponse)
@limiter.limit("5/minute")
async def preview_medication_guide(request: Request, body: GuidePreviewRequest):
    return await generate_guide_for_drug_async(
        item_seq=body.item_seq,
        drug_name=body.drug_name,
        user_query=body.user_query,
        patient=body.patient,
        safety=body.safety,
        top_k=body.top_k,
    )