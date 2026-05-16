# app/schemas/auth.py
# 인증 관련 요청/응답 스키마

import re
from pydantic import BaseModel, EmailStr, field_validator

# 공통 유저 응답
class UserResponse(BaseModel):
    id: int                # 사용자 고유 ID
    email: EmailStr        # 사용자 이메일
    name: str              # 실명
    nickname: str          # 닉네임


# 회원가입 요청
class RegisterRequest(BaseModel):
    email: EmailStr            # 사용자 이메일
    password: str              # 비밀번호
    password_confirm: str      # 비밀번호 확인
    name: str                  # 실명

    @field_validator("password")
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("invalid_password_format")
        if not re.search(r"[A-Za-z]", v):
            raise ValueError("invalid_password_format")
        if not re.search(r"[0-9]", v):
            raise ValueError("invalid_password_format")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("invalid_password_format")
        return v

    @field_validator("name")
    def validate_name(cls, v):
        if not re.match(r"^[가-힣a-zA-Z]+$", v):
            raise ValueError("invalid_name_format")
        return v


# 회원가입 응답
class RegisterResponse(BaseModel):
    user: UserResponse


# 로그인 요청
class LoginRequest(BaseModel):
    email: EmailStr        # 사용자 이메일
    password: str          # 사용자 비밀번호


# 로그인 응답
class LoginResponse(BaseModel):
    access_token: str      # JWT 액세스 토큰 (만료: 30분)
    refresh_token: str     # JWT 리프레시 토큰 (만료: 14일)
    user: UserResponse     # 사용자 정보


# 로그아웃 요청
class LogoutRequest(BaseModel):
    refresh_token: str     # JWT 리프레시 토큰


# 로그아웃 응답
class LogoutResponse(BaseModel):
    detail: str            # 로그아웃 성공 메시지


# 토큰 재발급 요청
class TokenRefreshRequest(BaseModel):
    refresh_token: str     # JWT 리프레시 토큰


# 토큰 재발급 응답
class TokenRefreshResponse(BaseModel):
    access_token: str      # 새로 발급된 JWT 액세스 토큰 (만료: 30분)


# 소셜 로그인 콜백 요청
class SocialCallbackRequest(BaseModel):
    code: str              # 소셜 로그인 제공자로부터 발급된 인가 코드


# 소셜 로그인 응답
class SocialLoginResponse(BaseModel):
    access_token: str      # JWT 액세스 토큰 (만료: 30분)
    refresh_token: str     # JWT 리프레시 토큰 (만료: 14일)
    user: UserResponse     # 사용자 정보


# 이메일 찾기 요청
class FindEmailRequest(BaseModel):
    name: str              # 사용자 실명
    email: EmailStr        # 가입 시 등록한 이메일


# 이메일 찾기 응답
class FindEmailResponse(BaseModel):
    email: str             # 마스킹 처리된 이메일


# 비밀번호 재설정 링크 발송 요청
class FindPasswordRequest(BaseModel):
    email: EmailStr        # 가입 시 등록한 이메일
    name: str              # 사용자 실명


# 비밀번호 재설정 링크 발송 응답
class FindPasswordResponse(BaseModel):
    detail: str            # 재설정 링크 발송 성공 메시지


# 비밀번호 재설정 요청
class ResetPasswordRequest(BaseModel):
    token: str             # 이메일로 발송된 재설정 토큰
    password: str          # 새 비밀번호
    password_confirm: str  # 새 비밀번호 확인

    @field_validator("password")
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("invalid_password_format")
        if not re.search(r"[A-Za-z]", v):
            raise ValueError("invalid_password_format")
        if not re.search(r"[0-9]", v):
            raise ValueError("invalid_password_format")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("invalid_password_format")
        return v


# 비밀번호 재설정 응답
class ResetPasswordResponse(BaseModel):
    detail: str            # 비밀번호 재설정 성공 메시지