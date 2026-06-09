# app/models/user.py
# 사용자 관련 테이블 모델
# USER, USER_PROFILE, USER_HEALTH_INFO, USER_UNDERLYING_DISEASE
# HEALTH_GOAL_TYPE, USER_HEALTH_GOAL
# SMOKING_INFO, ALCOHOL_INFO
# EXERCISE_INFO, EXERCISE_TYPE, USER_EXERCISE_TYPE
# SLEEP_INFO
# DIET_INFO, CUISINE_TYPE, USER_CUISINE, FOOD_AVERSION_TYPE, USER_FOOD_AVERSION, ALLERGY_TYPE, USER_ALLERGY

from sqlalchemy import Column, BigInteger, String, DateTime, Date, Boolean, DECIMAL, ForeignKey, CHAR, SmallInteger, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    """사용자 계정 인증 정보 테이블"""
    __tablename__ = "user"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=True)
    name = Column(String(50), nullable=False)
    nickname = Column(String(50), unique=True, nullable=True)
    # profile_image_url 제거
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    social_logins = relationship("SocialLogin", back_populates="user")
    refresh_tokens = relationship("RefreshToken", back_populates="user")
    profile = relationship("UserProfile", back_populates="user", uselist=False)
    health_info = relationship("UserHealthInfo", back_populates="user", uselist=False)
    underlying_diseases = relationship("UserUnderlyingDisease", back_populates="user")
    health_goals = relationship("UserHealthGoal", back_populates="user")

    smoking_info = relationship("SmokingInfo", back_populates="user", uselist=False)
    alcohol_info = relationship("AlcoholInfo", back_populates="user", uselist=False)
    exercise_info = relationship("ExerciseInfo", back_populates="user", uselist=False)
    sleep_info = relationship("SleepInfo", back_populates="user", uselist=False)
    diet_info = relationship("DietInfo", back_populates="user", uselist=False)

    health_checkups = relationship("HealthCheckup", back_populates="user")
    medication_guides = relationship("MedicationGuide", back_populates="user")

    medical_records = relationship("MedicalRecord", back_populates="user")
    medication_logs = relationship("MedicationLog", back_populates="user")
    medication_schedules = relationship("MedicationSchedule", back_populates="user")

    attendances = relationship("Attendance", back_populates="user")
    attendance_streak = relationship("AttendanceStreak", back_populates="user", uselist=False)

    point = relationship("UserPoint", back_populates="user", uselist=False)
    point_history = relationship("PointHistory", back_populates="user")

    profile_items = relationship("UserProfileItem", back_populates="user")

    fcm_tokens = relationship("FcmToken", back_populates="user")

class UserProfile(Base):
    """사용자 기본 프로필 테이블 (생년월일, 성별)"""
    __tablename__ = "user_profile"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("user.id"), nullable=False, unique=True)
    birthday = Column(Date, nullable=False)
    gender = Column(CHAR(1), nullable=False)
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="profile")


class UserHealthInfo(Base):
    """사용자 건강 기본 정보 테이블"""
    __tablename__ = "user_health_info"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("user.id"), nullable=False, unique=True)
    height = Column(DECIMAL(5, 2), nullable=False)
    weight = Column(DECIMAL(5, 2), nullable=False)
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="health_info")


class UserUnderlyingDisease(Base):
    """사용자 기저질환 테이블"""
    __tablename__ = "user_underlying_disease"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("user.id"), nullable=False)
    disease_name = Column(String(255), nullable=False)
    created_at = Column(DateTime, nullable=False, default=func.now())

    user = relationship("User", back_populates="underlying_diseases")


class HealthGoalType(Base):
    """건강 목표 카테고리 테이블"""
    __tablename__ = "health_goal_type"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)

    user_health_goals = relationship("UserHealthGoal", back_populates="goal_type")


class UserHealthGoal(Base):
    """사용자 건강 목표 테이블"""
    __tablename__ = "user_health_goal"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("user.id"), nullable=False)
    goal_type_id = Column(BigInteger, ForeignKey("health_goal_type.id"), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="health_goals")
    goal_type = relationship("HealthGoalType", back_populates="user_health_goals")


class SmokingInfo(Base):
    """사용자 흡연 습관 테이블"""
    __tablename__ = "smoking_info"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("user.id"), nullable=False, unique=True)
    smoking_status = Column(SmallInteger, nullable=False, default=0)  # 0: 비흡연, 1: 흡연, 2: 금연
    daily_amount = Column(SmallInteger, nullable=True)
    smoking_years = Column(SmallInteger, nullable=True)
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="smoking_info")


class AlcoholInfo(Base):
    """사용자 음주 습관 테이블"""
    __tablename__ = "alcohol_info"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("user.id"), nullable=False, unique=True)
    alcohol_status = Column(SmallInteger, nullable=False, default=0)  # 0: 비음주, 1: 음주
    frequency = Column(SmallInteger, nullable=True)
    amount = Column(SmallInteger, nullable=True)
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="alcohol_info")


class ExerciseInfo(Base):
    """사용자 운동 습관 테이블"""
    __tablename__ = "exercise_info"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("user.id"), nullable=False, unique=True)
    exercise_status = Column(SmallInteger, nullable=False, default=0)  # 0: 없음, 1: 있음
    frequency = Column(SmallInteger, nullable=True)
    duration = Column(SmallInteger, nullable=True)
    daily_steps = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="exercise_info")
    exercise_types = relationship("UserExerciseType", back_populates="exercise_info")


class ExerciseType(Base):
    """운동 종류 카테고리 테이블"""
    __tablename__ = "exercise_type"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False)

    user_exercise_types = relationship("UserExerciseType", back_populates="exercise_type")


class UserExerciseType(Base):
    """사용자 운동 종류 중간 테이블"""
    __tablename__ = "user_exercise_type"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    exercise_info_id = Column(BigInteger, ForeignKey("exercise_info.id"), nullable=False)
    exercise_type_id = Column(BigInteger, ForeignKey("exercise_type.id"), nullable=False)

    exercise_info = relationship("ExerciseInfo", back_populates="exercise_types")
    exercise_type = relationship("ExerciseType", back_populates="user_exercise_types")


class SleepInfo(Base):
    """사용자 수면 습관 테이블"""
    __tablename__ = "sleep_info"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("user.id"), nullable=False, unique=True)
    sleep_hours = Column(DECIMAL(3, 1), nullable=True)
    sleep_quality = Column(SmallInteger, nullable=True)  # 1~5
    sleep_disorder = Column(SmallInteger, nullable=False, default=0)  # 0: 없음, 1: 불면증
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="sleep_info")


class DietInfo(Base):
    """사용자 식사 습관 테이블"""
    __tablename__ = "diet_info"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("user.id"), nullable=False, unique=True)
    diet_type = Column(SmallInteger, nullable=False, default=0)  # 0: 일반, 1: 채식, 2: 비건
    daily_calories = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="diet_info")
    cuisines = relationship("UserCuisine", back_populates="diet_info")
    food_aversions = relationship("UserFoodAversion", back_populates="diet_info")
    allergies = relationship("UserAllergy", back_populates="diet_info")


class CuisineType(Base):
    """선호 음식 카테고리 테이블"""
    __tablename__ = "cuisine_type"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False)

    user_cuisines = relationship("UserCuisine", back_populates="cuisine_type")


class UserCuisine(Base):
    """사용자 선호 음식 중간 테이블"""
    __tablename__ = "user_cuisine"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    diet_info_id = Column(BigInteger, ForeignKey("diet_info.id"), nullable=False)
    cuisine_type_id = Column(BigInteger, ForeignKey("cuisine_type.id"), nullable=False)

    diet_info = relationship("DietInfo", back_populates="cuisines")
    cuisine_type = relationship("CuisineType", back_populates="user_cuisines")


class FoodAversionType(Base):
    """기피 음식 카테고리 테이블"""
    __tablename__ = "food_aversion_type"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False)

    user_food_aversions = relationship("UserFoodAversion", back_populates="food_aversion_type")


class UserFoodAversion(Base):
    """사용자 기피 음식 중간 테이블"""
    __tablename__ = "user_food_aversion"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    diet_info_id = Column(BigInteger, ForeignKey("diet_info.id"), nullable=False)
    food_aversion_type_id = Column(BigInteger, ForeignKey("food_aversion_type.id"), nullable=False)

    diet_info = relationship("DietInfo", back_populates="food_aversions")
    food_aversion_type = relationship("FoodAversionType", back_populates="user_food_aversions")


class AllergyType(Base):
    """알레르기 카테고리 테이블"""
    __tablename__ = "allergy_type"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False)

    user_allergies = relationship("UserAllergy", back_populates="allergy_type")


class UserAllergy(Base):
    """사용자 알레르기 중간 테이블"""
    __tablename__ = "user_allergy"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    diet_info_id = Column(BigInteger, ForeignKey("diet_info.id"), nullable=False)
    allergy_type_id = Column(BigInteger, ForeignKey("allergy_type.id"), nullable=False)

    diet_info = relationship("DietInfo", back_populates="allergies")
    allergy_type = relationship("AllergyType", back_populates="user_allergies")


class CaffeineDrinkType(Base):
    """카페인 음료 종류 테이블"""
    __tablename__ = "caffeine_drink_type"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False)
    caffeine_mg_per_cup = Column(SmallInteger, nullable=False)