# app/services/medication_service.py
# 복약 관련 비즈니스 로직

import re
from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.prescription import Prescription
from app.models.medication_schedule import MedicationSchedule
from app.models.schedule_day import ScheduleDay
from app.models.medication_log import MedicationLog
from app.models.medical_record import MedicalRecord
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
    DailyMedicationRate,
    MedicationRate,
)

VALID_DAYS = {"MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"}
VALID_NOTIFICATION_TYPES = {"PUSH", "SMS", "EMAIL"}
TIME_PATTERN = re.compile(r"^\d{2}:\d{2}$")


def _validate_intake_time(intake_time: str):
    if not TIME_PATTERN.match(intake_time):
        raise HTTPException(status_code=400, detail="invalid_intake_time")


def _validate_notification_type(notification_type: str):
    if notification_type not in VALID_NOTIFICATION_TYPES:
        raise HTTPException(status_code=400, detail="invalid_notification_type")


def _validate_days(days: list):
    for day in days:
        if day not in VALID_DAYS:
            raise HTTPException(status_code=400, detail="invalid_days")


def _schedule_to_response(schedule: MedicationSchedule) -> MedicationScheduleResponse:
    days = [sd.day_of_week for sd in schedule.schedule_days]
    return MedicationScheduleResponse(
        id=schedule.schedule_id,
        medication_id=schedule.prescribed_medicine_id,
        intake_time=str(schedule.intake_time)[:5],
        dosage_message=schedule.dosage_message,
        is_after_meal=None,
        notification_type=schedule.notification_type,
        is_active=schedule.is_active,
        days=days,
    )


# 복용 약 등록
def create_prescription(
    user_id: int,
    request: PrescriptionCreateRequest,
    db: Session
) -> PrescriptionResponse:
    medical_record = db.query(MedicalRecord).filter(
        MedicalRecord.id == request.medical_record_id,
        MedicalRecord.user_id == user_id,
        MedicalRecord.is_deleted == 0
    ).first()

    if not medical_record:
        raise HTTPException(status_code=404, detail="medical_record_not_found")

    if request.start_date and request.end_date:
        if request.end_date < request.start_date:
            raise HTTPException(status_code=400, detail="invalid_prescription_period")

    prescription = Prescription(
        medical_record_id=request.medical_record_id,
        drug_id=request.drug_id,
        drug_name=request.drug_name,
        dosage=request.dosage,
        frequency=request.frequency,
        duration_days=request.duration_days,
        start_date=request.start_date,
        end_date=request.end_date,
        is_active=request.is_active if request.is_active is not None else True,
    )
    db.add(prescription)
    db.commit()
    db.refresh(prescription)
    return PrescriptionResponse.model_validate(prescription)


# 복용 약 삭제
def delete_prescription(
    user_id: int,
    prescription_id: int,
    db: Session
) -> PrescriptionDeleteResponse:
    prescription = db.query(Prescription).join(MedicalRecord).filter(
        Prescription.id == prescription_id,
        MedicalRecord.user_id == user_id,
        MedicalRecord.is_deleted == 0
    ).first()

    if not prescription:
        raise HTTPException(status_code=404, detail="prescription_not_found")

    db.delete(prescription)
    db.commit()
    return PrescriptionDeleteResponse(detail="prescription_deleted")


# 복약 일정 등록
def create_schedule(
    user_id: int,
    medication_id: int,
    request: MedicationScheduleRequest,
    db: Session
) -> MedicationScheduleResponse:
    _validate_intake_time(request.intake_time)
    if request.notification_type:
        _validate_notification_type(request.notification_type)
    if request.days:
        _validate_days(request.days)

    prescription = db.query(Prescription).join(MedicalRecord).filter(
        Prescription.id == medication_id,
        MedicalRecord.user_id == user_id,
        MedicalRecord.is_deleted == 0
    ).first()

    if not prescription:
        raise HTTPException(status_code=404, detail="medication_not_found")

    schedule = MedicationSchedule(
        prescribed_medicine_id=medication_id,
        intake_time=request.intake_time,
        dosage_message=request.dosage_message,
        notification_type=request.notification_type or "PUSH",
        is_active=True,
    )
    db.add(schedule)
    db.flush()

    for day in (request.days or []):
        db.add(ScheduleDay(schedule_id=schedule.schedule_id, day_of_week=day))

    db.commit()
    db.refresh(schedule)
    return _schedule_to_response(schedule)


# 복약 일정 조회
def get_schedules(
    user_id: int,
    medication_id: int,
    active: Optional[bool],
    db: Session
) -> MedicationScheduleListResponse:
    prescription = db.query(Prescription).join(MedicalRecord).filter(
        Prescription.id == medication_id,
        MedicalRecord.user_id == user_id,
        MedicalRecord.is_deleted == 0
    ).first()

    if not prescription:
        raise HTTPException(status_code=404, detail="medication_not_found")

    query = db.query(MedicationSchedule).filter(
        MedicationSchedule.prescribed_medicine_id == medication_id
    )
    if active is True:
        query = query.filter(MedicationSchedule.is_active == True)

    schedules = query.all()
    return MedicationScheduleListResponse(
        schedules=[_schedule_to_response(s) for s in schedules]
    )


# 복약 일정 수정
def update_schedule(
    user_id: int,
    medication_id: int,
    request: MedicationScheduleRequest,
    db: Session
) -> MedicationScheduleResponse:
    _validate_intake_time(request.intake_time)
    if request.notification_type:
        _validate_notification_type(request.notification_type)
    if request.days:
        _validate_days(request.days)

    prescription = db.query(Prescription).join(MedicalRecord).filter(
        Prescription.id == medication_id,
        MedicalRecord.user_id == user_id,
        MedicalRecord.is_deleted == 0
    ).first()

    if not prescription:
        raise HTTPException(status_code=404, detail="medication_not_found")

    schedule = db.query(MedicationSchedule).filter(
        MedicationSchedule.prescribed_medicine_id == medication_id
    ).first()

    if not schedule:
        raise HTTPException(status_code=404, detail="medication_not_found")

    schedule.intake_time = request.intake_time
    schedule.dosage_message = request.dosage_message
    schedule.notification_type = request.notification_type or "PUSH"

    db.query(ScheduleDay).filter(ScheduleDay.schedule_id == schedule.schedule_id).delete()
    for day in (request.days or []):
        db.add(ScheduleDay(schedule_id=schedule.schedule_id, day_of_week=day))

    db.commit()
    db.refresh(schedule)
    return _schedule_to_response(schedule)


# 복약 알림 수정
def update_alarm(
    user_id: int,
    alarm_id: int,
    request: MedicationAlarmUpdateRequest,
    db: Session
) -> MedicationAlarmUpdateResponse:
    if not any([request.medication_name, request.alarm_time, request.alarm_days, request.is_active is not None]):
        raise HTTPException(status_code=400, detail="empty_request_body")

    if request.alarm_time and not TIME_PATTERN.match(request.alarm_time):
        raise HTTPException(status_code=400, detail="invalid_alarm_time")

    if request.alarm_days is not None:
        if len(request.alarm_days) == 0:
            raise HTTPException(status_code=400, detail="empty_alarm_days")
        _validate_days(request.alarm_days)

    schedule = db.query(MedicationSchedule).join(
        Prescription, MedicationSchedule.prescribed_medicine_id == Prescription.id
    ).join(MedicalRecord).filter(
        MedicationSchedule.schedule_id == alarm_id,
        MedicalRecord.user_id == user_id,
        MedicalRecord.is_deleted == 0
    ).first()

    if not schedule:
        raise HTTPException(status_code=404, detail="alarm_not_found")

    if request.alarm_time:
        schedule.intake_time = request.alarm_time
    if request.is_active is not None:
        schedule.is_active = request.is_active
    if request.medication_name:
        schedule.prescription.drug_name = request.medication_name
    if request.alarm_days:
        days = list(set(request.alarm_days))
        db.query(ScheduleDay).filter(ScheduleDay.schedule_id == schedule.schedule_id).delete()
        for day in days:
            db.add(ScheduleDay(schedule_id=schedule.schedule_id, day_of_week=day))

    db.commit()
    db.refresh(schedule)

    days = [sd.day_of_week for sd in schedule.schedule_days]
    return MedicationAlarmUpdateResponse(
        id=schedule.schedule_id,
        medication_name=schedule.prescription.drug_name,
        alarm_time=str(schedule.intake_time)[:5],
        alarm_days=days,
        is_active=schedule.is_active,
        updated_at=datetime.now(),
    )


# 복약 완료율 대시보드
def get_dashboard(
    user_id: int,
    period: str,
    reference_date: Optional[date],
    db: Session
) -> MedicationDashboardResponse:
    if period not in ("weekly", "monthly"):
        raise HTTPException(status_code=400, detail="invalid_period")

    today = date.today()
    ref = reference_date or today

    if period == "weekly":
        start_date = ref - timedelta(days=ref.weekday())
        end_date = start_date + timedelta(days=6)
    else:
        start_date = ref.replace(day=1)
        next_month = (ref.replace(day=28) + timedelta(days=4)).replace(day=1)
        end_date = next_month - timedelta(days=1)

    end_date = min(end_date, today)

    schedules = db.query(MedicationSchedule).join(
        Prescription, MedicationSchedule.prescribed_medicine_id == Prescription.id
    ).join(MedicalRecord).filter(
        MedicalRecord.user_id == user_id,
        MedicalRecord.is_deleted == 0,
        MedicationSchedule.is_active == True
    ).all()

    logs = db.query(MedicationLog).filter(
        MedicationLog.user_id == user_id,
        MedicationLog.intake_date >= start_date,
        MedicationLog.intake_date <= end_date,
    ).all()

    log_map = {(l.schedule_id, l.intake_date): l.status for l in logs}

    daily_map = {}
    medication_map = {}

    current = start_date
    while current <= end_date:
        daily_map[current] = {"total": 0, "taken": 0}
        current += timedelta(days=1)

    for schedule in schedules:
        days_set = {sd.day_of_week for sd in schedule.schedule_days}
        med_id = schedule.prescribed_medicine_id
        if med_id not in medication_map:
            medication_map[med_id] = {
                "name": schedule.prescription.drug_name,
                "total": 0,
                "taken": 0
            }

        current = start_date
        while current <= end_date:
            day_str = current.strftime("%a").upper()[:3]
            if not days_set or day_str in days_set:
                daily_map[current]["total"] += 1
                medication_map[med_id]["total"] += 1
                status = log_map.get((schedule.schedule_id, current))
                if status == "TAKEN":
                    daily_map[current]["taken"] += 1
                    medication_map[med_id]["taken"] += 1
            current += timedelta(days=1)

    total_total = sum(v["total"] for v in daily_map.values())
    total_taken = sum(v["taken"] for v in daily_map.values())
    overall_rate = round(total_taken / total_total * 100, 2) if total_total > 0 else 0.0

    daily = [
        DailyMedicationRate(
            date=d,
            total=v["total"],
            taken=v["taken"],
            rate=round(v["taken"] / v["total"] * 100, 1) if v["total"] > 0 else 0.0
        )
        for d, v in sorted(daily_map.items())
    ]

    medications = [
        MedicationRate(
            medication_id=med_id,
            name=v["name"],
            total=v["total"],
            taken=v["taken"],
            rate=round(v["taken"] / v["total"] * 100, 1) if v["total"] > 0 else 0.0
        )
        for med_id, v in medication_map.items()
    ]

    return MedicationDashboardResponse(
        period=period,
        start_date=start_date,
        end_date=end_date,
        overall_rate=overall_rate,
        daily=daily,
        medications=medications,
    )