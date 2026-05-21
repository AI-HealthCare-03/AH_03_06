# main.py
# FastAPI 앱 진입점
# 라우터 등록 및 앱 초기화 담당

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import auth, users, medications, medical_records, health_checkups, guides, medication_guides, dashboard
from app.database import engine, Base
from app.models import (
    MedicationGuide,
    DrugInfo,
    DrugInfoDetail,
    DrugDoseLimit,
    DrugIngredientMap,
    DurConcurrentIngredient,
    DurConcurrentProduct,
)
app = FastAPI(title="Viva API", version="1.0.0")

# DB 테이블 생성
Base.metadata.create_all(bind=engine)

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
app.include_router(medical_records.router, prefix="/api/v1/medical-records", tags=["MedicalRecord"])
app.include_router(health_checkups.router, prefix="/api/v1/health-checkups", tags=["HealthCheckup"])
app.include_router(guides.router, prefix="/api/v1/guides", tags=["Guide"])
app.include_router(medication_guides.router, prefix="/api/v1/medication_guides", tags=["Guide"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["Dashboard"])

@app.get("/")
def root():
    return {"message": "Viva API is running"}