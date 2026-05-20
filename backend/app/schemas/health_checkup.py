# app/schemas/health_checkup.py
# 건강검진 관련 요청/응답 스키마

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


# 건강검진 데이터 입력 요청
class HealthCheckupCreateRequest(BaseModel):
    checkup_year: int                          # 검진 기준연도 (필수)
    bp_systolic: Optional[int] = None         # 수축기 혈압
    bp_diastolic: Optional[int] = None        # 이완기 혈압
    fasting_glucose: Optional[int] = None     # 공복혈당
    total_cholesterol: Optional[int] = None   # 총콜레스테롤
    hdl: Optional[int] = None                 # HDL 콜레스테롤
    ldl: Optional[int] = None                 # LDL 콜레스테롤
    triglyceride: Optional[int] = None        # 중성지방
    height: Optional[float] = None            # 신장 (cm)
    weight: Optional[float] = None            # 체중 (kg)
    waist: Optional[float] = None             # 허리둘레 (cm)
    hemoglobin: Optional[float] = None        # 혈색소
    creatinine: Optional[float] = None        # 혈청크레아티닌
    ast: Optional[int] = None                 # AST
    alt: Optional[int] = None                 # ALT
    ggt: Optional[int] = None                 # 감마지티피


# 건강검진 데이터 수정 요청
class HealthCheckupUpdateRequest(BaseModel):
    bp_systolic: Optional[int] = None         # 수축기 혈압
    bp_diastolic: Optional[int] = None        # 이완기 혈압
    fasting_glucose: Optional[int] = None     # 공복혈당
    total_cholesterol: Optional[int] = None   # 총콜레스테롤
    hdl: Optional[int] = None                 # HDL 콜레스테롤
    ldl: Optional[int] = None                 # LDL 콜레스테롤
    triglyceride: Optional[int] = None        # 중성지방
    height: Optional[float] = None            # 신장 (cm)
    weight: Optional[float] = None            # 체중 (kg)
    waist: Optional[float] = None             # 허리둘레 (cm)
    hemoglobin: Optional[float] = None        # 혈색소
    creatinine: Optional[float] = None        # 혈청크레아티닌
    ast: Optional[int] = None                 # AST
    alt: Optional[int] = None                 # ALT
    ggt: Optional[int] = None                 # 감마지티피


# 건강검진 응답
class HealthCheckupResponse(BaseModel):
    id: int                                    # 건강검진 고유 ID
    checkup_year: int                          # 검진 기준연도
    bp_systolic: Optional[int] = None         # 수축기 혈압
    bp_diastolic: Optional[int] = None        # 이완기 혈압
    fasting_glucose: Optional[int] = None     # 공복혈당
    total_cholesterol: Optional[int] = None   # 총콜레스테롤
    hdl: Optional[int] = None                 # HDL 콜레스테롤
    ldl: Optional[int] = None                 # LDL 콜레스테롤
    triglyceride: Optional[int] = None        # 중성지방
    height: Optional[float] = None            # 신장 (cm)
    weight: Optional[float] = None            # 체중 (kg)
    waist: Optional[float] = None             # 허리둘레 (cm)
    hemoglobin: Optional[float] = None        # 혈색소
    creatinine: Optional[float] = None        # 혈청크레아티닌
    ast: Optional[int] = None                 # AST
    alt: Optional[int] = None                 # ALT
    ggt: Optional[int] = None                 # 감마지티피
    created_at: datetime                       # 생성일시

    class Config:
        from_attributes = True


# 건강검진 목록 응답
class HealthCheckupListResponse(BaseModel):
    checkups: List[HealthCheckupResponse]      # 건강검진 목록


# 건강검진 삭제 응답
class HealthCheckupDeleteResponse(BaseModel):
    detail: str                                # 삭제 성공 메시지


# 혈압 분류 결과
class BPClassification(BaseModel):
    bp_systolic: Optional[int] = None
    bp_diastolic: Optional[int] = None
    result: str


# 혈당 분류 결과
class GlucoseClassification(BaseModel):
    fasting_glucose: Optional[int] = None
    result: str


# 콜레스테롤 분류 결과
class CholesterolClassification(BaseModel):
    total_cholesterol: Optional[int] = None
    hdl: Optional[int] = None
    ldl: Optional[int] = None
    triglyceride: Optional[int] = None
    result: str


# BMI 분류 결과
class BMIClassification(BaseModel):
    height: Optional[float] = None
    weight: Optional[float] = None
    bmi: Optional[float] = None
    result: str


# 건강 수치 분류 결과 응답
class HealthClassificationResponse(BaseModel):
    checkup_year: int
    classification: dict


# 건강 수치 변화 추이 응답
class HealthTrendResponse(BaseModel):
    trend: dict