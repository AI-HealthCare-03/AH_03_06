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
    PrescriptionListResponse,
    PrescriptionListItem,
    MedicationCardItem,
    MedicationListResponse,
    MedicationScheduleRequest,
    MedicationScheduleResponse,
    MedicationScheduleListResponse,
    MedicationAlarmUpdateRequest,
    MedicationAlarmUpdateResponse,
    MedicationDashboardResponse,
    DailyMedicationRate,
    MedicationRate,
    TodayMedicationResponse,
    DateMedicationResponse,
    TodayMedicationScheduleItem,
)

VALID_DAYS = {"MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"}
VALID_NOTIFICATION_TYPES = {"PUSH", "SMS", "EMAIL"}
TIME_PATTERN = re.compile(r"^\d{2}:\d{2}$")
DAY_MAP = {0: 'MON', 1: 'TUE', 2: 'WED', 3: 'THU', 4: 'FRI', 5: 'SAT', 6: 'SUN'}


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
        is_custom=schedule.is_custom,
        days=days,
    )


def _create_default_schedule(prescription: Prescription, user_id: int, db: Session):
    schedule = MedicationSchedule(
        user_id=user_id,
        prescribed_medicine_id=prescription.id,
        drug_name=prescription.drug_name,
        intake_time="08:00",
        notification_type="PUSH",
        is_active=True,
        is_custom=False,
    )
    db.add(schedule)
    db.flush()
    for day in ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]:
        db.add(ScheduleDay(schedule_id=schedule.schedule_id, day_of_week=day))


def create_prescription(user_id: int, request: PrescriptionCreateRequest, db: Session) -> PrescriptionResponse:
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
    db.flush()
    _create_default_schedule(prescription, user_id, db)
    db.commit()
    db.refresh(prescription)
    return PrescriptionResponse.model_validate(prescription)


def delete_prescription(user_id: int, prescription_id: int, db: Session) -> PrescriptionDeleteResponse:
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


def get_prescriptions(user_id: int, db: Session) -> PrescriptionListResponse:
    prescriptions = (
        db.query(Prescription)
        .join(MedicalRecord)
        .filter(
            MedicalRecord.user_id == user_id,
            MedicalRecord.is_deleted == 0,
            Prescription.is_active == True,
        )
        .order_by(Prescription.created_at.desc())
        .all()
    )
    for p in prescriptions:
        if not p.medication_schedules:
            _create_default_schedule(p, user_id, db)
    db.commit()
    return PrescriptionListResponse(
        prescriptions=[PrescriptionListItem.model_validate(p) for p in prescriptions]
    )

def get_medication_list(user_id: int, db: Session) -> MedicationListResponse:
    """복약관리 목록 - 처방약 + 직접등록(custom)을 한 목록으로 반환"""
    cards = []

    # 처방전 기반 (진료기록에 연결된 약)
    prescriptions = (
        db.query(Prescription)
        .join(MedicalRecord)
        .filter(
            MedicalRecord.user_id == user_id,
            MedicalRecord.is_deleted == 0,
            Prescription.is_active == True,
        )
        .order_by(Prescription.created_at.desc())
        .all()
    )
    for p in prescriptions:
        cards.append(MedicationCardItem(
            id=p.id, source="prescription", drug_name=p.drug_name,
            dosage=p.dosage, frequency=p.frequency,
            start_date=p.start_date, end_date=p.end_date, is_active=p.is_active,
        ))

    # 직접등록 (처방전 없는 custom 일정) - 같은 약은 하나로 묶음
    customs = (
        db.query(MedicationSchedule)
        .filter(
            MedicationSchedule.user_id == user_id,
            MedicationSchedule.prescribed_medicine_id.is_(None),
            MedicationSchedule.is_active == True,
        )
        .order_by(MedicationSchedule.created_at.desc())
        .all()
    )
    seen = set()
    for s in customs:
        if s.drug_name in seen:
            continue
        seen.add(s.drug_name)
        cards.append(MedicationCardItem(
            id=s.schedule_id, source="custom", drug_name=s.drug_name,
            dosage=None, frequency=None, start_date=None, end_date=None,
            is_active=s.is_active,
        ))

    return MedicationListResponse(medications=cards)

def get_today_medications(user_id: int, db: Session) -> TodayMedicationResponse:
    return get_medications_by_date(user_id, date.today(), db)


def get_medications_by_date(user_id: int, target_date: date, db: Session) -> DateMedicationResponse:
    day_of_week = DAY_MAP[target_date.weekday()]

    schedules = (
        db.query(MedicationSchedule)
        .outerjoin(Prescription, MedicationSchedule.prescribed_medicine_id == Prescription.id)
        .outerjoin(MedicalRecord, Prescription.medical_record_id == MedicalRecord.id)
        .join(MedicationSchedule.schedule_days)
        .filter(
            MedicationSchedule.is_active == True,
            ScheduleDay.day_of_week == day_of_week,
        )
        .filter(
            (MedicalRecord.user_id == user_id) |
            (MedicationSchedule.user_id == user_id)
        )
        .all()
    )

    logs = (
        db.query(MedicationLog)
        .filter(
            MedicationLog.user_id == user_id,
            MedicationLog.intake_date == target_date,
        )
        .all()
    )
    log_map = {log.schedule_id: log for log in logs}

    result = []
    for s in schedules:
        log = log_map.get(s.schedule_id)
        result.append(TodayMedicationScheduleItem(
            schedule_id=s.schedule_id,
            drug_name=s.drug_name,
            dosage=s.prescription.dosage if s.prescription else None,
            intake_time=s.intake_time,
            dosage_message=s.dosage_message,
            is_taken=log.status == 'TAKEN' if log else False,
            log_id=log.log_id if log else None,
        ))

    result.sort(key=lambda x: x.intake_time)
    return DateMedicationResponse(date=target_date, schedules=result)


def create_schedule(user_id: int, medication_id: Optional[int], request: MedicationScheduleRequest, db: Session) -> MedicationScheduleResponse:
    _validate_intake_time(request.intake_time)
    if request.notification_type:
        _validate_notification_type(request.notification_type)
    if request.days:
        _validate_days(request.days)

    drug_name = request.drug_name if hasattr(request, 'drug_name') and request.drug_name else None

    if medication_id:
        prescription = db.query(Prescription).join(MedicalRecord).filter(
            Prescription.id == medication_id,
            MedicalRecord.user_id == user_id,
            MedicalRecord.is_deleted == 0
        ).first()
        if not prescription:
            raise HTTPException(status_code=404, detail="medication_not_found")
        drug_name = prescription.drug_name

    if not drug_name:
        raise HTTPException(status_code=400, detail="drug_name_required")

    schedule = MedicationSchedule(
        user_id=user_id,
        prescribed_medicine_id=medication_id,
        drug_name=drug_name,
        intake_time=request.intake_time,
        dosage_message=request.dosage_message,
        notification_type=request.notification_type or "PUSH",
        is_active=True,
        is_custom=request.is_custom or False,
    )
    db.add(schedule)
    db.flush()
    for day in (request.days or []):
        db.add(ScheduleDay(schedule_id=schedule.schedule_id, day_of_week=day))
    db.commit()
    db.refresh(schedule)
    return _schedule_to_response(schedule)


def get_schedules(user_id: int, medication_id: int, active: Optional[bool], db: Session) -> MedicationScheduleListResponse:
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
    return MedicationScheduleListResponse(schedules=[_schedule_to_response(s) for s in schedules])


def update_schedule(user_id: int, schedule_id: int, request: MedicationScheduleRequest, db: Session) -> MedicationScheduleResponse:
    _validate_intake_time(request.intake_time)
    if request.notification_type:
        _validate_notification_type(request.notification_type)
    if request.days:
        _validate_days(request.days)
    schedule = db.query(MedicationSchedule).filter(
        MedicationSchedule.schedule_id == schedule_id,
        MedicationSchedule.user_id == user_id,
    ).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="schedule_not_found")
    schedule.intake_time = request.intake_time
    schedule.dosage_message = request.dosage_message
    schedule.notification_type = request.notification_type or "PUSH"
    schedule.is_custom = True
    if hasattr(request, 'drug_name') and request.drug_name:
        schedule.drug_name = request.drug_name
    db.query(ScheduleDay).filter(ScheduleDay.schedule_id == schedule.schedule_id).delete()
    for day in (request.days or []):
        db.add(ScheduleDay(schedule_id=schedule.schedule_id, day_of_week=day))
    db.commit()
    db.refresh(schedule)
    return _schedule_to_response(schedule)

def delete_schedule(user_id: int, schedule_id: int, db: Session):
    schedule = db.query(MedicationSchedule).filter(
        MedicationSchedule.schedule_id == schedule_id,
        MedicationSchedule.user_id == user_id,
    ).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="schedule_not_found")
    db.delete(schedule)
    db.commit()
    return {"detail": "schedule_deleted"}

def update_alarm(user_id: int, alarm_id: int, request: MedicationAlarmUpdateRequest, db: Session) -> MedicationAlarmUpdateResponse:
    if not any([request.medication_name, request.alarm_time, request.alarm_days, request.is_active is not None]):
        raise HTTPException(status_code=400, detail="empty_request_body")
    if request.alarm_time and not TIME_PATTERN.match(request.alarm_time):
        raise HTTPException(status_code=400, detail="invalid_alarm_time")
    if request.alarm_days is not None:
        if len(request.alarm_days) == 0:
            raise HTTPException(status_code=400, detail="empty_alarm_days")
        _validate_days(request.alarm_days)
    schedule = db.query(MedicationSchedule).filter(
        MedicationSchedule.schedule_id == alarm_id,
        MedicationSchedule.user_id == user_id,
    ).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="alarm_not_found")
    if request.alarm_time:
        schedule.intake_time = request.alarm_time
        schedule.is_custom = True
    if request.is_active is not None:
        schedule.is_active = request.is_active
    if request.medication_name:
        schedule.drug_name = request.medication_name
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
        medication_name=schedule.drug_name,
        alarm_time=str(schedule.intake_time)[:5],
        alarm_days=days,
        is_active=schedule.is_active,
        updated_at=datetime.now(),
    )


def get_dashboard(user_id: int, period: str, reference_date: Optional[date], db: Session) -> MedicationDashboardResponse:
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
    schedules = db.query(MedicationSchedule).outerjoin(
        Prescription, MedicationSchedule.prescribed_medicine_id == Prescription.id
    ).outerjoin(MedicalRecord, Prescription.medical_record_id == MedicalRecord.id).filter(
        MedicationSchedule.is_active == True
    ).filter(
        (MedicalRecord.user_id == user_id) |
        (MedicationSchedule.user_id == user_id)
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
        med_id = schedule.schedule_id
        if med_id not in medication_map:
            medication_map[med_id] = {"name": schedule.drug_name, "total": 0, "taken": 0}
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


def get_medication_history(user_id: int, start_date: date, end_date: date, drug_name: Optional[str], page: int, size: int, db: Session):
    query = (
        db.query(MedicationLog)
        .outerjoin(MedicationSchedule, MedicationLog.schedule_id == MedicationSchedule.schedule_id)
        .filter(
            MedicationLog.user_id == user_id,
            MedicationLog.intake_date >= start_date,
            MedicationLog.intake_date <= end_date,
        )
    )
    if drug_name:
        query = query.filter(MedicationSchedule.drug_name.like(f"%{drug_name}%"))

    total = query.count()
    logs = query.order_by(MedicationLog.intake_date.desc()).offset((page - 1) * size).limit(size).all()

    from app.schemas.medication import MedicationHistoryResponse, MedicationHistoryItem
    items = [
        MedicationHistoryItem(
            id=log.log_id,
            prescription_id=log.schedule.prescribed_medicine_id if log.schedule else None,
            drug_name=log.schedule.drug_name if log.schedule else '',
            dosage=log.schedule.prescription.dosage if log.schedule and log.schedule.prescription else None,
            frequency=log.schedule.prescription.frequency if log.schedule and log.schedule.prescription else None,
            start_date=log.schedule.prescription.start_date if log.schedule and log.schedule.prescription else None,
            end_date=log.schedule.prescription.end_date if log.schedule and log.schedule.prescription else None,
            created_at=log.created_at,
        )
        for log in logs
    ]
    return MedicationHistoryResponse(total=total, page=page, size=size, items=items)