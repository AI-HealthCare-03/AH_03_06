# app/services/user_service.py
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.user import (
    User, UserProfile, UserHealthInfo,
    UserUnderlyingDisease, HealthGoalType, UserHealthGoal
)
from app.models.social_login import SocialLogin
from app.schemas.user import (
    InitialProfileRequest, UpdateProfileRequest,
    UpdateHealthGoalsRequest
)
from app.utils.auth import verify_password
import random


# 닉네임 자동 생성
ADJECTIVES = ["빠른", "활기찬", "건강한", "씩씩한", "밝은", "맑은", "강한", "날쌘", "용감한", "현명한"]
NOUNS = ["고양이", "강아지", "토끼", "사자", "호랑이", "독수리", "펭귄", "판다", "여우", "늑대"]

def generate_nickname(db: Session) -> str:
    while True:
        nickname = f"{random.choice(ADJECTIVES)}{random.choice(NOUNS)}{random.randint(1000, 9999)}"
        exists = db.query(User).filter(User.nickname == nickname).first()
        if not exists:
            return nickname


# 초기 개인정보 설정
def set_initial_profile(user_id: int, request: InitialProfileRequest, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="invalid_token")

    # UserProfile 저장
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if profile:
        profile.birthday = request.birthday
        profile.gender = request.gender
    else:
        profile = UserProfile(
            user_id=user_id,
            birthday=request.birthday,
            gender=request.gender
        )
        db.add(profile)

    # UserHealthInfo 저장
    health_info = db.query(UserHealthInfo).filter(UserHealthInfo.user_id == user_id).first()
    if health_info:
        health_info.height = request.height
        health_info.weight = request.weight
    else:
        health_info = UserHealthInfo(
            user_id=user_id,
            height=request.height,
            weight=request.weight
        )
        db.add(health_info)

    # 기저질환 저장
    if request.underlying_diseases is not None:
        db.query(UserUnderlyingDisease).filter(
            UserUnderlyingDisease.user_id == user_id
        ).delete()
        for disease in request.underlying_diseases:
            db.add(UserUnderlyingDisease(user_id=user_id, disease_name=disease))

    db.commit()
    return {"detail": "initial_profile_saved"}


# 내 프로필 조회
def get_my_profile(user_id: int, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="invalid_token")

    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    health_info = db.query(UserHealthInfo).filter(UserHealthInfo.user_id == user_id).first()
    diseases = db.query(UserUnderlyingDisease).filter(UserUnderlyingDisease.user_id == user_id).all()

    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "nickname": user.nickname,
        "profile_image_url": user.profile_image_url,
        "birthday": profile.birthday if profile else None,
        "gender": profile.gender if profile else None,
        "height": float(health_info.height) if health_info else None,
        "weight": float(health_info.weight) if health_info else None,
        "underlying_diseases": [d.disease_name for d in diseases]
    }


# 내 프로필 수정
def update_my_profile(user_id: int, request: UpdateProfileRequest, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="invalid_token")

    # 닉네임 수정
    if request.nickname is not None:
        duplicate = db.query(User).filter(
            User.nickname == request.nickname,
            User.id != user_id
        ).first()
        if duplicate:
            raise HTTPException(status_code=400, detail="duplicate_nickname")
        user.nickname = request.nickname

    # 신장/체중 수정
    if request.height is not None or request.weight is not None:
        health_info = db.query(UserHealthInfo).filter(UserHealthInfo.user_id == user_id).first()
        if health_info:
            if request.height is not None:
                health_info.height = request.height
            if request.weight is not None:
                health_info.weight = request.weight
        else:
            health_info = UserHealthInfo(
                user_id=user_id,
                height=request.height or 0,
                weight=request.weight or 0
            )
            db.add(health_info)

    # 기저질환 수정
    if request.underlying_diseases is not None:
        db.query(UserUnderlyingDisease).filter(
            UserUnderlyingDisease.user_id == user_id
        ).delete()
        for disease in request.underlying_diseases:
            db.add(UserUnderlyingDisease(user_id=user_id, disease_name=disease))

    db.commit()
    db.refresh(user)

    health_info = db.query(UserHealthInfo).filter(UserHealthInfo.user_id == user_id).first()
    diseases = db.query(UserUnderlyingDisease).filter(UserUnderlyingDisease.user_id == user_id).all()

    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "nickname": user.nickname,
        "height": float(health_info.height) if health_info else None,
        "weight": float(health_info.weight) if health_info else None,
        "underlying_diseases": [d.disease_name for d in diseases]
    }


# 회원 탈퇴
def delete_my_account(user_id: int, password: str | None, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="invalid_token")

    # 소셜 전용 유저가 아닌 경우 비밀번호 확인
    if user.password_hash is not None:
        if not password:
            raise HTTPException(status_code=400, detail="invalid_password")
        if not verify_password(password, user.password_hash):
            raise HTTPException(status_code=400, detail="invalid_password")

    db.delete(user)
    db.commit()
    return {"detail": "user_deleted"}


# 건강 목표 조회
def get_health_goals(user_id: int, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="invalid_token")

    goals = db.query(UserHealthGoal, HealthGoalType).join(
        HealthGoalType, UserHealthGoal.goal_type_id == HealthGoalType.id
    ).filter(UserHealthGoal.user_id == user_id).all()

    return {
        "goals": [
            {
                "id": goal_type.id,
                "name": goal_type.name,
                "is_active": user_goal.is_active
            }
            for user_goal, goal_type in goals
        ]
    }


# 건강 목표 수정
def update_health_goals(user_id: int, request: UpdateHealthGoalsRequest, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="invalid_token")

    for goal_update in request.goals:
        goal_type = db.query(HealthGoalType).filter(
            HealthGoalType.id == goal_update.goal_type_id
        ).first()
        if not goal_type:
            raise HTTPException(status_code=400, detail="invalid_goal_type_id")

        user_goal = db.query(UserHealthGoal).filter(
            UserHealthGoal.user_id == user_id,
            UserHealthGoal.goal_type_id == goal_update.goal_type_id
        ).first()

        if user_goal:
            user_goal.is_active = goal_update.is_active
        else:
            db.add(UserHealthGoal(
                user_id=user_id,
                goal_type_id=goal_update.goal_type_id,
                is_active=goal_update.is_active
            ))

    db.commit()

    return get_health_goals(user_id, db)


# 소셜 로그인 연동 목록 조회
def get_social_accounts(user_id: int, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="invalid_token")

    socials = db.query(SocialLogin).filter(SocialLogin.user_id == user_id).all()

    return {
        "social_accounts": [
            {
                "provider": s.provider,
                "connected_at": s.created_at
            }
            for s in socials
        ]
    }


# 소셜 로그인 연동 해제
def disconnect_social_account(user_id: int, provider: str, db: Session):
    if provider not in ["google", "kakao"]:
        raise HTTPException(status_code=400, detail="invalid_provider")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="invalid_token")

    social = db.query(SocialLogin).filter(
        SocialLogin.user_id == user_id,
        SocialLogin.provider == provider
    ).first()
    if not social:
        raise HTTPException(status_code=400, detail="not_connected")

    # 유일한 로그인 수단 체크
    social_count = db.query(SocialLogin).filter(SocialLogin.user_id == user_id).count()
    if user.password_hash is None and social_count == 1:
        raise HTTPException(status_code=400, detail="last_login_method")

    db.delete(social)
    db.commit()
    return {"detail": "social_disconnected"}