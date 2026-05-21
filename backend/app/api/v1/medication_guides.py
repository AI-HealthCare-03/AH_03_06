# api/v1/medication_guides.py
# 복약 가이드 관련 엔드포인트 담당
# 가이드 생성 요청 (비동기 패턴)
# 가이드 단건/목록 조회
# 가이드 삭제

from fastapi import APIRouter, Depends
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
from app.utils.auth import get_current_user
from app.models.user import User

router = APIRouter()


# POST /api/v1/medication_guides/generate - 복약 가이드 생성 요청
@router.post("/generate", response_model=GenerateGuideResponse, status_code=202)
def request_medication_guide_generation(
    request: GenerateGuideRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return guide_service.request_guide_generation(request)


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