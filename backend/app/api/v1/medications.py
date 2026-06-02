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
    PrescriptionListResponse,
    MedicationListResponse,
    MedicationScheduleRequest,
    MedicationScheduleResponse,
    MedicationScheduleListResponse,
    MedicationAlarmUpdateRequest,
    MedicationAlarmUpdateResponse,
    MedicationDashboardResponse,
    TodayMedicationResponse,
    DateMedicationResponse,
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


# GET /api/v1/prescriptions - 약 목록
@router.get("/prescriptions", response_model=PrescriptionListResponse)
def get_prescriptions(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return medication_service.get_prescriptions(current_user.id, db)

# GET /api/v1/medications/list - 복약관리 목록 (처방약 + 직접등록)
@router.get("/list", response_model=MedicationListResponse)
def get_medication_list(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return medication_service.get_medication_list(current_user.id, db)

# GET /api/v1/medications/today - 오늘의 복약
@router.get("/today", response_model=TodayMedicationResponse)
def get_today_medications(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return medication_service.get_today_medications(current_user.id, db)


# GET /api/v1/medications/by-date - 날짜별 복약
@router.get("/by-date", response_model=DateMedicationResponse)
def get_medications_by_date(
    date: date = Query(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return medication_service.get_medications_by_date(current_user.id, date, db)


# POST /api/v1/medications/schedules - 복약 일정 등록 (처방전 있어도 없어도 됨)
@router.post("/schedules", response_model=MedicationScheduleResponse, status_code=201)
def create_schedule(
    request: MedicationScheduleRequest,
    medication_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return medication_service.create_schedule(current_user.id, medication_id, request, db)


# GET /api/v1/medications/{medication_id}/schedules - 복약 일정 조회
@router.get("/{medication_id}/schedules", response_model=MedicationScheduleListResponse)
def get_schedules(
    medication_id: int,
    active: Optional[bool] = Query(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return medication_service.get_schedules(current_user.id, medication_id, active, db)


# PUT /api/v1/medications/schedules/{schedule_id} - 복약 일정 수정
@router.put("/schedules/{schedule_id}", response_model=MedicationScheduleResponse, status_code=201)
def update_schedule(
    schedule_id: int,
    request: MedicationScheduleRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return medication_service.update_schedule(current_user.id, schedule_id, request, db)

# DELETE /api/v1/medications/schedules/{schedule_id} - 복약 일정 삭제
@router.delete("/schedules/{schedule_id}", status_code=200)
def delete_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return medication_service.delete_schedule(current_user.id, schedule_id, db)

# PATCH /api/v1/medications/alarms/{alarm_id} - 복약 알림 수정
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


# GET /api/v1/medications/schedules - 복약 이력 기간별 조회
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