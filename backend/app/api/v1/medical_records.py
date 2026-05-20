# api/v1/medical_records.py
# 진료기록 관련 엔드포인트 담당
# 진료기록 등록/조회/수정/삭제
# 진료기록 상세 조회
# OCR 처리

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.medical_record import (
    MedicalRecordCreateRequest, MedicalRecordCreateResponse,
    MedicalRecordUpdateRequest, MedicalRecordUpdateResponse,
    MedicalRecordListResponse,
    MedicalRecordDetailResponse,
    MedicalRecordDeleteResponse,
)
from app.services import medical_record_service

router = APIRouter()

# POST /api/v1/medical-records - 진료기록 등록
@router.post("", response_model=MedicalRecordCreateResponse, status_code=201)
def create_medical_record(
    request: MedicalRecordCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return medical_record_service.create_medical_record(request, current_user.id, db)

# GET /api/v1/medical-records - 진료기록 목록 조회
@router.get("", response_model=MedicalRecordListResponse)
def get_medical_records(
    sort: str = Query(default="latest", description="정렬 순서 (latest/oldest)"),
    department_id: Optional[int] = Query(default=None, description="진료과 필터"),
    start_date: Optional[date] = Query(default=None, description="조회 시작일 (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(default=None, description="조회 종료일 (YYYY-MM-DD)"),
    keyword: Optional[str] = Query(default=None, description="진단명 또는 진료 기관명 검색어"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return medical_record_service.get_medical_records(
        user_id=current_user.id,
        db=db,
        sort=sort,
        department_id=department_id,
        start_date=start_date,
        end_date=end_date,
        keyword=keyword,
    )

# GET /api/v1/medical-records/{id} - 진료기록 상세 조회
@router.get("/{record_id}", response_model=MedicalRecordDetailResponse)
def get_medical_record_detail(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return medical_record_service.get_medical_record_detail(record_id, current_user.id, db)

# PUT /api/v1/medical-records/{id} - 진료기록 수정
@router.put("/{record_id}", response_model=MedicalRecordUpdateResponse)
def update_medical_record(
    record_id: int,
    request: MedicalRecordUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return medical_record_service.update_medical_record(record_id, request, current_user.id, db)

# DELETE /api/v1/medical-records/{id} - 진료기록 삭제
@router.delete("/{record_id}", response_model=MedicalRecordDeleteResponse)
def delete_medical_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return medical_record_service.delete_medical_record(record_id, current_user.id, db)

# POST /api/v1/medical-records/ocr - 처방전 OCR 처리
@router.post("/ocr")
def process_ocr():
    pass