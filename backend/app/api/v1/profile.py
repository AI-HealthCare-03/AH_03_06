# app/api/v1/profile.py
# 프로필 관련 엔드포인트
# GET  /api/v1/profile/items    — 전체 프로필 목록 조회 (해금 여부 포함)
# POST /api/v1/profile/unlock   — 포인트로 프로필 해금
# PUT  /api/v1/profile/select   — 프로필 선택

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.profile import (
    ProfileItemListResponse,
    SelectProfileRequest,
    SelectProfileResponse,
)
from app.services import profile_service
from app.utils.auth import get_current_user
from app.models.user import User

router = APIRouter()


# GET /api/v1/profile/items
@router.get("/items", response_model=ProfileItemListResponse)
def get_profile_items(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return profile_service.get_profile_items(current_user.id, db)


# POST /api/v1/profile/unlock
@router.post("/unlock", response_model=SelectProfileResponse)
def unlock_profile_item(
    request: SelectProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return profile_service.unlock_profile_item(current_user.id, request.profile_item_id, db)


# PUT /api/v1/profile/select
@router.put("/select", response_model=SelectProfileResponse)
def select_profile_item(
    request: SelectProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return profile_service.select_profile_item(current_user.id, request.profile_item_id, db)