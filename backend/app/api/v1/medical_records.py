# api/v1/medical_records.py
# 진료기록 관련 엔드포인트 담당
# 진료기록 등록/조회/수정/삭제
# 진료기록 상세 조회
# OCR 처리

from fastapi import APIRouter

router = APIRouter()

# POST /api/v1/medical-records - 진료기록 등록
@router.post("")
def create_medical_record():
    pass

# GET /api/v1/medical-records - 진료기록 목록 조회
@router.get("")
def get_medical_records():
    pass

# GET /api/v1/medical-records/{id} - 진료기록 상세 조회
@router.get("/{record_id}")
def get_medical_record(record_id: int):
    pass

# PUT /api/v1/medical-records/{id} - 진료기록 수정
@router.put("/{record_id}")
def update_medical_record(record_id: int):
    pass

# DELETE /api/v1/medical-records/{id} - 진료기록 삭제
@router.delete("/{record_id}")
def delete_medical_record(record_id: int):
    pass

# POST /api/v1/medical-records/ocr - 처방전 OCR 처리
@router.post("/ocr")
def process_ocr():
    pass