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

from app.schemas.guide import (
    GenerateGuideRequest,
    GenerateGuideResponse,
    MedicationGuideSchema,
    GuideListResponse,
    DeleteGuideResponse,


from app.schemas.medical_record import (
    PrescriptionRequest,
    PrescriptionUpdateRequest,
    PrescriptionResponse,
    GuideResponse,
    MedicalRecordCreateRequest,
    MedicalRecordCreateResponse,
    MedicalRecordUpdateRequest,
    MedicalRecordUpdateResponse,
    MedicalRecordSummary,
    MedicalRecordListResponse,
    MedicalRecordDetailResponse,
    MedicalRecordDeleteResponse,
)