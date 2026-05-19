# api/v1/auth.py
# 인증 관련 엔드포인트 담당
# 회원가입, 로그인, 로그아웃, 토큰 재발급
# 소셜 로그인 (Google)
# 이메일 찾기, 비밀번호 재설정

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.auth import (
    RegisterRequest, RegisterResponse,
    LoginRequest, LoginResponse,
    LogoutRequest, LogoutResponse,
    TokenRefreshRequest, TokenRefreshResponse,
    SocialCallbackRequest, SocialLoginResponse,
    FindEmailRequest, FindEmailResponse,
    FindPasswordRequest, FindPasswordResponse,
    ResetPasswordRequest, ResetPasswordResponse,
)
from app.services import auth_service

router = APIRouter()


# POST /api/v1/auth/register - 회원가입
@router.post("/register", response_model=RegisterResponse, status_code=201)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    return auth_service.register(request, db)


# POST /api/v1/auth/login - 로그인
@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    return auth_service.login(request, db)


# POST /api/v1/auth/logout - 로그아웃
@router.post("/logout", response_model=LogoutResponse)
def logout(request: LogoutRequest, db: Session = Depends(get_db)):
    return auth_service.logout(request, db)


# POST /api/v1/auth/token/refresh - 액세스 토큰 재발급
@router.post("/token/refresh", response_model=TokenRefreshResponse)
def refresh_token(request: TokenRefreshRequest, db: Session = Depends(get_db)):
    return auth_service.refresh_token(request, db)


# GET /api/v1/auth/social/{provider} - 소셜 로그인 요청
@router.get("/social/{provider}")
def social_login(provider: str):
    return auth_service.social_login(provider)


# GET /api/v1/auth/social/{provider}/callback - 소셜 로그인 콜백
@router.get("/social/{provider}/callback")
def social_login_callback(
    provider: str,
    code: str,
    db: Session = Depends(get_db),
    iss: str = None,
    scope: str = None,
    authuser: str = None,
    prompt: str = None
):
    return auth_service.social_login_callback(provider, code, db)


# POST /api/v1/auth/email/find - 이메일 찾기
@router.post("/email/find", response_model=FindEmailResponse)
def find_email(request: FindEmailRequest, db: Session = Depends(get_db)):
    return auth_service.find_email(request, db)


# POST /api/v1/auth/password/find - 비밀번호 재설정 링크 발송
@router.post("/password/find", response_model=FindPasswordResponse)
def find_password(request: FindPasswordRequest, db: Session = Depends(get_db)):
    return auth_service.find_password(request, db)


# PUT /api/v1/auth/password/reset - 비밀번호 재설정
@router.put("/password/reset", response_model=ResetPasswordResponse)
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    return auth_service.reset_password(request, db)