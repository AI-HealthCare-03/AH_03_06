from datetime import date, time, datetime
from typing import Optional, List
from pydantic import BaseModel


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


class PrescriptionDeleteResponse(BaseModel):
    detail: str


class PrescriptionListItem(BaseModel):
    id:            int
    drug_name:     str
    dosage:        Optional[str] = None
    frequency:     Optional[str] = None
    duration_days: Optional[int] = None
    start_date:    Optional[date] = None
    end_date:      Optional[date] = None
    is_active:     bool

    class Config:
        from_attributes = True


class PrescriptionListResponse(BaseModel):
    prescriptions: List[PrescriptionListItem]


class TodayMedicationScheduleItem(BaseModel):
    schedule_id:    int
    drug_name:      str
    dosage:         Optional[str] = None
    intake_time:    time
    dosage_message: Optional[str] = None
    is_taken:       bool
    log_id:         Optional[int] = None

    class Config:
        from_attributes = True


class TodayMedicationResponse(BaseModel):
    date:      date
    schedules: List[TodayMedicationScheduleItem]


class DateMedicationResponse(BaseModel):
    date:      date
    schedules: List[TodayMedicationScheduleItem]


class MedicationScheduleRequest(BaseModel):
    intake_time:       str
    dosage_message:    Optional[str] = None
    notification_type: Optional[str] = "PUSH"
    days:              Optional[List[str]] = []


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


class MedicationScheduleListResponse(BaseModel):
    schedules: List[MedicationScheduleResponse]


class MedicationAlarmUpdateRequest(BaseModel):
    medication_name: Optional[str] = None
    alarm_time:      Optional[str] = None
    alarm_days:      Optional[List[str]] = None
    is_active:       Optional[bool] = None


class MedicationAlarmUpdateResponse(BaseModel):
    id:              int
    medication_name: str
    alarm_time:      str
    alarm_days:      List[str]
    is_active:       bool
    updated_at:      datetime

    class Config:
        from_attributes = True


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


class MedicationHistoryResponse(BaseModel):
    total: int
    page:  int
    size:  int
    items: List[MedicationHistoryItem]


class DailyMedicationRate(BaseModel):
    date:  date
    total: int
    taken: int
    rate:  float


class MedicationRate(BaseModel):
    medication_id: int
    name:          str
    total:         int
    taken:         int
    rate:          float


class MedicationDashboardResponse(BaseModel):
    period:       str
    start_date:   date
    end_date:     date
    overall_rate: float
    daily:        List[DailyMedicationRate]
    medications:  List[MedicationRate]