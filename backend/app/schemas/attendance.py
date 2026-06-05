from pydantic import BaseModel
from typing import Optional
from datetime import date


# POST /api/v1/attendance/check-in 응답
class CheckInResponse(BaseModel):
    checked_at: date
    current_streak: int
    max_streak: int
    message: str          # "출석 완료" / "이미 출석했습니다"


# GET /api/v1/attendance/status 응답
class AttendanceStatusResponse(BaseModel):
    today_checked: bool
    current_streak: int
    max_streak: int
    last_checked_at: Optional[date] = None


# GET /api/v1/attendance/calendar?year=2026&month=6 응답
class AttendanceCalendarResponse(BaseModel):
    year: int
    month: int
    checked_dates: list[date]   # 해당 월의 출석한 날짜 목록
    total_count: int            # 해당 월 총 출석일수