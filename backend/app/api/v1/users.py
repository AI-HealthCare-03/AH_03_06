# app/api/v1/users.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.user import (
    InitialProfileRequest, InitialProfileResponse,
    UserProfileResponse, UpdateProfileRequest, UpdateProfileResponse,
    NicknameResponse, HealthGoalsResponse, UpdateHealthGoalsRequest,
    SocialAccountsResponse, NotificationSettingsResponse,
    DeleteAccountRequest
)
from app.services import user_service
from app.utils.auth import get_current_user
from app.models.user import User

router = APIRouter()


# POST /api/v1/users/profile/initial - 초기 개인정보 설정
@router.post("/profile/initial", response_model=InitialProfileResponse, status_code=201)
def set_initial_profile(
    request: InitialProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return user_service.set_initial_profile(current_user.id, request, db)


# GET /api/v1/users/me - 내 프로필 조회
@router.get("/me", response_model=UserProfileResponse)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return user_service.get_my_profile(current_user.id, db)


# PUT /api/v1/users/me - 내 프로필 수정
@router.put("/me", response_model=UpdateProfileResponse)
def update_my_profile(
    request: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return user_service.update_my_profile(current_user.id, request, db)


# DELETE /api/v1/users/me - 회원 탈퇴
@router.delete("/me")
def delete_my_account(
    request: DeleteAccountRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return user_service.delete_my_account(current_user.id, request.password, db)


# GET /api/v1/users/me/nickname - 닉네임 자동 생성
@router.get("/me/nickname", response_model=NicknameResponse)
def generate_nickname(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return {"nickname": user_service.generate_nickname(db)}


# GET /api/v1/users/me/health-goals - 건강 목표 조회
@router.get("/me/health-goals", response_model=HealthGoalsResponse)
def get_health_goals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return user_service.get_health_goals(current_user.id, db)


# PUT /api/v1/users/me/health-goals - 건강 목표 수정
@router.put("/me/health-goals", response_model=HealthGoalsResponse)
def update_health_goals(
    request: UpdateHealthGoalsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return user_service.update_health_goals(current_user.id, request, db)


# GET /api/v1/users/me/social - 소셜 로그인 연동 목록 조회
@router.get("/me/social", response_model=SocialAccountsResponse)
def get_social_accounts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return user_service.get_social_accounts(current_user.id, db)


# DELETE /api/v1/users/me/social/{provider} - 소셜 로그인 연동 해제
@router.delete("/me/social/{provider}")
def disconnect_social_account(
    provider: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return user_service.disconnect_social_account(current_user.id, provider, db)


# GET /api/v1/users/me/notifications - 알림 설정 조회
@router.get("/me/notifications", response_model=NotificationSettingsResponse)
def get_notification_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return user_service.get_notification_settings(current_user.id, db)


# PUT /api/v1/users/me/notifications - 알림 설정 수정
@router.put("/me/notifications", response_model=NotificationSettingsResponse)
def update_notification_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return user_service.update_notification_settings(current_user.id, db)