# app/api/v1/users.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.user import (
    InitialProfileRequest, InitialProfileResponse,
    UserProfileResponse, UpdateProfileRequest, UpdateProfileResponse,
    NicknameResponse, HealthGoalsResponse, UpdateHealthGoalsRequest,
    SocialAccountsResponse, DeleteAccountRequest
)
from app.services import user_service
from app.utils.auth import get_current_user
from app.models.user import User

router = APIRouter()


@router.post("/profile/initial", response_model=InitialProfileResponse, status_code=201)
def set_initial_profile(request: InitialProfileRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return user_service.set_initial_profile(current_user.id, request, db)


@router.get("/me", response_model=UserProfileResponse)
def get_my_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return user_service.get_my_profile(current_user.id, db)


@router.put("/me", response_model=UpdateProfileResponse)
def update_my_profile(request: UpdateProfileRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return user_service.update_my_profile(current_user.id, request, db)


@router.delete("/me")
def delete_my_account(request: DeleteAccountRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return user_service.delete_my_account(current_user.id, request.password, db)


@router.get("/me/nickname", response_model=NicknameResponse)
def generate_nickname(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return {"nickname": user_service.generate_nickname(db)}


@router.get("/me/health-goals", response_model=HealthGoalsResponse)
def get_health_goals(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return user_service.get_health_goals(current_user.id, db)


@router.put("/me/health-goals", response_model=HealthGoalsResponse)
def update_health_goals(request: UpdateHealthGoalsRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return user_service.update