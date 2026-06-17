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
    MedicationDetailResponse,
    MedicationUpdateRequest,
    MedicationScheduleRequest,
    MedicationScheduleResponse,
    MedicationScheduleListResponse,
    MedicationAlarmUpdateRequest,
    MedicationAlarmUpdateResponse,
    MedicationDashboardResponse,
    MedicationCheckRequest,
    TodayMedicationResponse,
    DateMedicationResponse,
    MedicationCalendarResponse,
    MedicationAnalysisResponse,
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


# PATCH /api/v1/medications/prescriptions/{id}/discontinue - 복용 약 종료 처리(비활성화, 기록 보존)
@router.patch("/prescriptions/{prescription_id}/discontinue", response_model=PrescriptionDeleteResponse)
def discontinue_prescription(
    prescription_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return medication_service.discontinue_prescription(current_user.id, prescription_id, db)


# PATCH /api/v1/medications/prescriptions/{id}/resume - 종료된 복용 약 재개
@router.patch("/prescriptions/{prescription_id}/resume", response_model=PrescriptionDeleteResponse)
def resume_prescription(
    prescription_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return medication_service.resume_prescription(current_user.id, prescription_id, db)


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


# PATCH /api/v1/medications/schedules/{schedule_id}/discontinue - 직접등록 약 종료 처리
@router.patch("/schedules/{schedule_id}/discontinue", status_code=200)
def discontinue_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return medication_service.discontinue_schedule(current_user.id, schedule_id, db)


# PATCH /api/v1/medications/schedules/{schedule_id}/resume - 종료된 직접등록 약 재개
@router.patch("/schedules/{schedule_id}/resume", status_code=200)
def resume_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return medication_service.resume_schedule(current_user.id, schedule_id, db)

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

@router.patch("/check")
def check_medication(
    request: MedicationCheckRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return medication_service.check_medication(current_user.id, request, db)


# GET /api/v1/medications/calendar - 복약 기록 달력(성실/누락 일자)
# 동적 경로(/{medication_id})보다 위에 선언하여, 'calendar'가 id 파라미터로 잘못 인식되는 것을 방지
@router.get("/calendar", response_model=MedicationCalendarResponse)
def medication_calendar(
    year: int = Query(...),
    month: int = Query(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return medication_service.get_medication_calendar(current_user.id, year, month, db)


# GET /api/v1/medications/analysis - 복약 분석 배너(최근 7일 달성률)
@router.get("/analysis", response_model=MedicationAnalysisResponse)
def medication_analysis(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return medication_service.get_medication_analysis(current_user.id, db)


# GET /api/v1/medications/{medication_id} - 수정 폼 로드 (source=prescription|custom)
# 동적 단일경로라, 고정 경로(/list·/today·/schedules·/calendar·/analysis 등) 뒤에 선언하여 경로 충돌을 방지
@router.get("/{medication_id}", response_model=MedicationDetailResponse)
def get_medication_detail(
    medication_id: int,
    source: str = Query(default="prescription"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return medication_service.get_medication_by_id(current_user.id, medication_id, source, db)


# PUT /api/v1/medications/{medication_id} - 수정 저장 (source=prescription|custom)
@router.put("/{medication_id}")
def update_medication(
    medication_id: int,
    request: MedicationUpdateRequest,
    source: str = Query(default="prescription"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return medication_service.update_medication(current_user.id, medication_id, source, request, db)