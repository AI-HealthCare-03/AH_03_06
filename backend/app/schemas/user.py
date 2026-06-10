# app/schemas/user.py
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


# 내 프로필 조회 응답
class UserProfileResponse(BaseModel):
    id: int
    email: str
    name: str
    nickname: Optional[str] = None
    birthday: Optional[date] = None
    gender: Optional[str] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    underlying_diseases: list[str] = []
    smoking_status: Optional[int] = None
    alcohol_status: Optional[int] = None


# 내 프로필 수정 요청
class UpdateProfileRequest(BaseModel):
    nickname: Optional[str] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    underlying_diseases: Optional[list[str]] = None
    smoking_status: Optional[int] = None
    alcohol_status: Optional[int] = None


# 내 프로필 수정 응답
class UpdateProfileResponse(BaseModel):
    id: int
    email: str
    name: str
    nickname: str
    height: Optional[float] = None
    weight: Optional[float] = None
    underlying_diseases: list[str] = []


# 닉네임 자동 생성 응답
class NicknameResponse(BaseModel):
    nickname: str


# 건강 목표 항목
class HealthGoalItem(BaseModel):
    id: int
    name: str
    is_active: bool


# 건강 목표 조회 응답
class HealthGoalsResponse(BaseModel):
    goals: list[HealthGoalItem]


# 건강 목표 수정 요청 항목
class HealthGoalUpdateItem(BaseModel):
    goal_type_id: int
    is_active: bool


# 건강 목표 수정 요청
class UpdateHealthGoalsRequest(BaseModel):
    goals: list[HealthGoalUpdateItem]


# 소셜 계정 항목
class SocialAccountItem(BaseModel):
    provider: str
    connected_at: datetime


# 소셜 로그인 연동 목록 조회 응답
class SocialAccountsResponse(BaseModel):
    social_accounts: list[SocialAccountItem]


# 알림 설정 항목
class NotificationSettings(BaseModel):
    push_enabled: bool
    medication_alert: bool
    guide_alert: bool


# 알림 설정 조회 응답
class NotificationSettingsResponse(BaseModel):
    notifications: NotificationSettings


# 회원 탈퇴 요청
class DeleteAccountRequest(BaseModel):
    password: Optional[str] = None


# 초기 개인정보 설정 - 흡연
class SmokingInfo(BaseModel):
    smoking_status: Optional[int] = None
    daily_amount: Optional[int] = None
    smoking_years: Optional[int] = None


# 초기 개인정보 설정 - 음주
class AlcoholInfo(BaseModel):
    alcohol_status: Optional[int] = None
    frequency: Optional[int] = None
    amount: Optional[int] = None


# 초기 개인정보 설정 - 운동
class ExerciseInfo(BaseModel):
    exercise_status: Optional[int] = None
    frequency: Optional[int] = None
    duration: Optional[int] = None
    daily_steps: Optional[int] = None


# 초기 개인정보 설정 - 수면
class SleepInfo(BaseModel):
    sleep_hours: Optional[float] = None
    sleep_quality: Optional[int] = None
    sleep_disorder: Optional[int] = None


# 초기 개인정보 설정 - 식단
class DietInfo(BaseModel):
    diet_type: Optional[int] = None
    daily_calories: Optional[int] = None


# 초기 개인정보 설정 요청
class InitialProfileRequest(BaseModel):
    birthday: date
    gender: str
    height: float
    weight: float
    underlying_diseases: Optional[list[str]] = []
    smoking: Optional[SmokingInfo] = None
    alcohol: Optional[AlcoholInfo] = None
    exercise: Optional[ExerciseInfo] = None
    sleep: Optional[SleepInfo] = None
    diet: Optional[DietInfo] = None


# 초기 개인정보 설정 응답
class InitialProfileResponse(BaseModel):
    detail: str