# app/schemas/__init__.py
from app.schemas.auth import (
    UserResponse,
    RegisterRequest,
    RegisterResponse,
    LoginRequest,
    LoginResponse,
    LogoutRequest,
    LogoutResponse,
    TokenRefreshRequest,
    TokenRefreshResponse,
    SocialCallbackRequest,
    SocialLoginResponse,
    FindEmailRequest,
    FindEmailResponse,
    FindPasswordRequest,
    FindPasswordResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
)

from app.schemas.health_checkup import (
    HealthCheckupCreateRequest,
    HealthCheckupUpdateRequest,
    HealthCheckupResponse,
    HealthCheckupListResponse,
    HealthCheckupDeleteResponse,
    HealthClassificationResponse,
    HealthTrendResponse,
)