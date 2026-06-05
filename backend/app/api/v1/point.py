# app/api/v1/point.py
# 포인트 관련 엔드포인트
# GET /api/v1/point/balance  — 현재 포인트 잔액 조회
# GET /api/v1/point/history  — 포인트 적립/차감 이력 조회

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.point import PointBalanceResponse, PointHistoryResponse
from app.services import point_service
from app.utils.auth import get_current_user
from app.models.user import User

router = APIRouter()


# GET /api/v1/point/balance
@router.get("/balance", response_model=PointBalanceResponse)
def get_balance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return point_service.get_balance(current_user.id, db)


# GET /api/v1/point/history
@router.get("/history", response_model=PointHistoryResponse)
def get_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return point_service.get_history(current_user.id, db)