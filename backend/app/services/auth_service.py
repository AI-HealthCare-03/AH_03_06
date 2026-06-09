# app/services/auth_service.py
# 인증 관련 비즈니스 로직

import random
import re
import httpx
from datetime import datetime, timedelta
from fastapi import HTTPException
from fastapi.responses import RedirectResponse
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import settings
from app.models.user import User
from app.models.social_login import SocialLogin
from app.models.refresh_token import RefreshToken
from app.schemas.auth import (
    RegisterRequest, RegisterResponse,
    LoginRequest, LoginResponse,
    LogoutRequest, LogoutResponse,
    TokenRefreshRequest, TokenRefreshResponse,
    SocialCallbackRequest, SocialLoginResponse,
    FindEmailRequest, FindEmailResponse,
    FindPasswordRequest, FindPasswordResponse,
    ResetPasswordRequest, ResetPasswordResponse,
    UserResponse,
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 14
RESET_TOKEN_EXPIRE_MINUTES = 30

LOGIN_MAX_ATTEMPTS = 5        # 최대 로그인 실패 횟수
LOGIN_LOCK_MINUTES = 10       # 잠금 시간 (분)

ADJECTIVES = ["빠른", "느린", "작은", "큰", "밝은", "어두운", "따뜻한", "차가운"]
NOUNS = ["고양이", "강아지", "토끼", "사자", "호랑이", "여우", "늑대", "곰"]

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"


def create_access_token(user_id: int) -> str:
    return jwt.encode(
        {"sub": str(user_id), "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)},
        SECRET_KEY,
        algorithm=ALGORITHM
    )


def create_refresh_token(user_id: int) -> str:
    return jwt.encode(
        {"sub": str(user_id), "exp": datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)},
        SECRET_KEY,
        algorithm=ALGORITHM
    )


def generate_nickname(db: Session) -> str:
    while True:
        nickname = f"{random.choice(ADJECTIVES)}{random.choice(NOUNS)}{random.randint(1000, 9999)}"
        if not db.query(User).filter(User.nickname == nickname).first():
            return nickname


def mask_email(email: str) -> str:
    local, domain = email.split("@")
    masked = local[:3] + "***"
    return f"{masked}@{domain}"


def register(request: RegisterRequest, db: Session):
    if request.password != request.password_confirm:
        raise HTTPException(status_code=400, detail="password_mismatch")

    if db.query(User).filter(User.email == request.email).first():
        raise HTTPException(status_code=400, detail="duplicate_email")

    password_hash = pwd_context.hash(request.password)

    user = User(
        email=request.email,
        password_hash=password_hash,
        name=request.name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(user_id=user.id)
    refresh_token = create_refresh_token(user_id=user.id)

    db.add(RefreshToken(
        user_id=user.id,
        token=refresh_token,
        provider="email",
        expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    ))
    db.commit()

    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=201,
        content={
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "nickname": user.nickname
            }
        }
    )


def login(request: LoginRequest, db: Session) -> LoginResponse:
    """로그인 - 이메일/비밀번호 검증 후 토큰 발급"""
    user = db.query(User).filter(User.email == request.email).first()

    # 존재하지 않는 이메일
    if not user:
        raise HTTPException(status_code=400, detail="invalid_email_or_password")

    # 계정 잠금 확인
    if user.login_locked_until and user.login_locked_until > datetime.utcnow():
        remaining = int((user.login_locked_until - datetime.utcnow()).total_seconds() / 60) + 1
        raise HTTPException(
            status_code=403,
            detail=f"account_locked:{remaining}"  # 프론트에서 파싱하여 "N분 후 다시 시도해주세요" 표시
        )

    # 비밀번호 검증
    if not pwd_context.verify(request.password, user.password_hash):
        user.login_failed_count += 1

        if user.login_failed_count >= LOGIN_MAX_ATTEMPTS:
            user.login_locked_until = datetime.utcnow() + timedelta(minutes=LOGIN_LOCK_MINUTES)
            db.commit()
            raise HTTPException(status_code=403, detail=f"account_locked:{LOGIN_LOCK_MINUTES}")

        db.commit()
        remaining_attempts = LOGIN_MAX_ATTEMPTS - user.login_failed_count
        raise HTTPException(
            status_code=400,
            detail=f"invalid_email_or_password:{remaining_attempts}"  # 프론트에서 파싱하여 "N회 남았습니다" 표시
        )

    # 로그인 성공 — 실패 횟수 초기화
    user.login_failed_count = 0
    user.login_locked_until = None

    access_token = create_access_token(user_id=user.id)
    refresh_token = create_refresh_token(user_id=user.id)

    db.add(RefreshToken(
        user_id=user.id,
        token=refresh_token,
        provider="local",
        expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    ))
    db.commit()

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            nickname=user.nickname
        )
    )


def logout(request: LogoutRequest, db: Session) -> LogoutResponse:
    token = db.query(RefreshToken).filter(
        RefreshToken.token == request.refresh_token,
        RefreshToken.is_revoked == 0
    ).first()

    if not token:
        raise HTTPException(status_code=401, detail="invalid_token")

    token.is_revoked = 1
    db.commit()

    return LogoutResponse(detail="logout_success")


def refresh_token(request: TokenRefreshRequest, db: Session) -> TokenRefreshResponse:
    token = db.query(RefreshToken).filter(
        RefreshToken.token == request.refresh_token,
        RefreshToken.is_revoked == 0
    ).first()

    if not token:
        raise HTTPException(status_code=401, detail="invalid_refresh_token")

    if token.expires_at < datetime.utcnow():
        raise HTTPException(status_code=401, detail="invalid_refresh_token")

    access_token = create_access_token(user_id=token.user_id)

    return TokenRefreshResponse(access_token=access_token)


def social_login(provider: str) -> RedirectResponse:
    if provider != "google":
        raise HTTPException(status_code=400, detail="invalid_provider")

    params = (
        f"?client_id={settings.GOOGLE_CLIENT_ID}"
        f"&redirect_uri={settings.GOOGLE_REDIRECT_URI}"
        f"&response_type=code"
        f"&scope=openid email profile"
    )

    return RedirectResponse(url=GOOGLE_AUTH_URL + params)


def social_login_callback(provider: str, code: str, db: Session):
    if provider != "google":
        raise HTTPException(status_code=400, detail="invalid_provider")

    token_response = httpx.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        }
    )
    if token_response.status_code != 200:
        raise HTTPException(status_code=400, detail="invalid_code")

    google_access_token = token_response.json().get("access_token")

    userinfo_response = httpx.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {google_access_token}"}
    )
    if userinfo_response.status_code != 200:
        raise HTTPException(status_code=400, detail="invalid_code")

    userinfo = userinfo_response.json()
    google_id = userinfo.get("id")
    email = userinfo.get("email")
    name = userinfo.get("name")

    social = db.query(SocialLogin).filter(
        SocialLogin.provider == "google",
        SocialLogin.provider_id == google_id
    ).first()

    if social:
        user = db.query(User).filter(User.id == social.user_id).first()
        status_code = 200
    else:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            nickname = generate_nickname(db)
            user = User(email=email, name=name, nickname=nickname, password_hash=None)
            db.add(user)
            db.flush()
            status_code = 201
        else:
            status_code = 200

        social = SocialLogin(
            user_id=user.id,
            provider="google",
            provider_id=google_id,
            access_token=google_access_token
        )
        db.add(social)
        db.commit()
        db.refresh(user)

    access_token = create_access_token(user_id=user.id)
    refresh_token = create_refresh_token(user_id=user.id)

    db.add(RefreshToken(
        user_id=user.id,
        token=refresh_token,
        provider="google",
        expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    ))
    db.commit()

    from fastapi.responses import RedirectResponse
    frontend_url = settings.FRONTEND_URL
    if status_code == 201:
        redirect_url = f"{frontend_url}/register/nickname?access_token={access_token}&refresh_token={refresh_token}"
    else:
        redirect_url = f"{frontend_url}/auth/callback?access_token={access_token}&refresh_token={refresh_token}"
    print(f"Redirecting to: {redirect_url}")
    return RedirectResponse(url=redirect_url, status_code=302)


def find_email(request: FindEmailRequest, db: Session) -> FindEmailResponse:
    user = db.query(User).filter(
        User.name == request.name,
        User.email == request.email
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="user_not_found")

    return FindEmailResponse(email=mask_email(user.email))


async def find_password(request: FindPasswordRequest, db: Session) -> FindPasswordResponse:
    user = db.query(User).filter(
        User.email == request.email,
        User.name == request.name
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="user_not_found")

    reset_token = jwt.encode(
        {"sub": str(user.id), "exp": datetime.utcnow() + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)},
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    conf = ConnectionConfig(
        MAIL_USERNAME=settings.MAIL_USERNAME,
        MAIL_PASSWORD=settings.MAIL_PASSWORD,
        MAIL_FROM=settings.MAIL_FROM,
        MAIL_PORT=settings.MAIL_PORT,
        MAIL_SERVER=settings.MAIL_SERVER,
        MAIL_STARTTLS=True,
        MAIL_SSL_TLS=False,
        USE_CREDENTIALS=True
    )

    reset_link = f"{settings.FRONTEND_URL}/password/reset?token={reset_token}"
    message = MessageSchema(
        subject="[Viva] 비밀번호 재설정 링크",
        recipients=[user.email],
        body=f"""
            안녕하세요, {user.name}님.

            비밀번호 재설정 링크입니다. 링크는 30분간 유효합니다.

            {reset_link}

            본인이 요청하지 않은 경우 이 이메일을 무시하세요.
            """,
        subtype="plain"
    )

    import asyncio
    try:
        fm = FastMail(conf)
        await fm.send_message(message)
    except Exception as e:
        print(f"이메일 발송 실패: {e}")

    return FindPasswordResponse(detail="reset_link_sent")


def reset_password(request: ResetPasswordRequest, db: Session) -> ResetPasswordResponse:
    if request.password != request.password_confirm:
        raise HTTPException(status_code=400, detail="password_mismatch")

    try:
        payload = jwt.decode(request.token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
    except JWTError:
        raise HTTPException(status_code=400, detail="invalid_token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="invalid_token")

    if pwd_context.verify(request.password, user.password_hash):
        raise HTTPException(status_code=400, detail="same_as_old_password")

    user.password_hash = pwd_context.hash(request.password)
    db.commit()

    return ResetPasswordResponse(detail="password_reset_success")