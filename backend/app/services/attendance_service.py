from datetime import date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.attendance import Attendance, AttendanceStreak
from app.schemas.attendance import CheckInResponse, AttendanceStatusResponse, AttendanceCalendarResponse
from app.services import point_service


def check_in(user_id: int, db: Session) -> CheckInResponse:
    today = date.today()

    # 오늘 이미 출석했는지 확인
    existing = db.query(Attendance).filter(
        Attendance.user_id == user_id,
        Attendance.checked_at == today,
    ).first()

    if existing:
        streak = _get_or_create_streak(user_id, db)
        return CheckInResponse(
            checked_at=today,
            current_streak=streak.current_streak,
            max_streak=streak.max_streak,
            message="이미 출석했습니다",
        )

    # 출석 기록 저장
    attendance = Attendance(user_id=user_id, checked_at=today)
    db.add(attendance)

    # 연속 출석 업데이트
    streak = _get_or_create_streak(user_id, db)
    yesterday = today - timedelta(days=1)

    if streak.last_checked_at == yesterday:
        streak.current_streak += 1
    else:
        streak.current_streak = 1

    if streak.current_streak > streak.max_streak:
        streak.max_streak = streak.current_streak

    streak.last_checked_at = today

    # 포인트 적립
    point_service.earn(user_id, "attendance", db)
    if streak.current_streak % 7 == 0:
        point_service.earn(user_id, "attendance_7days", db)
    if streak.current_streak % 30 == 0:
        point_service.earn(user_id, "attendance_30days", db)

    db.commit()

    return CheckInResponse(
        checked_at=today,
        current_streak=streak.current_streak,
        max_streak=streak.max_streak,
        message="출석 완료",
    )


def get_status(user_id: int, db: Session) -> AttendanceStatusResponse:
    today = date.today()

    today_checked = db.query(Attendance).filter(
        Attendance.user_id == user_id,
        Attendance.checked_at == today,
    ).first() is not None

    streak = _get_or_create_streak(user_id, db)

    return AttendanceStatusResponse(
        today_checked=today_checked,
        current_streak=streak.current_streak,
        max_streak=streak.max_streak,
        last_checked_at=streak.last_checked_at,
    )


def get_calendar(user_id: int, year: int, month: int, db: Session) -> AttendanceCalendarResponse:
    from calendar import monthrange

    first_day = date(year, month, 1)
    last_day = date(year, month, monthrange(year, month)[1])

    records = db.query(Attendance).filter(
        Attendance.user_id == user_id,
        Attendance.checked_at >= first_day,
        Attendance.checked_at <= last_day,
    ).all()

    checked_dates = [r.checked_at for r in records]

    return AttendanceCalendarResponse(
        year=year,
        month=month,
        checked_dates=checked_dates,
        total_count=len(checked_dates),
    )


def _get_or_create_streak(user_id: int, db: Session) -> AttendanceStreak:
    streak = db.query(AttendanceStreak).filter(
        AttendanceStreak.user_id == user_id
    ).first()

    if not streak:
        streak = AttendanceStreak(user_id=user_id)
        db.add(streak)
        db.flush()

    return streak