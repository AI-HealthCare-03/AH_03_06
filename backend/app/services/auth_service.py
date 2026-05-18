# app/services/auth_service.py
# 인증 관련 비즈니스 로직

# 1. 표준 라이브러리
import asyncio
import random
import re
from datetime import datetime, timedelta

# 2. 서드파티 라이브러리
import httpx
from fastapi import HTTPException
from fastapi.responses import RedirectResponse
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy.orm import Session

# 3. 로컬 모듈
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

ADJECTIVES = ["빠른", "느린", "작은", "큰", "밝은", "어두운", "따뜻한", "차가운"]
NOUNS = ["고양이", "강아지", "토끼", "사자", "호랑이", "여우", "늑대", "곰"]

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"


def create_access_token(user_id: int) -> str:
    """access_token 발급 (만료: 30분)"""
    return jwt.encode(
        {"sub": str(user_id), "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)},
        SECRET_KEY,
        algorithm=ALGORITHM
    )


def create_refresh_token(user_id: int) -> str:
    """refresh_token 발급 (만료: 14일)"""
    return jwt.encode(
        {"sub": str(user_id), "exp": datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)},
        SECRET_KEY,
        algorithm=ALGORITHM
    )


def generate_nickname(db: Session) -> str:
    """닉네임 자동 생성 (형용사+명사+4자리 숫자), 중복 시 재생성"""
    while True:
        nickname = f"{random.choice(ADJECTIVES)}{random.choice(NOUNS)}{random.randint(1000, 9999)}"
        if not db.query(User).filter(User.nickname == nickname).first():
            return nickname


def mask_email(email: str) -> str:
    """이메일 마스킹 처리 (예: exa***@example.com)"""
    local, domain = email.split("@")
    masked = local[:3] + "***"
    return f"{masked}@{domain}"


def register(request: RegisterRequest, db: Session) -> RegisterResponse:
    """회원가입 - 이메일 중복 확인 후 유저 생성"""
    # 비밀번호 확인
    if request.password != request.password_confirm:
        raise HTTPException(status_code=400, detail="password_mismatch")

    # 이메일 중복 확인
    if db.query(User).filter(User.email == request.email).first():
        raise HTTPException(status_code=400, detail="duplicate_email")

    # 닉네임 자동 생성
    nickname = generate_nickname(db)

    # 비밀번호 해시 처리
    password_hash = pwd_context.hash(request.password)

    # 유저 생성
    user = User(
        email=request.email,
        password_hash=password_hash,
        name=request.name,
        nickname=nickname
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return RegisterResponse(
        user=UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            nickname=user.nickname
        )
    )


def login(request: LoginRequest, db: Session) -> LoginResponse:
    """로그인 - 이메일/비밀번호 검증 후 토큰 발급"""
    # 이메일로 유저 조회
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not pwd_context.verify(request.password, user.password_hash):
        raise HTTPException(status_code=400, detail="invalid_email_or_password")

    # 토큰 발급
    access_token = create_access_token(user_id=user.id)
    refresh_token = create_refresh_token(user_id=user.id)

    # refresh_token DB 저장
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
    """로그아웃 - refresh_token 무효화"""
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
    """액세스 토큰 재발급 - refresh_token 검증 후 access_token 재발급"""
    # refresh_token DB 조회
    token = db.query(RefreshToken).filter(
        RefreshToken.token == request.refresh_token,
        RefreshToken.is_revoked == 0
    ).first()

    if not token:
        raise HTTPException(status_code=401, detail="invalid_refresh_token")

    # 만료 확인
    if token.expires_at < datetime.utcnow():
        raise HTTPException(status_code=401, detail="invalid_refresh_token")

    # 새 access_token 발급
    access_token = create_access_token(user_id=token.user_id)

    return TokenRefreshResponse(access_token=access_token)


def social_login(provider: str) -> RedirectResponse:
    """소셜 로그인 요청 - 소셜 로그인 제공자 인증 페이지로 리다이렉트"""
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
    """소셜 로그인 콜백 - 인가 코드로 유저 정보 조회 후 토큰 발급"""
    if provider != "google":
        raise HTTPException(status_code=400, detail="invalid_provider")

    # 1. 인가 코드로 Google access_token 발급
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
    print(f"token_response status: {token_response.status_code}")
    print(f"token_response body: {token_response.json()}")

    if token_response.status_code != 200:
        raise HTTPException(status_code=400, detail="invalid_code")

    google_access_token = token_response.json().get("access_token")

    # 2. Google access_token으로 유저 정보 조회
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

    # 3. 기존 소셜 로그인 유저 조회
    social = db.query(SocialLogin).filter(
        SocialLogin.provider == "google",
        SocialLogin.provider_id == google_id
    ).first()

    if social:
        # 기존 회원 → 200 OK
        user = db.query(User).filter(User.id == social.user_id).first()
        status_code = 200
    else:
        # 최초 가입 → 201 Created
        user = db.query(User).filter(User.email == email).first()
        if not user:
            nickname = generate_nickname(db)
            user = User(
                email=email,
                name=name,
                nickname=nickname,
                password_hash=None
            )
            db.add(user)
            db.flush()

        social = SocialLogin(
            user_id=user.id,
            provider="google",
            provider_id=google_id,
            access_token=google_access_token
        )
        db.add(social)
        db.commit()
        db.refresh(user)
        status_code = 201

    # 4. JWT 토큰 발급
    access_token = create_access_token(user_id=user.id)
    refresh_token = create_refresh_token(user_id=user.id)

    # 5. refresh_token DB 저장
    db.add(RefreshToken(
        user_id=user.id,
        token=refresh_token,
        provider="google",
        expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    ))
    db.commit()

    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=status_code,
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


def find_email(request: FindEmailRequest, db: Session) -> FindEmailResponse:
    """이메일 찾기 - 이름, 이메일 일치 확인 후 마스킹된 이메일 반환"""
    user = db.query(User).filter(
        User.name == request.name,
        User.email == request.email
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="user_not_found")

    return FindEmailResponse(email=mask_email(user.email))


async def find_password(request: FindPasswordRequest, db: Session) -> FindPasswordResponse:
    """비밀번호 재설정 링크 발송 - 이메일/이름 일치 확인 후 재설정 링크 발송"""
    user = db.query(User).filter(
        User.email == request.email,
        User.name == request.name
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="user_not_found")

    # 재설정 토큰 발급 (만료: 30분)
    reset_token = jwt.encode(
        {"sub": str(user.id), "exp": datetime.utcnow() + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)},
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    # 이메일 발송 설정
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

    # 이메일 내용
    reset_link = f"http://localhost:3000/password/reset?token={reset_token}"
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

    # 비동기 이메일 발송
    import asyncio
    try:
        fm = FastMail(conf)
        await fm.send_message(message)
    except Exception as e:
        print(f"이메일 발송 실패: {e}")

    return FindPasswordResponse(detail="reset_link_sent")


def reset_password(request: ResetPasswordRequest, db: Session) -> ResetPasswordResponse:
    """비밀번호 재설정 - 재설정 토큰 검증 후 비밀번호 변경"""
    # 비밀번호 확인
    if request.password != request.password_confirm:
        raise HTTPException(status_code=400, detail="password_mismatch")

    # 재설정 토큰 검증
    try:
        payload = jwt.decode(request.token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
    except JWTError:
        raise HTTPException(status_code=400, detail="invalid_token")

    # 유저 조회
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="invalid_token")

    # 이전 비밀번호와 동일 여부 확인
    if pwd_context.verify(request.password, user.password_hash):
        raise HTTPException(status_code=400, detail="same_as_old_password")

    # 비밀번호 변경
    user.password_hash = pwd_context.hash(request.password)
    db.commit()

    return ResetPasswordResponse(detail="password_reset_success")