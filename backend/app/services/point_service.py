from sqlalchemy.orm import Session
from app.models.point import UserPoint, PointHistory
from app.schemas.point import PointBalanceResponse, PointHistoryResponse, PointHistoryItem

# 포인트 적립 규칙
POINT_RULES = {
    "attendance":           10,   # 출석 체크
    "attendance_7days":     50,   # 연속 7일 출석 보너스
    "attendance_30days":   100,   # 연속 30일 출석 보너스
    "medication_guide":     10,   # 복약 가이드 생성
    "sleep_guide":          10,   # 수면 가이드 생성
    "diet_guide":           10,   # 식단 가이드 생성
    "health_checkup":       10,   # 건강검진 등록
    "medical_record":        5,   # 진료기록 등록
}

POINT_DESCRIPTIONS = {
    "attendance":           "출석 체크",
    "attendance_7days":     "연속 7일 출석 보너스",
    "attendance_30days":    "연속 30일 출석 보너스",
    "medication_guide":     "복약 가이드 생성",
    "sleep_guide":          "수면 가이드 생성",
    "diet_guide":           "식단 가이드 생성",
    "health_checkup":       "건강검진 등록",
    "medical_record":       "진료기록 등록",
}


def earn(user_id: int, event_type: str, db: Session) -> int:
    """포인트 적립. 적립 후 잔액 반환."""
    amount = POINT_RULES.get(event_type, 0)
    if amount == 0:
        return 0

    user_point = _get_or_create_point(user_id, db)
    user_point.balance += amount

    history = PointHistory(
        user_id=user_id,
        event_type=event_type,
        amount=amount,
        balance_snapshot=user_point.balance,
        description=POINT_DESCRIPTIONS.get(event_type),
    )
    db.add(history)
    db.flush()

    return user_point.balance


def get_balance(user_id: int, db: Session) -> PointBalanceResponse:
    """현재 포인트 잔액 조회."""
    user_point = _get_or_create_point(user_id, db)
    db.commit()
    return PointBalanceResponse(balance=user_point.balance)


def get_history(user_id: int, db: Session) -> PointHistoryResponse:
    """포인트 적립/차감 이력 조회 (최신순)."""
    user_point = _get_or_create_point(user_id, db)
    db.commit()

    records = db.query(PointHistory).filter(
        PointHistory.user_id == user_id
    ).order_by(PointHistory.created_at.desc()).all()

    return PointHistoryResponse(
        balance=user_point.balance,
        history=[
            PointHistoryItem(
                event_type=r.event_type,
                amount=r.amount,
                balance_snapshot=r.balance_snapshot,
                description=r.description,
                created_at=r.created_at,
            )
            for r in records
        ],
    )


def _get_or_create_point(user_id: int, db: Session) -> UserPoint:
    user_point = db.query(UserPoint).filter(
        UserPoint.user_id == user_id
    ).first()

    if not user_point:
        user_point = UserPoint(user_id=user_id, balance=0)
        db.add(user_point)
        db.flush()

    return user_point