# app/services/medical_record_service.py
# 진료기록 관련 비즈니스 로직

from datetime import date, timedelta
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.department import Department
from app.models.medical_record import MedicalRecord
from app.models.prescription import Prescription
from app.models.guide import Guide
from app.models.medication_schedule import MedicationSchedule
from app.models.medication_log import MedicationLog
from app.models.schedule_day import ScheduleDay
from app.models.notification import Notification
from app.models.user import UserProfile
from app.schemas.medical_record import (
    MedicalRecordCreateRequest, MedicalRecordCreateResponse,
    MedicalRecordUpdateRequest, MedicalRecordUpdateResponse,
    MedicalRecordListResponse, MedicalRecordSummary,
    MedicalRecordDetailResponse,
    MedicalRecordDeleteResponse,
    PrescriptionResponse, GuideResponse,
)
from app.schemas.safety import SafetyCheckResponse
from app.services import dur_service
from app.services.medication_service import _create_default_schedule
from app.services import point_service


# ── 내부 헬퍼 ─────────────────────────────────────────────

def _get_record_or_404(record_id: int, user_id: int, db: Session) -> MedicalRecord:
    record = db.query(MedicalRecord).filter(
        MedicalRecord.id == record_id,
        MedicalRecord.user_id == user_id,
        MedicalRecord.is_deleted == 0,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="medical_record_not_found")
    return record


def _validate_department(department_id: Optional[int], db: Session) -> None:
    if department_id is not None:
        if not db.query(Department).filter(Department.id == department_id).first():
            raise HTTPException(status_code=400, detail="invalid_department_id")


def _prescription_response(p: Prescription) -> PrescriptionResponse:
    return PrescriptionResponse(
        id=p.id,
        drug_name=p.drug_name,
        dosage=p.dosage,
        frequency=p.frequency,
        duration_days=p.duration_days,
    )


def _guide_response(guide: Optional[Guide]) -> GuideResponse:
    if not guide or not guide.is_generated:
        return GuideResponse(content=None, is_generated=False)
    return GuideResponse(content=guide.content, is_generated=True)


# ── 진료기록 등록 ─────────────────────────────────────────

def create_medical_record(
    request: MedicalRecordCreateRequest,
    user_id: int,
    db: Session,
) -> MedicalRecordCreateResponse:
    """진료기록 등록 - 처방약 함께 저장, 가이드 생성 트리거"""

    _validate_department(request.department_id, db)

    record = MedicalRecord(
        user_id=user_id,
        visit_date=request.visit_date,
        diagnosis_name=request.diagnosis_name,
        hospital_name=request.hospital_name,
        department_id=request.department_id,
    )
    db.add(record)
    db.flush()

    prescriptions = []
    for p in request.prescriptions:
        prescription = Prescription(
            medical_record_id=record.id,
            drug_name=p.drug_name,
            dosage=p.dosage,
            frequency=p.frequency,
            duration_days=p.duration_days,
            start_date=record.visit_date,
            end_date=(
                record.visit_date + timedelta(days=p.duration_days)
                if p.duration_days else None
            ),
        )
        db.add(prescription)
        prescriptions.append(prescription)
    db.flush()

    for prescription in prescriptions:
        _create_default_schedule(prescription, user_id, db)

    db.commit()
    db.refresh(record)
    for p in prescriptions:
        db.refresh(p)

    # 포인트 적립
    point_service.earn(user_id, "medical_record", db)
    db.commit()

    # TODO: 복약 안내 및 생활습관 가이드 비동기 생성 트리거
    # generate_guides_async.delay(record.id)

    return MedicalRecordCreateResponse(
        id=record.id,
        visit_date=record.visit_date,
        diagnosis_name=record.diagnosis_name,
        hospital_name=record.hospital_name,
        department_id=record.department_id,
        prescriptions=[_prescription_response(p) for p in prescriptions],
        created_at=record.created_at,
    )


# ── 진료기록 목록 조회 ────────────────────────────────────

def get_medical_records(
    user_id: int,
    db: Session,
    sort: str = "latest",
    department_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    keyword: Optional[str] = None,
) -> MedicalRecordListResponse:

    if sort not in ("latest", "oldest"):
        raise HTTPException(status_code=400, detail="invalid_sort")

    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=400, detail="invalid_date_range")

    _validate_department(department_id, db)

    query = db.query(MedicalRecord).filter(
        MedicalRecord.user_id == user_id,
        MedicalRecord.is_deleted == 0,
    )

    if department_id is not None:
        query = query.filter(MedicalRecord.department_id == department_id)
    if start_date:
        query = query.filter(MedicalRecord.visit_date >= start_date)
    if end_date:
        query = query.filter(MedicalRecord.visit_date <= end_date)

    if keyword:
        like = f"%{keyword}%"
        query = query.filter(
            (MedicalRecord.diagnosis_name.like(like)) |
            (MedicalRecord.hospital_name.like(like))
        )

    if sort == "latest":
        query = query.order_by(MedicalRecord.visit_date.desc())
    else:
        query = query.order_by(MedicalRecord.visit_date.asc())

    records = query.all()

    return MedicalRecordListResponse(
        medical_records=[
            MedicalRecordSummary(
                id=r.id,
                visit_date=r.visit_date,
                diagnosis_name=r.diagnosis_name,
                hospital_name=r.hospital_name,
                department_id=r.department_id,
                created_at=r.created_at,
            )
            for r in records
        ]
    )


# ── 진료기록 상세 조회 ────────────────────────────────────

def get_medical_record_detail(
    record_id: int,
    user_id: int,
    db: Session,
) -> MedicalRecordDetailResponse:

    record = _get_record_or_404(record_id, user_id, db)

    prescriptions = db.query(Prescription).filter(
        Prescription.medical_record_id == record.id
    ).all()

    medication_guide = db.query(Guide).filter(
        Guide.medical_record_id == record.id,
        Guide.guide_type == "medication",
    ).first()
    lifestyle_guide = db.query(Guide).filter(
        Guide.medical_record_id == record.id,
        Guide.guide_type == "lifestyle",
    ).first()

    return MedicalRecordDetailResponse(
        id=record.id,
        visit_date=record.visit_date,
        diagnosis_name=record.diagnosis_name,
        hospital_name=record.hospital_name,
        department_id=record.department_id,
        prescriptions=[_prescription_response(p) for p in prescriptions],
        medication_guide=_guide_response(medication_guide),
        lifestyle_guide=_guide_response(lifestyle_guide),
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


def get_record_safety_check(
    record_id: int,
    user_id: int,
    db: Session,
) -> SafetyCheckResponse:
    record = _get_record_or_404(record_id, user_id, db)
    prescriptions = db.query(Prescription).filter(
        Prescription.medical_record_id == record.id
    ).all()

    patient = None
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if profile and profile.birthday:
        today = date.today()
        b = profile.birthday
        patient = {"age": today.year - b.year - ((today.month, today.day) < (b.month, b.day))}

    result = dur_service.safety_check_record(db, record, prescriptions, patient)
    return dur_service.to_response(record_id, result)


# ── 진료기록 수정 ─────────────────────────────────────────

def update_medical_record(
    record_id: int,
    request: MedicalRecordUpdateRequest,
    user_id: int,
    db: Session,
) -> MedicalRecordUpdateResponse:

    record = _get_record_or_404(record_id, user_id, db)

    _validate_department(request.department_id, db)

    if request.visit_date is not None:
        record.visit_date = request.visit_date
    if request.diagnosis_name is not None:
        record.diagnosis_name = request.diagnosis_name
    if request.hospital_name is not None:
        record.hospital_name = request.hospital_name
    if request.department_id is not None:
        record.department_id = request.department_id

    if request.prescriptions is not None:
        incoming_ids = {p.id for p in request.prescriptions if p.id is not None}

        existing = db.query(Prescription).filter(
            Prescription.medical_record_id == record.id
        ).all()
        for existing_p in existing:
            if existing_p.id not in incoming_ids:
                db.delete(existing_p)

        for p in request.prescriptions:
            if p.id is not None:
                target = db.query(Prescription).filter(
                    Prescription.id == p.id,
                    Prescription.medical_record_id == record.id,
                ).first()
                if target:
                    target.drug_name = p.drug_name
                    target.dosage = p.dosage
                    target.frequency = p.frequency
                    target.duration_days = p.duration_days
            else:
                db.add(Prescription(
                    medical_record_id=record.id,
                    drug_name=p.drug_name,
                    dosage=p.dosage,
                    frequency=p.frequency,
                    duration_days=p.duration_days,
                ))

    db.commit()
    db.refresh(record)

    updated_prescriptions = db.query(Prescription).filter(
        Prescription.medical_record_id == record.id
    ).all()

    # TODO: 복약 안내 및 생활습관 가이드 재생성 트리거
    # regenerate_guides_async.delay(record.id)

    return MedicalRecordUpdateResponse(
        id=record.id,
        visit_date=record.visit_date,
        diagnosis_name=record.diagnosis_name,
        hospital_name=record.hospital_name,
        department_id=record.department_id,
        prescriptions=[_prescription_response(p) for p in updated_prescriptions],
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


# ── 진료기록 삭제 ─────────────────────────────────────────

def delete_medical_record(
    record_id: int,
    user_id: int,
    db: Session,
) -> MedicalRecordDeleteResponse:

    record = _get_record_or_404(record_id, user_id, db)

    # 진료기록 삭제 = 그 처방으로 만든 복약 일정·복용기록·알림까지 함께 삭제(자식→부모 순, FK 안전).
    presc_subq = db.query(Prescription.id).filter(Prescription.medical_record_id == record.id)
    sched_subq = db.query(MedicationSchedule.schedule_id).filter(
        MedicationSchedule.prescribed_medicine_id.in_(presc_subq)
    )
    db.query(MedicationLog).filter(MedicationLog.schedule_id.in_(sched_subq)).delete(synchronize_session=False)
    db.query(ScheduleDay).filter(ScheduleDay.schedule_id.in_(sched_subq)).delete(synchronize_session=False)
    db.query(Notification).filter(Notification.schedule_id.in_(sched_subq)).delete(synchronize_session=False)
    db.query(MedicationSchedule).filter(
        MedicationSchedule.prescribed_medicine_id.in_(presc_subq)
    ).delete(synchronize_session=False)

    db.query(Prescription).filter(
        Prescription.medical_record_id == record.id
    ).delete()

    db.query(Guide).filter(
        Guide.medical_record_id == record.id
    ).delete()

    record.is_deleted = 1
    db.commit()

    return MedicalRecordDeleteResponse(detail="medical_record_deleted")