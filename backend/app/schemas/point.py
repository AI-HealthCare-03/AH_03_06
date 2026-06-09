from pydantic import BaseModel, field_serializer
from datetime import datetime, timezone
from typing import Optional


class PointBalanceResponse(BaseModel):
    balance: int


class PointHistoryItem(BaseModel):
    event_type: str
    amount: int
    balance_snapshot: int
    description: Optional[str] = None
    created_at: datetime

    @field_serializer('created_at')
    def serialize_created_at(self, v: datetime) -> str:
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        return v.isoformat(timespec="seconds").replace("+00:00", "Z")


class PointHistoryResponse(BaseModel):
    balance: int
    history: list[PointHistoryItem]