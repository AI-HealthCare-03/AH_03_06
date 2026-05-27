# app/schemas/medication.py
# 복약 관련 요청/응답 스키마

from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel


# 복용 약 등록 요청
class PrescriptionCreateRequest(BaseModel):
    medical_record_id: int
    drug_id:           Optional[int] = None
    drug_name:         str
    dosage:            Optional[str] = None
    frequency:         Optional[str] = None
    duration_days:     Optional[int] = None
    start_date:        Optional[date] = None
    end_date:          Optional[date] = None
    is_active:         Optional[bool] = True


# 복용 약 응답
class PrescriptionResponse(BaseModel):
    id:                int
    medical_record_id: int
    drug_id:           Optional[int] = None
    drug_name:         str
    dosage:            Optional[str] = None
    frequency:         Optional[str] = None
    duration_days:     Optional[int] = None
    start_date:        Optional[date] = None
    end_date:          Optional[date] = None
    is_active:         bool
    created_at:        datetime
    updated_at:        datetime

    class Config:
        from_attributes = True


# 복용 약 삭제 응답
class PrescriptionDeleteResponse(BaseModel):
    detail: str


# 복약 일정 등록/수정 요청
class MedicationScheduleRequest(BaseModel):
    intake_time:       str
    dosage_message:    Optional[str] = None
    notification_type: Optional[str] = "PUSH"
    days:              Optional[List[str]] = []


# 복약 일정 응답
class MedicationScheduleResponse(BaseModel):
    id:                int
    medication_id:     int
    intake_time:       str
    dosage_message:    Optional[str] = None
    is_after_meal:     Optional[bool] = None
    notification_type: str
    is_active:         bool
    days:              List[str]

    class Config:
        from_attributes = True


# 복약 일정 목록 응답
class MedicationScheduleListResponse(BaseModel):
    schedules: List[MedicationScheduleResponse]


# 복약 알림 수정 요청
class MedicationAlarmUpdateRequest(BaseModel):
    medication_name: Optional[str] = None
    alarm_time:      Optional[str] = None
    alarm_days:      Optional[List[str]] = None
    is_active:       Optional[bool] = None


# 복약 알림 수정 응답
class MedicationAlarmUpdateResponse(BaseModel):
    id:              int
    medication_name: str
    alarm_time:      str
    alarm_days:      List[str]
    is_active:       bool
    updated_at:      datetime

    class Config:
        from_attributes = True


# 복약 이력 아이템 응답
class AlarmResponse(BaseModel):
    id:           int
    alarm_times:  List[str]
    days_of_week: List[int]
    is_active:    bool

    class Config:
        from_attributes = True


class MedicationHistoryItem(BaseModel):
    id:              int
    prescription_id: Optional[int] = None
    drug_name:       str
    dosage:          Optional[str] = None
    frequency:       Optional[str] = None
    start_date:      Optional[date] = None
    end_date:        Optional[date] = None
    meal_timing:     Optional[str] = None
    notes:           Optional[str] = None
    alarm:           Optional[AlarmResponse] = None
    created_at:      datetime

    class Config:
        from_attributes = True


# 복약 이력 목록 응답
class MedicationHistoryResponse(BaseModel):
    total: int
    page:  int
    size:  int
    items: List[MedicationHistoryItem]


# 복약 완료율 일별 응답
class DailyMedicationRate(BaseModel):
    date:  date
    total: int
    taken: int
    rate:  float


# 복약별 완료율 응답
class MedicationRate(BaseModel):
    medication_id: int
    name:          str
    total:         int
    taken:         int
    rate:          float


# 복약 완료율 대시보드 응답
class MedicationDashboardResponse(BaseModel):
    period:       str
    start_date:   date
    end_date:     date
    overall_rate: float
    daily:        List[DailyMedicationRate]
    medications:  List[MedicationRate]