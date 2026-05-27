# api/v1/medications.py
# 복약 관련 엔드포인트 담당
# 복용 약 등록/삭제
# 복약 일정 등록/조회/수정
# 복약 알림 수정
# 복약 완료율 대시보드
# 복약 이력 기간별 조회

from typing import Optional
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.utils.auth import get_current_user
from app.services import medication_service
from app.schemas.medication import (
    PrescriptionCreateRequest,
    PrescriptionResponse,
    PrescriptionDeleteResponse,
    MedicationScheduleRequest,
    MedicationScheduleResponse,
    MedicationScheduleListResponse,
    MedicationAlarmUpdateRequest,
    MedicationAlarmUpdateResponse,
    MedicationDashboardResponse,
)

router = APIRouter()


# POST /api/v1/prescriptions - 복용 약 등록
@router.post("/prescriptions", response_model=PrescriptionResponse, status_code=201)
def create_prescription(
    request: PrescriptionCreateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return medication_service.create_prescription(current_user.id, request, db)


# DELETE /api/v1/prescriptions/{id} - 복용 약 삭제
@router.delete("/prescriptions/{prescription_id}", response_model=PrescriptionDeleteResponse)
def delete_prescription(
    prescription_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return medication_service.delete_prescription(current_user.id, prescription_id, db)


# POST /api/v1/medications/{medicationId}/schedules - 복약 일정 등록
@router.post("/{medication_id}/schedules", response_model=MedicationScheduleResponse, status_code=201)
def create_schedule(
    medication_id: int,
    request: MedicationScheduleRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return medication_service.create_schedule(current_user.id, medication_id, request, db)


# GET /api/v1/medications/{medicationId}/schedules - 복약 일정 조회
@router.get("/{medication_id}/schedules", response_model=MedicationScheduleListResponse)
def get_schedules(
    medication_id: int,
    active: Optional[bool] = Query(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return medication_service.get_schedules(current_user.id, medication_id, active, db)


# PUT /api/v1/medications/{medicationId}/schedules - 복약 일정 수정
@router.put("/{medication_id}/schedules", response_model=MedicationScheduleResponse, status_code=201)
def update_schedule(
    medication_id: int,
    request: MedicationScheduleRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return medication_service.update_schedule(current_user.id, medication_id, request, db)


# PATCH /api/v1/medication-alarms/{alarm_id} - 복약 알림 수정
@router.patch("/alarms/{alarm_id}", response_model=MedicationAlarmUpdateResponse)
def update_alarm(
    alarm_id: int,
    request: MedicationAlarmUpdateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return medication_service.update_alarm(current_user.id, alarm_id, request, db)


# GET /api/v1/medications/dashboard - 복약 완료율 대시보드
@router.get("/dashboard", response_model=MedicationDashboardResponse)
def get_dashboard(
    period: str = Query(...),
    date: Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return medication_service.get_dashboard(current_user.id, period, date, db)


# GET /api/v1/medication-schedules - 복약 이력 기간별 조회
@router.get("/schedules", response_model=None)
def get_medication_history(
    start_date: date = Query(...),
    end_date: date = Query(...),
    drug_name: Optional[str] = Query(default=None),
    page: int = Query(default=1),
    size: int = Query(default=20),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return medication_service.get_medication_history(current_user.id, start_date, end_date, drug_name, page, size, db)