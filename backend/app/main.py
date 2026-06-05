# main.py
# FastAPI 앱 진입점
# 라우터 등록 및 앱 초기화 담당

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.v1 import auth, users, medications, medical_records, health_checkups, guides, medication_guides, dashboard, ocr, push, medication_histories, sleep_guides, chat, attendance
from app.database import engine, Base
from app.models import (
    MedicationGuide,
    DrugInfo,
    DrugInfoDetail,
    DrugDoseLimit,
    DrugIngredientMap,
    DurConcurrentIngredient,
    DurConcurrentProduct,
    CaffeineDrinkType,
    ClinicalGuideline,
    SleepSurveyResponse,
    SleepSurveyCaffeine,
    SleepGuide,
    SleepGuideGuideline,
    Attendance,
    AttendanceStreak
)
from app.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(title="Viva API", version="1.0.0", lifespan=lifespan)

# DB 테이블 생성
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"[startup] create_all 건너뜀: {e}")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["User"])
app.include_router(medications.router, prefix="/api/v1/medications", tags=["Medication"])
app.include_router(medication_histories.router, prefix="/api/v1/medication-histories", tags=["Medication"])
app.include_router(medical_records.router, prefix="/api/v1/medical-records", tags=["MedicalRecord"])
app.include_router(health_checkups.router, prefix="/api/v1/health-checkups", tags=["HealthCheckup"])
app.include_router(guides.router, prefix="/api/v1/guides", tags=["Guide"])
app.include_router(medication_guides.router, prefix="/api/v1/medication_guides", tags=["Guide"])
app.include_router(sleep_guides.router, prefix="/api/v1/sleep_guides", tags=["Guide"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["Dashboard"])
app.include_router(ocr.router, prefix="/api/v1/ocr", tags=["OCR"])
app.include_router(push.router, prefix="/api/v1/push", tags=["Push"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["Chat"])
app.include_router(attendance.router, prefix="/api/v1/attendance", tags=["Attendance"])

# 정적 파일 서빙 (firebase-messaging-sw.js)
app.mount("/", StaticFiles(directory="app/static"), name="static")


@app.get("/")
def root():
    return {"message": "Viva API is running"}


# Medical_record 관련
from app.models import MedicalRecord, Prescription, Guide, Department
from app.models.fcm_token import FcmToken