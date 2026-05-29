# app/api/v1/sleep_guides.py
# 수면 가이드 API — 생성/조회/목록/삭제 (medication_guides 패턴 미러링)

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.utils.auth import get_current_user
from app.schemas.sleep_guide import (
    SleepGenerateRequest,
    SleepGenerateResponse,
    SleepGuideSchema,
    SleepGuideListResponse,
    DeleteSleepGuideResponse,
)
from app.services import sleep_guide_service

router = APIRouter()


# POST /api/v1/sleep_guides/generate - 수면 가이드 생성 (async, sync 처리)
@router.post("/generate", response_model=SleepGenerateResponse, status_code=201)
async def generate_sleep_guide(
    request: SleepGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await sleep_guide_service.generate_sleep_guide(
        request, user_id=current_user.id, db=db
    )


# GET /api/v1/sleep_guides/caffeine-types - 카페인 음료 마스터 (입력 폼용)
# 주의: /{guide_id} 보다 먼저 정의해야 "caffeine-types" 가 guide_id 로 매칭되지 않음
@router.get("/caffeine-types")
def list_caffeine_types(db: Session = Depends(get_db)):
    return sleep_guide_service.list_caffeine_types(db)


# GET /api/v1/sleep_guides/{guide_id} - 단건 조회
@router.get("/{guide_id}", response_model=SleepGuideSchema)
def get_sleep_guide(
    guide_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return sleep_guide_service.get_sleep_guide(guide_id, user_id=current_user.id, db=db)


# GET /api/v1/sleep_guides - 목록 조회
@router.get("", response_model=SleepGuideListResponse)
def list_sleep_guides(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return sleep_guide_service.list_sleep_guides(user_id=current_user.id, db=db)


# DELETE /api/v1/sleep_guides/{guide_id} - 삭제
@router.delete("/{guide_id}", response_model=DeleteSleepGuideResponse)
def delete_sleep_guide(
    guide_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return sleep_guide_service.delete_sleep_guide(guide_id, user_id=current_user.id, db=db)
