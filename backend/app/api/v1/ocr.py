# api/v1/ocr.py
# OCR 관련 엔드포인트 담당
# 처방전 이미지 업로드 → 필드 추출 결과 반환

from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.ocr import PrescriptionOCRResponse
from app.services import ocr_service

router = APIRouter()


# POST /api/v1/ocr/prescription - 처방전 OCR 필드 추출
@router.post("/prescription", response_model=PrescriptionOCRResponse)
async def ocr_prescription(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    return await ocr_service.extract_prescription(file, db)