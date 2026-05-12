# api/v1/users.py
# 사용자 관련 엔드포인트 담당
# 프로필 조회/수정, 회원 탈퇴
# 닉네임 자동 생성
# 건강 기본 정보 조회/수정
# 건강 목표 조회/수정
# 소셜 로그인 연동 관리
# 알림 설정 조회/수정

from fastapi import APIRouter

router = APIRouter()

# POST /api/v1/users/profile/initial - 초기 개인정보 설정
@router.post("/profile/initial")
def set_initial_profile():
    pass

# GET /api/v1/users/me - 내 프로필 조회
@router.get("/me")
def get_my_profile():
    pass

# PUT /api/v1/users/me - 내 프로필 수정
@router.put("/me")
def update_my_profile():
    pass

# DELETE /api/v1/users/me - 회원 탈퇴
@router.delete("/me")
def delete_my_account():
    pass

# GET /api/v1/users/me/nickname - 닉네임 자동 생성
@router.get("/me/nickname")
def generate_nickname():
    pass

# GET /api/v1/users/me/health-info - 건강 기본 정보 조회
@router.get("/me/health-info")
def get_health_info():
    pass

# PUT /api/v1/users/me/health-info - 건강 기본 정보 수정
@router.put("/me/health-info")
def update_health_info():
    pass

# GET /api/v1/users/me/health-goals - 건강 목표 조회
@router.get("/me/health-goals")
def get_health_goals():
    pass

# PUT /api/v1/users/me/health-goals - 건강 목표 수정
@router.put("/me/health-goals")
def update_health_goals():
    pass

# GET /api/v1/users/me/social - 소셜 로그인 연동 목록 조회
@router.get("/me/social")
def get_social_accounts():
    pass

# DELETE /api/v1/users/me/social/{provider} - 소셜 로그인 연동 해제
@router.delete("/me/social/{provider}")
def disconnect_social_account(provider: str):
    pass

# GET /api/v1/users/me/notifications - 알림 설정 조회
@router.get("/me/notifications")
def get_notification_settings():
    pass

# PUT /api/v1/users/me/notifications - 알림 설정 수정
@router.put("/me/notifications")
def update_notification_settings():
    pass