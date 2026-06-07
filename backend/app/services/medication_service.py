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
    MedicationDetailResponse,
    MedicationUpdateRequest,
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
    MedicationCalendarResponse,
    MedicationAnalysisResponse,
)
import calendar as _calendar

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
        meal_basis=schedule.meal_basis,
        timing_offset_min=schedule.timing_offset_min,
        notification_type=schedule.notification_type,
        is_active=schedule.is_active,
        is_custom=schedule.is_custom,
        days=days,
        start_date=schedule.start_date,
        end_date=schedule.end_date,
    )


_MEAL_TO_TIME = {"아침": "08:00", "점심": "13:00", "저녁": "18:00", "취침": "22:00"}
_COUNT_TIMES = {
    1: ["08:00"],
    2: ["08:00", "18:00"],
    3: ["08:00", "13:00", "18:00"],
    4: ["08:00", "13:00", "18:00", "22:00"],
}


def _times_from_frequency(frequency: Optional[str]) -> list:
    """처방 frequency → 복용 시간 목록.
    시간대 단어(아침/점심/저녁/취침) 우선, 없으면 '1일 N회' 횟수.
    1~4회는 식사 기준 기본값, 5회 이상은 기상~취침(08~22) 균등 분배.
    (정확한 N시간 간격·격일은 자동 표현 불가 — 등록 후 '수정'에서 시간 직접 조정)"""
    f = frequency or ""
    meals = sorted({t for kw, t in _MEAL_TO_TIME.items() if kw in f})
    if meals:
        return meals
    m = re.search(r"(\d+)\s*회", f)
    n = int(m.group(1)) if m else 1
    if n in _COUNT_TIMES:
        return _COUNT_TIMES[n]
    if n <= 1:
        return ["08:00"]
    return [f"{(8 + round(14 * i / (n - 1))):02d}:00" for i in range(n)]


def _interval_from_frequency(frequency: Optional[str]) -> Optional[int]:
    """처방 frequency → 복용 간격(일). 격일=2·N주=N*7·주1회=7·N일마다=N.
    '1일 N회'(하루 여러 번)는 매일이라 간격 아님(None). 매일/시간대 기반도 None."""
    f = (frequency or "").replace(" ", "")
    if "1일" in f:
        return None
    if "격일" in f or "이틀" in f:
        return 2
    m = re.search(r"(\d+)주", f)
    if m:
        return int(m.group(1)) * 7
    if "매주" in f or "주1회" in f:
        return 7
    m = re.search(r"(\d+)일", f)
    if m and int(m.group(1)) > 1:
        return int(m.group(1))
    return None


def _is_prn(frequency: Optional[str]) -> bool:
    """필요시 복용(PRN) 여부 — 정해진 시간 없음."""
    f = frequency or ""
    return "필요시" in f or "prn" in f.lower()


def _create_default_schedule(prescription: Prescription, user_id: int, db: Session):
    """처방 frequency 기준으로 복용 시간대마다 스케줄 1행씩 생성. PRN은 1행(필요시)."""
    prn = _is_prn(prescription.frequency)
    times = ["08:00"] if prn else _times_from_frequency(prescription.frequency)
    interval = None if prn else _interval_from_frequency(prescription.frequency)
    for t in times:
        schedule = MedicationSchedule(
            user_id=user_id,
            prescribed_medicine_id=prescription.id,
            drug_name=prescription.drug_name,
            intake_time=t,
            dosage_message=prescription.dosage,
            notification_type="PUSH",
            is_active=True,
            is_custom=False,
            start_date=prescription.start_date,
            end_date=prescription.end_date,
            interval_days=interval,
            is_as_needed=prn,
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
        start_date=medical_record.visit_date,
        end_date=(
            medical_record.visit_date + timedelta(days=request.duration_days)
            if request.duration_days else None
        ),
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
    today = date.today()

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
        active = [s for s in p.medication_schedules if s.is_active]
        prn = any(s.is_as_needed for s in active)
        times = [] if prn else sorted({str(s.intake_time)[:5] for s in active})
        cards.append(MedicationCardItem(
            id=p.id, source="prescription", drug_name=p.drug_name,
            dosage=p.dosage, frequency=p.frequency,
            start_date=p.start_date, end_date=p.end_date,
            is_active=p.is_active and (p.end_date is None or p.end_date >= today),
            dosage_text=p.dosage, times=times, is_as_needed=prn,
        ))

    # 직접등록 (처방전 없는 custom 일정) - 같은 약은 하나로 묶고 복용시간 모음
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
    grouped: dict = {}
    for s in customs:
        g = grouped.get(s.drug_name)
        if g is None:
            grouped[s.drug_name] = g = {"first": s, "times": set(), "dosage": s.dosage_message, "prn": False}
        g["times"].add(str(s.intake_time)[:5])
        if s.is_as_needed:
            g["prn"] = True
    for name, g in grouped.items():
        s = g["first"]
        cards.append(MedicationCardItem(
            id=s.schedule_id, source="custom", drug_name=name,
            dosage=None, frequency=None,
            start_date=s.start_date, end_date=s.end_date,
            is_active=s.is_active and (s.end_date is None or s.end_date >= today),
            dosage_text=g["dosage"], times=([] if g["prn"] else sorted(g["times"])), is_as_needed=g["prn"],
        ))

    return MedicationListResponse(medications=cards)


def _custom_group(user_id: int, drug_name: str, db: Session):
    """직접등록(custom) 같은 약 = 같은 drug_name·user·처방없음 스케줄 묶음."""
    return db.query(MedicationSchedule).filter(
        MedicationSchedule.user_id == user_id,
        MedicationSchedule.drug_name == drug_name,
        MedicationSchedule.prescribed_medicine_id.is_(None),
        MedicationSchedule.is_active == True,
    ).all()


def _delete_schedules(schedules: list, db: Session):
    """스케줄 제거 — 연결된 로그·요일까지 함께 (FK 충돌 방지)."""
    for s in schedules:
        db.query(MedicationLog).filter(MedicationLog.schedule_id == s.schedule_id).delete()
        db.query(ScheduleDay).filter(ScheduleDay.schedule_id == s.schedule_id).delete()
        db.delete(s)
    db.flush()


def _create_schedules(user_id, prescribed_medicine_id, drug_name, dosage_message,
                      times, days, notification_type, start_date, end_date, db,
                      interval_days=None, is_as_needed=False,
                      meal_basis=None, timing_offset_min=None) -> int:
    """복용 시간(times)마다 스케줄 1행씩 생성. 첫 schedule_id 반환."""
    first_id = None
    for t in times:
        sched = MedicationSchedule(
            user_id=user_id,
            prescribed_medicine_id=prescribed_medicine_id,
            drug_name=drug_name,
            intake_time=t,
            dosage_message=dosage_message,
            notification_type=notification_type or "PUSH",
            is_active=True,
            is_custom=prescribed_medicine_id is None,
            start_date=start_date,
            end_date=end_date,
            interval_days=interval_days,
            is_as_needed=is_as_needed,
            meal_basis=meal_basis,
            timing_offset_min=timing_offset_min,
        )
        db.add(sched)
        db.flush()
        if first_id is None:
            first_id = sched.schedule_id
        for d in days:
            db.add(ScheduleDay(schedule_id=sched.schedule_id, day_of_week=d))
    return first_id


def get_medication_by_id(user_id: int, medication_id: int, source: str, db: Session) -> MedicationDetailResponse:
    """수정 폼 로드 — source(prescription|custom)별 단건 상세."""
    if source == "custom":
        base = db.query(MedicationSchedule).filter(
            MedicationSchedule.schedule_id == medication_id,
            MedicationSchedule.user_id == user_id,
        ).first()
        if not base:
            raise HTTPException(status_code=404, detail="medication_not_found")
        scheds = _custom_group(user_id, base.drug_name, db)
        drug_name, dosage_message = base.drug_name, base.dosage_message
        start_date, end_date = base.start_date, base.end_date
    else:
        presc = db.query(Prescription).join(MedicalRecord).filter(
            Prescription.id == medication_id,
            MedicalRecord.user_id == user_id,
            MedicalRecord.is_deleted == 0,
        ).first()
        if not presc:
            raise HTTPException(status_code=404, detail="medication_not_found")
        scheds = [s for s in presc.medication_schedules if s.is_active]
        drug_name, dosage_message = presc.drug_name, presc.dosage
        start_date, end_date = presc.start_date, presc.end_date

    times = sorted({str(s.intake_time)[:5] for s in scheds})
    days = sorted({sd.day_of_week for s in scheds for sd in s.schedule_days})
    interval_days = next((s.interval_days for s in scheds if s.interval_days), None)
    is_as_needed = any(s.is_as_needed for s in scheds)
    meal_basis = next((s.meal_basis for s in scheds if s.meal_basis), None)
    timing_offset_min = next((s.timing_offset_min for s in scheds if s.timing_offset_min is not None), None)
    return MedicationDetailResponse(
        id=medication_id, source=source, drug_name=drug_name,
        dosage_message=dosage_message, start_date=start_date, end_date=end_date,
        times=times, days=days, interval_days=interval_days, is_as_needed=is_as_needed,
        meal_basis=meal_basis, timing_offset_min=timing_offset_min,
    )


def _reconcile_schedules(existing, user_id, prescribed_medicine_id, drug_name, dosage_message,
                         times, days, notification_type, start_date, end_date, db,
                         interval_days=None, is_as_needed=False,
                         meal_basis=None, timing_offset_min=None) -> int:
    """기존 스케줄과 새 times를 시간(HH:MM) 단위로 대조해 증분 반영.

    같은 시간 슬롯은 유지하고 필드만 갱신(schedule_id 보존 → 복약 로그 유지), 빠진 시간은
    삭제, 새 시간만 생성. 전부 삭제→재생성과 달리 변경되지 않은 시간의 체크 이력이 살아남는다.
    """
    want = []                       # 새 시간(HH:MM, 순서 보존 dedupe)
    for t in times:
        key = str(t)[:5]
        if key not in want:
            want.append(key)

    existing_by_time = {}
    for s in existing:
        existing_by_time.setdefault(str(s.intake_time)[:5], []).append(s)

    first_id = None
    for time_key, scheds in existing_by_time.items():
        if time_key in want:
            keep = scheds[0]        # 유지 — 필드만 갱신(로그 보존)
            keep.drug_name = drug_name
            keep.dosage_message = dosage_message
            keep.notification_type = notification_type or "PUSH"
            keep.start_date = start_date
            keep.end_date = end_date
            keep.interval_days = interval_days
            keep.is_as_needed = is_as_needed
            keep.meal_basis = meal_basis
            keep.timing_offset_min = timing_offset_min
            db.query(ScheduleDay).filter(ScheduleDay.schedule_id == keep.schedule_id).delete()
            for d in days:
                db.add(ScheduleDay(schedule_id=keep.schedule_id, day_of_week=d))
            if first_id is None:
                first_id = keep.schedule_id
            if len(scheds) > 1:     # 같은 시간 중복행(이례적) 정리
                _delete_schedules(scheds[1:], db)
        else:
            _delete_schedules(scheds, db)   # 빠진 시간 — 슬롯·로그 삭제

    db.flush()

    new_times = [t for t in want if t not in existing_by_time]
    if new_times:
        nid = _create_schedules(
            user_id, prescribed_medicine_id, drug_name, dosage_message,
            new_times, days, notification_type, start_date, end_date, db,
            interval_days=interval_days, is_as_needed=is_as_needed,
            meal_basis=meal_basis, timing_offset_min=timing_offset_min,
        )
        if first_id is None:
            first_id = nid

    return first_id


def update_medication(user_id: int, medication_id: int, source: str, request: MedicationUpdateRequest, db: Session):
    """수정 저장 — 기존 스케줄과 새 시간을 대조해 증분 반영. 처방이면 prescription 필드도 갱신.

    유지된 시간 슬롯의 복약 로그는 보존되고, 삭제된 시간 슬롯의 로그만 함께 제거된다.
    """
    if not request.times:
        raise HTTPException(status_code=400, detail="times_required")
    for t in request.times:
        _validate_intake_time(t)
    if request.days:
        _validate_days(request.days)
    days = request.days or ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]

    if source == "custom":
        base = db.query(MedicationSchedule).filter(
            MedicationSchedule.schedule_id == medication_id,
            MedicationSchedule.user_id == user_id,
        ).first()
        if not base:
            raise HTTPException(status_code=404, detail="medication_not_found")
        existing = _custom_group(user_id, base.drug_name, db)
        first_id = _reconcile_schedules(
            existing, user_id, None, request.drug_name, request.dosage_message,
            request.times, days, request.notification_type, request.start_date, request.end_date, db,
            interval_days=request.interval_days, is_as_needed=request.is_as_needed,
            meal_basis=request.meal_basis, timing_offset_min=request.timing_offset_min,
        )
        db.commit()
        return {"id": first_id, "source": "custom", "detail": "updated"}

    presc = db.query(Prescription).join(MedicalRecord).filter(
        Prescription.id == medication_id,
        MedicalRecord.user_id == user_id,
        MedicalRecord.is_deleted == 0,
    ).first()
    if not presc:
        raise HTTPException(status_code=404, detail="medication_not_found")
    presc.drug_name = request.drug_name
    presc.dosage = request.dosage_message
    if request.start_date:
        presc.start_date = request.start_date
    presc.end_date = request.end_date
    existing = db.query(MedicationSchedule).filter(
        MedicationSchedule.prescribed_medicine_id == presc.id
    ).all()
    _reconcile_schedules(
        existing, user_id, presc.id, request.drug_name, request.dosage_message,
        request.times, days, request.notification_type, presc.start_date, presc.end_date, db,
        interval_days=request.interval_days, is_as_needed=request.is_as_needed,
        meal_basis=request.meal_basis, timing_offset_min=request.timing_offset_min,
    )
    db.commit()
    return {"id": presc.id, "source": "prescription", "detail": "updated"}


def _occurs_on(s, target_date: date) -> bool:
    """스케줄 s가 target_date에 복용 예정인지 — 간격·요일·기간·PRN 반영.
    달력/분석처럼 여러 날을 훑을 때도 쓰므로 start/end 기간 검사를 포함한다."""
    if s.is_as_needed:
        return False
    if s.start_date and target_date < s.start_date:
        return False
    if s.end_date and target_date > s.end_date:
        return False
    iv = s.interval_days
    if iv and iv > 1:
        anchor = s.start_date or (s.created_at.date() if s.created_at else None)
        if anchor is None or target_date < anchor:
            return False
        return (target_date - anchor).days % iv == 0
    sched_days = {sd.day_of_week for sd in s.schedule_days}
    return (not sched_days) or (DAY_MAP[target_date.weekday()] in sched_days)


def _user_active_schedules(user_id: int, db: Session) -> list:
    """사용자의 활성 스케줄 전체(처방·custom) — 기간 필터 없이. 달력/분석에서 날짜별로 _occurs_on 적용."""
    return (
        db.query(MedicationSchedule)
        .outerjoin(Prescription, MedicationSchedule.prescribed_medicine_id == Prescription.id)
        .outerjoin(MedicalRecord, Prescription.medical_record_id == MedicalRecord.id)
        .filter(MedicationSchedule.is_active == True)
        .filter(
            (MedicalRecord.user_id == user_id) |
            (MedicationSchedule.user_id == user_id)
        )
        .all()
    )


def get_today_medications(user_id: int, db: Session) -> TodayMedicationResponse:
    return get_medications_by_date(user_id, date.today(), db)


def get_medications_by_date(user_id: int, target_date: date, db: Session) -> DateMedicationResponse:
    schedules = (
        db.query(MedicationSchedule)
        .outerjoin(Prescription, MedicationSchedule.prescribed_medicine_id == Prescription.id)
        .outerjoin(MedicalRecord, Prescription.medical_record_id == MedicalRecord.id)
        .filter(
            MedicationSchedule.is_active == True,
            (MedicationSchedule.start_date == None) | (MedicationSchedule.start_date <= target_date),
            (MedicationSchedule.end_date == None) | (MedicationSchedule.end_date >= target_date),
        )
        .filter(
            (MedicalRecord.user_id == user_id) |
            (MedicationSchedule.user_id == user_id)
        )
        .all()
    )

    # 간격(N일마다) 약은 기준일 기준 날짜 계산, 그 외는 요일 매칭
    schedules = [s for s in schedules if _occurs_on(s, target_date)]

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
            meal_basis=s.meal_basis,
            timing_offset_min=s.timing_offset_min,
        ))

    result.sort(key=lambda x: x.intake_time)
    return DateMedicationResponse(date=target_date, schedules=result)


def get_medication_calendar(user_id: int, year: int, month: int, db: Session) -> MedicationCalendarResponse:
    """해당 월의 성실(doneDays)·누락(missedDays) 일자 배열.
    doneDays  = 그 달 TAKEN 로그가 있는 날.
    missedDays = 예정 복용일(오늘 이전·이번 달) 중 TAKEN 로그가 없는 날.
    ※ check_medication은 TAKEN만 적재 → 누락은 '예정 vs 실제'로 도출(로그만으론 못 구함).
    """
    last_day = _calendar.monthrange(year, month)[1]
    month_start = date(year, month, 1)
    month_end = date(year, month, last_day)
    today = date.today()

    taken_logs = (
        db.query(MedicationLog)
        .filter(
            MedicationLog.user_id == user_id,
            MedicationLog.status == 'TAKEN',
            MedicationLog.intake_date >= month_start,
            MedicationLog.intake_date <= month_end,
        )
        .all()
    )
    done_days = {log.intake_date.day for log in taken_logs}

    schedules = _user_active_schedules(user_id, db)
    missed_days = set()
    # 오늘은 아직 복용 가능 → 누락 판정에서 제외(어제까지만)
    limit = min(month_end, today - timedelta(days=1))
    d = month_start
    while d <= limit:
        if d.day not in done_days and any(_occurs_on(s, d) for s in schedules):
            missed_days.add(d.day)
        d += timedelta(days=1)

    return MedicationCalendarResponse(doneDays=sorted(done_days), missedDays=sorted(missed_days))


def get_medication_analysis(user_id: int, db: Session) -> MedicationAnalysisResponse:
    """최근 7일(어제까지) 예정 복용 횟수 대비 TAKEN 비율(정수 %)."""
    today = date.today()
    end = today - timedelta(days=1)   # 오늘은 진행 중이라 제외
    start = end - timedelta(days=6)   # 7일 구간

    schedules = _user_active_schedules(user_id, db)
    expected = 0
    d = start
    while d <= end:
        expected += sum(1 for s in schedules if _occurs_on(s, d))
        d += timedelta(days=1)

    taken = (
        db.query(MedicationLog)
        .filter(
            MedicationLog.user_id == user_id,
            MedicationLog.status == 'TAKEN',
            MedicationLog.intake_date >= start,
            MedicationLog.intake_date <= end,
        )
        .count()
    )

    rate = round(min(taken, expected) / expected * 100) if expected else 0
    return MedicationAnalysisResponse(periodLabel="최근 7일", achievementRate=rate)


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
        start_date=request.start_date,
        end_date=request.end_date,
        interval_days=request.interval_days,
        is_as_needed=request.is_as_needed or False,
        meal_basis=request.meal_basis,
        timing_offset_min=request.timing_offset_min,
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
            prescription_id=log.medication_schedule.prescribed_medicine_id if log.medication_schedule else None,
            drug_name=log.medication_schedule.drug_name if log.medication_schedule else '',
            dosage=log.medication_schedule.prescription.dosage if log.medication_schedule and log.medication_schedule.prescription else None,
            frequency=log.medication_schedule.prescription.frequency if log.medication_schedule and log.medication_schedule.prescription else None,
            start_date=log.medication_schedule.prescription.start_date if log.medication_schedule and log.medication_schedule.prescription else None,
            end_date=log.medication_schedule.prescription.end_date if log.medication_schedule and log.medication_schedule.prescription else None,
            created_at=log.created_at,
            checked_at=log.checked_at,
        )
        for log in logs
    ]
    return MedicationHistoryResponse(total=total, page=page, size=size, items=items)

def check_medication(user_id: int, request, db: Session):
    from datetime import datetime
    from app.models.medication_log import MedicationLog

    schedule_id = request.medicationId
    today = date.today()

    existing_log = db.query(MedicationLog).filter(
        MedicationLog.user_id == user_id,
        MedicationLog.schedule_id == schedule_id,
        MedicationLog.intake_date == today,
    ).first()

    if request.isChecked:
        if not existing_log:
            log = MedicationLog(
                user_id=user_id,
                schedule_id=schedule_id,
                intake_date=today,
                status='TAKEN',
                checked_at=datetime.now(),
            )
            db.add(log)
    else:
        if existing_log:
            db.delete(existing_log)

    db.commit()
    return {"detail": "ok"}