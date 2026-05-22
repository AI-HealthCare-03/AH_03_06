# app/schemas/medical_record.py
# 진료기록 관련 요청/응답 스키마

from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, field_validator


# ── 처방약 ────────────────────────────────────────────────

class PrescriptionRequest(BaseModel):
    """등록용 처방약 (id 없음)"""
    drug_name: str                    # 처방약 이름 (필수)
    dosage: Optional[str] = None      # 복용량
    frequency: Optional[str] = None   # 복용 횟수
    duration_days: Optional[int] = None  # 복용 기간 (일)


class PrescriptionUpdateRequest(BaseModel):
    """수정용 처방약 (id 있으면 기존 수정, 없으면 신규 추가)"""
    id: Optional[int] = None          # 처방약 고유 ID (기존 처방약 수정 시)
    drug_name: str                    # 처방약 이름 (필수)
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    duration_days: Optional[int] = None


class PrescriptionResponse(BaseModel):
    id: int                      # 처방약 고유 ID
    drug_name: str               # 처방약 이름
    dosage: Optional[str]        # 복용량
    frequency: Optional[str]     # 복용 횟수
    duration_days: Optional[int] # 복용 기간 (일)


# ── 가이드 ────────────────────────────────────────────────

class GuideResponse(BaseModel):
    content: Optional[str]      # 안내 내용 (미생성 시 null)
    is_generated: bool          # 생성 완료 여부


# ── 진료기록 등록 ─────────────────────────────────────────

class MedicalRecordCreateRequest(BaseModel):
    visit_date: date                            # 진료일 (YYYY-MM-DD) (필수)
    diagnosis_name: str                         # 진단명 (필수)
    hospital_name: Optional[str] = None         # 진료 기관명
    department_id: Optional[int] = None         # 진료과 ID
    prescriptions: list[PrescriptionRequest] = []  # 처방약 목록

    @field_validator("visit_date")
    def validate_visit_date(cls, v):
        if v > date.today():
            raise ValueError("invalid_visit_date")
        return v

    @field_validator("diagnosis_name")
    def validate_diagnosis_name(cls, v):
        if not v or not v.strip():
            raise ValueError("empty_fields")
        return v


class MedicalRecordCreateResponse(BaseModel):
    id: int                                     # 진료기록 고유 ID
    visit_date: date                            # 진료일
    diagnosis_name: str                         # 진단명
    hospital_name: Optional[str]                # 진료 기관명
    department_id: Optional[int]                # 진료과 ID
    prescriptions: list[PrescriptionResponse]   # 처방약 목록
    created_at: datetime                        # 생성일시


# ── 진료기록 수정 ─────────────────────────────────────────

class MedicalRecordUpdateRequest(BaseModel):
    visit_date: Optional[date] = None                          # 진료일
    diagnosis_name: Optional[str] = None                       # 진단명
    hospital_name: Optional[str] = None                        # 진료 기관명
    department_id: Optional[int] = None                        # 진료과 ID
    prescriptions: Optional[list[PrescriptionUpdateRequest]] = None  # 처방약 목록 (None이면 변경 없음)

    @field_validator("visit_date")
    def validate_visit_date(cls, v):
        if v is not None and v > date.today():
            raise ValueError("invalid_visit_date")
        return v

    @field_validator("diagnosis_name")
    def validate_diagnosis_name(cls, v):
        if v is not None and not v.strip():
            raise ValueError("missing_required_field")
        return v


class MedicalRecordUpdateResponse(BaseModel):
    id: int                                     # 진료기록 고유 ID
    visit_date: date                            # 진료일
    diagnosis_name: str                         # 진단명
    hospital_name: Optional[str]                # 진료 기관명
    department_id: Optional[int]                # 진료과 ID
    prescriptions: list[PrescriptionResponse]   # 처방약 목록
    created_at: datetime                        # 생성일시
    updated_at: datetime                        # 수정일시


# ── 진료기록 목록 조회 ────────────────────────────────────

class MedicalRecordSummary(BaseModel):
    id: int                      # 진료기록 고유 ID
    visit_date: date             # 진료일
    diagnosis_name: str          # 진단명
    hospital_name: Optional[str] # 진료 기관명
    department_id: Optional[int] # 진료과 ID
    created_at: datetime         # 생성일시


class MedicalRecordListResponse(BaseModel):
    medical_records: list[MedicalRecordSummary]  # 진료기록 목록


# ── 진료기록 상세 조회 ────────────────────────────────────

class MedicalRecordDetailResponse(BaseModel):
    id: int                                     # 진료기록 고유 ID
    visit_date: date                            # 진료일
    diagnosis_name: str                         # 진단명
    hospital_name: Optional[str]                # 진료 기관명
    department_id: Optional[int]                # 진료과 ID
    prescriptions: list[PrescriptionResponse]   # 처방약 목록
    medication_guide: GuideResponse             # 복약 안내
    lifestyle_guide: GuideResponse              # 생활습관 가이드
    created_at: datetime                        # 생성일시
    updated_at: datetime                        # 수정일시


# ── 진료기록 삭제 ─────────────────────────────────────────

class MedicalRecordDeleteResponse(BaseModel):
    detail: str                  # "medical_record_deleted"