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

    _purge_user_rows(db, user.id)
    db.commit()
    return {"detail": "user_deleted"}


def _purge_user_rows(db: Session, uid: int):
    """user.id에 (직접/간접) 종속된 모든 행을 정보스키마에서 자동 탐지해 삭제.
    user_id 컬럼이나 user 참조 FK만 있으면 새 테이블도 자동 포함된다.
    FK 체크를 잠시 끄고(원복) 자식→부모 순으로 raw DELETE. 스키마 변경 없음."""
    # user_id 컬럼을 가진 테이블 = 직접 소유 (DB에 FK 제약이 선언 안 됐어도 잡힌다)
    direct_owners = {r[0] for r in db.execute(text(
        "SELECT TABLE_NAME FROM information_schema.columns "
        "WHERE TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = 'user_id'"
    )).all()}

    fks: dict[str, list[tuple[str, str, str]]] = {}
    for tbl, col, ref_tbl, ref_col in db.execute(text(
        "SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME "
        "FROM information_schema.KEY_COLUMN_USAGE "
        "WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL"
    )).all():
        if ref_tbl != tbl:
            fks.setdefault(tbl, []).append((col, ref_tbl, ref_col))

    reachable = {"user"} | direct_owners
    changed = True
    while changed:
        changed = False
        for tbl, edges in fks.items():
            if tbl not in reachable and any(rt in reachable for _, rt, _ in edges):
                reachable.add(tbl)
                changed = True
    targets = reachable - {"user"}

    # 자식→부모 순으로 위상정렬: 자식이 먼저 지워져야 부모 행을 참조하는 서브쿼리가 유효
    placed, order, remaining = set(), [], set(targets)
    while remaining:
        ready = [t for t in sorted(remaining)
                 if {rt for _, rt, _ in fks.get(t, []) if rt in targets} <= placed]
        if not ready:  # FK 사이클 — 남은 건 임의 순서 (FK 체크 off라 삭제 자체는 된다)
            ready = sorted(remaining)
        for t in ready:
            order.append(t)
            placed.add(t)
            remaining.discard(t)
    order.reverse()

    def predicate(tbl, stack=()):
        clauses = []
        if tbl in direct_owners:
            clauses.append("`user_id` = :uid")
        for col, rt, rc in fks.get(tbl, []):
            if rt == "user":
                clauses.append(f"`{col}` = :uid")
            elif rt in targets and rt not in stack:  # 사이클 방지
                clauses.append(
                    f"`{col}` IN (SELECT `{rc}` FROM `{rt}` WHERE {predicate(rt, stack + (tbl,))})"
                )
        return "(" + " OR ".join(dict.fromkeys(clauses)) + ")" if clauses else "1=0"

    db.execute(text("SET FOREIGN_KEY_CHECKS=0"))
    try:
        for tbl in order:
            db.execute(text(f"DELETE FROM `{tbl}` WHERE {predicate(tbl)}"), {"uid": uid})
        db.execute(text("DELETE FROM `user` WHERE id = :uid"), {"uid": uid})
    finally:
        db.execute(text("SET FOREIGN_KEY_CHECKS=1"))


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