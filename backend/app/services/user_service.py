# app/services/user_service.py
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.models.user import (
    User, UserProfile, UserHealthInfo,
    UserUnderlyingDisease, HealthGoalType, UserHealthGoal,
    SmokingInfo, AlcoholInfo, ExerciseInfo, SleepInfo, DietInfo
)
from app.models.social_login import SocialLogin
from app.schemas.user import InitialProfileRequest, UpdateProfileRequest, UpdateHealthGoalsRequest
from app.utils.auth import verify_password
import random

ADJECTIVES = ["빠른", "활기찬", "건강한", "씩씩한", "밝은", "맑은", "강한", "날쌘", "용감한", "현명한"]
NOUNS = ["고양이", "강아지", "토끼", "사자", "호랑이", "독수리", "펭귄", "판다", "여우", "늑대"]


def generate_nickname(db: Session) -> str:
    while True:
        nickname = f"{random.choice(ADJECTIVES)}{random.choice(NOUNS)}{random.randint(1000, 9999)}"
        exists = db.query(User).filter(User.nickname == nickname).first()
        if not exists:
            return nickname


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
        profile = UserProfile(user_id=user_id, birthday=request.birthday, gender=request.gender)
        db.add(profile)

    # UserHealthInfo 저장
    health_info = db.query(UserHealthInfo).filter(UserHealthInfo.user_id == user_id).first()
    if health_info:
        health_info.height = request.height
        health_info.weight = request.weight
    else:
        health_info = UserHealthInfo(user_id=user_id, height=request.height, weight=request.weight)
        db.add(health_info)

    # 기저질환 저장
    if request.underlying_diseases is not None:
        db.query(UserUnderlyingDisease).filter(UserUnderlyingDisease.user_id == user_id).delete()
        for disease in request.underlying_diseases:
            db.add(UserUnderlyingDisease(user_id=user_id, disease_name=disease))

    # 흡연 정보 저장
    if request.smoking is not None:
        smoking = db.query(SmokingInfo).filter(SmokingInfo.user_id == user_id).first()
        if smoking:
            smoking.smoking_status = request.smoking.smoking_status or 0
            smoking.daily_amount = request.smoking.daily_amount
            smoking.smoking_years = request.smoking.smoking_years
        else:
            db.add(SmokingInfo(
                user_id=user_id,
                smoking_status=request.smoking.smoking_status or 0,
                daily_amount=request.smoking.daily_amount,
                smoking_years=request.smoking.smoking_years,
            ))

    # 음주 정보 저장
    if request.alcohol is not None:
        alcohol = db.query(AlcoholInfo).filter(AlcoholInfo.user_id == user_id).first()
        if alcohol:
            alcohol.alcohol_status = request.alcohol.alcohol_status or 0
            alcohol.frequency = request.alcohol.frequency
            alcohol.amount = request.alcohol.amount
        else:
            db.add(AlcoholInfo(
                user_id=user_id,
                alcohol_status=request.alcohol.alcohol_status or 0,
                frequency=request.alcohol.frequency,
                amount=request.alcohol.amount,
            ))

    # 운동 정보 저장
    if request.exercise is not None:
        exercise = db.query(ExerciseInfo).filter(ExerciseInfo.user_id == user_id).first()
        if exercise:
            exercise.exercise_status = request.exercise.exercise_status or 0
            exercise.frequency = request.exercise.frequency
            exercise.duration = request.exercise.duration
            exercise.daily_steps = request.exercise.daily_steps
        else:
            db.add(ExerciseInfo(
                user_id=user_id,
                exercise_status=request.exercise.exercise_status or 0,
                frequency=request.exercise.frequency,
                duration=request.exercise.duration,
                daily_steps=request.exercise.daily_steps,
            ))

    # 수면 정보 저장
    if request.sleep is not None:
        sleep = db.query(SleepInfo).filter(SleepInfo.user_id == user_id).first()
        if sleep:
            sleep.sleep_hours = request.sleep.sleep_hours
            sleep.sleep_quality = request.sleep.sleep_quality
            sleep.sleep_disorder = request.sleep.sleep_disorder or 0
        else:
            db.add(SleepInfo(
                user_id=user_id,
                sleep_hours=request.sleep.sleep_hours,
                sleep_quality=request.sleep.sleep_quality,
                sleep_disorder=request.sleep.sleep_disorder or 0,
            ))

    # 식단 정보 저장
    if request.diet is not None:
        diet = db.query(DietInfo).filter(DietInfo.user_id == user_id).first()
        if diet:
            diet.diet_type = request.diet.diet_type or 0
            diet.daily_calories = request.diet.daily_calories
        else:
            db.add(DietInfo(
                user_id=user_id,
                diet_type=request.diet.diet_type or 0,
                daily_calories=request.diet.daily_calories,
            ))

    db.commit()
    return {"detail": "initial_profile_saved"}


def get_my_profile(user_id: int, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="invalid_token")

    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    health_info = db.query(UserHealthInfo).filter(UserHealthInfo.user_id == user_id).first()
    diseases = db.query(UserUnderlyingDisease).filter(UserUnderlyingDisease.user_id == user_id).all()
    smoking = db.query(SmokingInfo).filter(SmokingInfo.user_id == user_id).first()
    alcohol = db.query(AlcoholInfo).filter(AlcoholInfo.user_id == user_id).first()

    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "nickname": user.nickname,
        # profile_image_url 제거
        "birthday": profile.birthday if profile else None,
        "gender": profile.gender if profile else None,
        "height": float(health_info.height) if health_info else None,
        "weight": float(health_info.weight) if health_info else None,
        "underlying_diseases": [d.disease_name for d in diseases],
        "smoking_status": smoking.smoking_status if smoking else None,
        "alcohol_status": alcohol.alcohol_status if alcohol else None,
    }


def update_my_profile(user_id: int, request: UpdateProfileRequest, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="invalid_token")

    if request.nickname is not None:
        duplicate = db.query(User).filter(User.nickname == request.nickname, User.id != user_id).first()
        if duplicate:
            raise HTTPException(status_code=400, detail="duplicate_nickname")
        user.nickname = request.nickname

    if request.height is not None or request.weight is not None:
        health_info = db.query(UserHealthInfo).filter(UserHealthInfo.user_id == user_id).first()
        if health_info:
            if request.height is not None:
                health_info.height = request.height
            if request.weight is not None:
                health_info.weight = request.weight
        else:
            health_info = UserHealthInfo(user_id=user_id, height=request.height or 0, weight=request.weight or 0)
            db.add(health_info)

    if request.underlying_diseases is not None:
        db.query(UserUnderlyingDisease).filter(UserUnderlyingDisease.user_id == user_id).delete()
        for disease in request.underlying_diseases:
            db.add(UserUnderlyingDisease(user_id=user_id, disease_name=disease))

    # 흡연 정보 수정
    if request.smoking_status is not None:
        smoking = db.query(SmokingInfo).filter(SmokingInfo.user_id == user_id).first()
        if smoking:
            smoking.smoking_status = request.smoking_status
        else:
            db.add(SmokingInfo(user_id=user_id, smoking_status=request.smoking_status))

    # 음주 정보 수정
    if request.alcohol_status is not None:
        alcohol = db.query(AlcoholInfo).filter(AlcoholInfo.user_id == user_id).first()
        if alcohol:
            alcohol.alcohol_status = request.alcohol_status
        else:
            db.add(AlcoholInfo(user_id=user_id, alcohol_status=request.alcohol_status))

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


def delete_my_account(user_id: int, password: str | None, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="invalid_token")

    if user.password_hash is not None:
        if not password:
            raise HTTPException(status_code=400, detail="invalid_password")
        if not verify_password(password, user.password_hash):
            raise HTTPException(status_code=400, detail="invalid_password")

    uid = user.id
    # user 연관 데이터 전체 삭제: db.delete(user)는 자식 user_id를 NULL화하려다 NOT NULL 위반이라
    # FK 체크를 잠시 끄고(원복) 깊은 자식→부모 순으로 raw 삭제. 스키마 변경 없음.
    deep = [
        ("chat_message",          "session_id IN (SELECT id FROM chat_session WHERE user_id=:uid)"),
        ("notifications",         "schedule_id IN (SELECT schedule_id FROM medication_schedules WHERE user_id=:uid)"),
        ("schedule_days",         "schedule_id IN (SELECT schedule_id FROM medication_schedules WHERE user_id=:uid)"),
        ("guide",                 "medical_record_id IN (SELECT id FROM medical_record WHERE user_id=:uid)"),
        ("prescription",          "medical_record_id IN (SELECT id FROM medical_record WHERE user_id=:uid)"),
        ("sleep_guide_guideline", "sleep_guide_id IN (SELECT id FROM sleep_guide WHERE user_id=:uid)"),
        ("sleep_survey_caffeine", "survey_response_id IN (SELECT id FROM sleep_survey_response WHERE user_id=:uid)"),
        ("user_allergy",          "diet_info_id IN (SELECT id FROM diet_info WHERE user_id=:uid)"),
        ("user_cuisine",          "diet_info_id IN (SELECT id FROM diet_info WHERE user_id=:uid)"),
        ("user_food_aversion",    "diet_info_id IN (SELECT id FROM diet_info WHERE user_id=:uid)"),
        ("user_exercise_type",    "exercise_info_id IN (SELECT id FROM exercise_info WHERE user_id=:uid)"),
    ]
    direct = [
        "chat_session", "medication_schedules", "medical_record", "sleep_guide", "sleep_survey_response",
        "diet_info", "exercise_info", "attendance", "attendance_streak", "fcm_tokens", "health_checkup",
        "medication_guide", "medication_logs", "point_history", "refresh_token", "sleep_info", "social_login",
        "user_health_goal", "user_health_info", "user_point", "user_profile", "user_profile_item",
        "user_underlying_disease", "diet_guide", "exercise_guide", "nutrient_standard",
    ]
    # 환경별 스키마 차이(예: 운영엔 있고 로컬엔 없는 테이블) 대비 — 실재 테이블만 삭제
    existing = {r[0] for r in db.execute(text(
        "SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA = DATABASE()"
    )).all()}
    db.execute(text("SET FOREIGN_KEY_CHECKS=0"))
    try:
        for tbl, where in deep:
            if tbl in existing:
                db.execute(text(f"DELETE FROM {tbl} WHERE {where}"), {"uid": uid})
        for tbl in direct:
            if tbl in existing:
                db.execute(text(f"DELETE FROM {tbl} WHERE user_id=:uid"), {"uid": uid})
        db.execute(text("DELETE FROM user WHERE id=:uid"), {"uid": uid})
    finally:
        db.execute(text("SET FOREIGN_KEY_CHECKS=1"))
    db.commit()
    return {"detail": "user_deleted"}


def get_health_goals(user_id: int, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="invalid_token")

    goals = db.query(UserHealthGoal, HealthGoalType).join(
        HealthGoalType, UserHealthGoal.goal_type_id == HealthGoalType.id
    ).filter(UserHealthGoal.user_id == user_id).all()

    return {
        "goals": [
            {"id": goal_type.id, "name": goal_type.name, "is_active": user_goal.is_active}
            for user_goal, goal_type in goals
        ]
    }


def update_health_goals(user_id: int, request: UpdateHealthGoalsRequest, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="invalid_token")

    for goal_update in request.goals:
        goal_type = db.query(HealthGoalType).filter(HealthGoalType.id == goal_update.goal_type_id).first()
        if not goal_type:
            raise HTTPException(status_code=400, detail="invalid_goal_type_id")

        user_goal = db.query(UserHealthGoal).filter(
            UserHealthGoal.user_id == user_id,
            UserHealthGoal.goal_type_id == goal_update.goal_type_id
        ).first()

        if user_goal:
            user_goal.is_active = goal_update.is_active
        else:
            db.add(UserHealthGoal(user_id=user_id, goal_type_id=goal_update.goal_type_id, is_active=goal_update.is_active))

    db.commit()
    return get_health_goals(user_id, db)


def get_social_accounts(user_id: int, db: Session):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="invalid_token")

    socials = db.query(SocialLogin).filter(SocialLogin.user_id == user_id).all()
    return {
        "social_accounts": [{"provider": s.provider, "connected_at": s.created_at} for s in socials]
    }


def disconnect_social_account(user_id: int, provider: str, db: Session):
    if provider not in ["google", "kakao"]:
        raise HTTPException(status_code=400, detail="invalid_provider")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="invalid_token")

    social = db.query(SocialLogin).filter(SocialLogin.user_id == user_id, SocialLogin.provider == provider).first()
    if not social:
        raise HTTPException(status_code=400, detail="not_connected")

    social_count = db.query(SocialLogin).filter(SocialLogin.user_id == user_id).count()
    if user.password_hash is None and social_count == 1:
        raise HTTPException(status_code=400, detail="last_login_method")

    db.delete(social)
    db.commit()
    return {"detail": "social_disconnected"}