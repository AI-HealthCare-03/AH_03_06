# app/services/medical_record_service.py
# 진료기록 관련 비즈니스 로직

from datetime import date
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.department import Department
from app.models.medical_record import MedicalRecord
from app.models.prescription import Prescription
from app.models.guide import Guide  # medication_guide, lifestyle_guide를 관리하는 모델
from app.models.user import UserProfile  # 노인주의 검증용 생년월일
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


# ── 내부 헬퍼 ─────────────────────────────────────────────

def _get_record_or_404(record_id: int, user_id: int, db: Session) -> MedicalRecord:
    """진료기록 조회 - 없거나 본인 소유가 아니면 404"""
    record = db.query(MedicalRecord).filter(
        MedicalRecord.id == record_id,
        MedicalRecord.user_id == user_id,
        MedicalRecord.is_deleted == 0,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="medical_record_not_found")
    return record


def _validate_department(department_id: Optional[int], db: Session) -> None:
    """진료과 ID 유효성 검증"""
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
    """Guide 모델 → GuideResponse 변환 (미생성 시 is_generated=False)"""
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

    # 진료과 ID 유효성 검증
    _validate_department(request.department_id, db)

    # 진료기록 생성
    record = MedicalRecord(
        user_id=user_id,
        visit_date=request.visit_date,
        diagnosis_name=request.diagnosis_name,
        hospital_name=request.hospital_name,
        department_id=request.department_id,
    )
    db.add(record)
    db.flush()  # record.id 확보

    # 처방약 저장
    prescriptions = []
    for p in request.prescriptions:
        prescription = Prescription(
            medical_record_id=record.id,
            drug_name=p.drug_name,
            dosage=p.dosage,
            frequency=p.frequency,
            duration_days=p.duration_days,
        )
        db.add(prescription)
        prescriptions.append(prescription)

    db.commit()
    db.refresh(record)
    for p in prescriptions:
        db.refresh(p)

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
    """진료기록 목록 조회 - 정렬/필터/검색 지원"""

    # 정렬 값 검증
    if sort not in ("latest", "oldest"):
        raise HTTPException(status_code=400, detail="invalid_sort")

    # 날짜 범위 검증
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=400, detail="invalid_date_range")

    # 진료과 ID 유효성 검증
    _validate_department(department_id, db)

    query = db.query(MedicalRecord).filter(
        MedicalRecord.user_id == user_id,
        MedicalRecord.is_deleted == 0,
    )

    # 필터 적용
    if department_id is not None:
        query = query.filter(MedicalRecord.department_id == department_id)
    if start_date:
        query = query.filter(MedicalRecord.visit_date >= start_date)
    if end_date:
        query = query.filter(MedicalRecord.visit_date <= end_date)

    # 키워드 검색 (진단명 OR 진료 기관명)
    if keyword:
        like = f"%{keyword}%"
        query = query.filter(
            (MedicalRecord.diagnosis_name.like(like)) |
            (MedicalRecord.hospital_name.like(like))
        )

    # 정렬
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
    """진료기록 상세 조회 - 처방약, 복약 안내, 생활습관 가이드 포함"""

    record = _get_record_or_404(record_id, user_id, db)

    # 처방약 조회
    prescriptions = db.query(Prescription).filter(
        Prescription.medical_record_id == record.id
    ).all()

    # 가이드 조회 (없으면 is_generated=False 반환)
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
    """진료기록 처방 묶음의 복약 안전점검 (병용금기·동일성분/효능군 중복·회수약)."""
    record = _get_record_or_404(record_id, user_id, db)
    prescriptions = db.query(Prescription).filter(
        Prescription.medical_record_id == record.id
    ).all()

    # 노인주의 검증용 나이 (user_profile.birthday). 프로필 없으면 노인주의 skip.
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
    """진료기록 수정 - 처방약 upsert/삭제, 가이드 재생성 트리거"""

    record = _get_record_or_404(record_id, user_id, db)

    # 진료과 ID 유효성 검증
    _validate_department(request.department_id, db)

    # 진료기록 필드 업데이트 (전달된 값만 반영)
    if request.visit_date is not None:
        record.visit_date = request.visit_date
    if request.diagnosis_name is not None:
        record.diagnosis_name = request.diagnosis_name
    if request.hospital_name is not None:
        record.hospital_name = request.hospital_name
    if request.department_id is not None:
        record.department_id = request.department_id

    # 처방약 수정 (prescriptions가 전달된 경우에만 처리)
    if request.prescriptions is not None:
        # 요청에 포함된 기존 처방약 ID 목록
        incoming_ids = {p.id for p in request.prescriptions if p.id is not None}

        # 요청에 없는 기존 처방약 삭제
        existing = db.query(Prescription).filter(
            Prescription.medical_record_id == record.id
        ).all()
        for existing_p in existing:
            if existing_p.id not in incoming_ids:
                db.delete(existing_p)

        # 기존 처방약 수정 / 신규 처방약 추가
        for p in request.prescriptions:
            if p.id is not None:
                # id가 있으면 기존 처방약 수정
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
                # id가 없으면 신규 처방약 추가
                db.add(Prescription(
                    medical_record_id=record.id,
                    drug_name=p.drug_name,
                    dosage=p.dosage,
                    frequency=p.frequency,
                    duration_days=p.duration_days,
                ))

    db.commit()
    db.refresh(record)

    # 수정된 처방약 목록 조회
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
    """진료기록 삭제 - 처방약 및 연관 가이드 함께 삭제 (soft delete)"""

    record = _get_record_or_404(record_id, user_id, db)

    # 연관 처방약 삭제
    db.query(Prescription).filter(
        Prescription.medical_record_id == record.id
    ).delete()

    # 연관 가이드 삭제 (복약 안내, 생활습관 가이드)
    db.query(Guide).filter(
        Guide.medical_record_id == record.id
    ).delete()

    # 진료기록 soft delete
    record.is_deleted = 1
    db.commit()

    return MedicalRecordDeleteResponse(detail="medical_record_deleted")