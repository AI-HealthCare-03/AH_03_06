from datetime import date, time, datetime
from typing import Optional, List
from pydantic import BaseModel


class PrescriptionCreateRequest(BaseModel):
    medical_record_id: Optional[int] = None
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

class MedicationCardItem(BaseModel):
    id:            int
    source:        str            # 'prescription' | 'custom'
    drug_name:     str
    dosage:        Optional[str] = None
    frequency:     Optional[str] = None
    start_date:    Optional[date] = None
    end_date:      Optional[date] = None
    is_active:     bool
    dosage_text:   Optional[str] = None   # 표시용 용량 (custom은 스케줄 dosage_message)
    times:         List[str] = []         # 복용 시간대 ["08:00", ...] (정렬)
    is_as_needed:  bool = False           # 필요시 복용(PRN)
    meal_basis:        Optional[str] = None  # 식사 기준(식전·식후·식간·상관없음)
    timing_offset_min: Optional[int] = None  # 식사 기준 오프셋(분)

class MedicationListResponse(BaseModel):
    medications: List[MedicationCardItem]


class MedicationDetailResponse(BaseModel):
    """수정 폼 로드용 — 처방약/직접등록 공용 단건 상세."""
    id:             int
    source:         str                      # 'prescription' | 'custom'
    drug_name:      str
    dosage_message: Optional[str] = None     # 표시/파싱용 용량 ("1정" 등)
    start_date:     Optional[date] = None
    end_date:       Optional[date] = None
    times:          List[str] = []           # 복용 시간 ["08:00", ...]
    days:           List[str] = []           # ["MON", ...] (빈 값=매일)
    interval_days:  Optional[int] = None     # N일마다(격일=2·주1회=7·4주=28). None=매일/요일기반
    is_as_needed:   bool = False             # 필요시 복용(PRN)
    meal_basis:        Optional[str] = None  # 식사 기준(식전·식후·식간·상관없음)
    timing_offset_min: Optional[int] = None  # 식사 기준 오프셋(분)


class MedicationUpdateRequest(BaseModel):
    """수정 저장용 — 스케줄 재생성 기준."""
    drug_name:         str
    dosage_message:    Optional[str] = None   # "1정"
    start_date:        Optional[date] = None
    end_date:          Optional[date] = None
    times:             List[str] = []         # 복용 시간 ["08:00", ...] (1개 이상)
    days:              List[str] = []         # ["MON", ...] (빈 값=매일)
    interval_days:     Optional[int] = None   # N일마다(격일=2·주1회=7·4주=28). None=매일/요일기반
    is_as_needed:      Optional[bool] = False # 필요시 복용(PRN)
    meal_basis:        Optional[str] = None   # 식사 기준(식전·식후·식간·상관없음)
    timing_offset_min: Optional[int] = None   # 식사 기준 오프셋(분)
    notification_type: Optional[str] = "PUSH"


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
    meal_basis:        Optional[str] = None
    timing_offset_min: Optional[int] = None

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
    drug_name:         Optional[str] = None
    dosage_message:    Optional[str] = None
    notification_type: Optional[str] = "PUSH"
    days:              Optional[List[str]] = []
    is_custom:         Optional[bool] = False
    start_date:        Optional[date] = None
    end_date:          Optional[date] = None
    interval_days:     Optional[int] = None
    is_as_needed:      Optional[bool] = False
    meal_basis:        Optional[str] = None
    timing_offset_min: Optional[int] = None


class MedicationScheduleResponse(BaseModel):
    id:                int
    medication_id:     Optional[int] = None
    intake_time:       str
    dosage_message:    Optional[str] = None
    meal_basis:        Optional[str] = None
    timing_offset_min: Optional[int] = None
    notification_type: str
    is_active:         bool
    is_custom:         bool
    days:              List[str]
    start_date:        Optional[date] = None
    end_date:          Optional[date] = None

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
    created_at:      str                        # ISO+Z (UTC 명시 → JS가 로컬 KST로 변환)
    checked_at:      Optional[str] = None        # 실제 복용 시각(체크 시점, ISO+Z). 표시는 checked_at 우선

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

class MedicationCheckRequest(BaseModel):
    medicationId: int
    mealTime:     Optional[str] = None
    takenAt:      Optional[str] = None
    isChecked:    bool

class MedicationCheckResponse(BaseModel):
    detail: str


class MedicationCalendarResponse(BaseModel):
    """복약 기록 달력 — 해당 월의 성실/누락 '일(day)' 숫자 배열."""
    doneDays:   List[int] = []   # TAKEN 로그가 있는 날
    missedDays: List[int] = []   # 예정 복용일(오늘 이전) 중 TAKEN 없는 날


class MedicationAnalysisResponse(BaseModel):
    """복약 기록 분석 배너 — 최근 기간 달성률."""
    periodLabel:     str   # "최근 7일"
    achievementRate: int   # 예정 대비 TAKEN 비율(정수 %)