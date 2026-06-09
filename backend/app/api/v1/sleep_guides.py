# app/api/v1/sleep_guides.py
from fastapi import APIRouter, Depends, Request
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
from app.limiter import limiter

router = APIRouter()


# POST /api/v1/sleep_guides/generate
@router.post("/generate", response_model=SleepGenerateResponse, status_code=201)
@limiter.limit("5/minute")
async def generate_sleep_guide(
    request: Request,
    body: SleepGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await sleep_guide_service.generate_sleep_guide(
        body, user_id=current_user.id, db=db
    )


# GET /api/v1/sleep_guides/caffeine-types
@router.get("/caffeine-types")
def list_caffeine_types(db: Session = Depends(get_db)):
    return sleep_guide_service.list_caffeine_types(db)


# GET /api/v1/sleep_guides/{guide_id}
@router.get("/{guide_id}", response_model=SleepGuideSchema)
def get_sleep_guide(
    guide_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return sleep_guide_service.get_sleep_guide(guide_id, user_id=current_user.id, db=db)


# GET /api/v1/sleep_guides
@router.get("", response_model=SleepGuideListResponse)
def list_sleep_guides(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return sleep_guide_service.list_sleep_guides(user_id=current_user.id, db=db)


# DELETE /api/v1/sleep_guides/{guide_id}
@router.delete("/{guide_id}", response_model=DeleteSleepGuideResponse)
def delete_sleep_guide(
    guide_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return sleep_guide_service.delete_sleep_guide(guide_id, user_id=current_user.id, db=db)