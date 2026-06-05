# app/api/v1/attendance.py
# 출석체크 관련 엔드포인트
# POST /api/v1/attendance/check-in  — 수동 체크인
# GET  /api/v1/attendance/status    — 오늘 출석 여부 + 연속일수
# GET  /api/v1/attendance/calendar  — 월별 출석 날짜 목록

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.attendance import (
    CheckInResponse,
    AttendanceStatusResponse,
    AttendanceCalendarResponse,
)
from app.services import attendance_service
from app.utils.auth import get_current_user
from app.models.user import User

router = APIRouter()


# POST /api/v1/attendance/check-in
@router.post("/check-in", response_model=CheckInResponse, status_code=200)
def check_in(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return attendance_service.check_in(current_user.id, db)


# GET /api/v1/attendance/status
@router.get("/status", response_model=AttendanceStatusResponse)
def get_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return attendance_service.get_status(current_user.id, db)


# GET /api/v1/attendance/calendar?year=2026&month=6
@router.get("/calendar", response_model=AttendanceCalendarResponse)
def get_calendar(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return attendance_service.get_calendar(current_user.id, year, month, db)