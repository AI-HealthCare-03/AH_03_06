from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# 포인트 잔액 조회 응답
class PointBalanceResponse(BaseModel):
    balance: int


# 포인트 이력 항목
class PointHistoryItem(BaseModel):
    event_type: str
    amount: int
    balance_snapshot: int
    description: Optional[str] = None
    created_at: datetime


# 포인트 이력 조회 응답
class PointHistoryResponse(BaseModel):
    balance: int
    history: list[PointHistoryItem]