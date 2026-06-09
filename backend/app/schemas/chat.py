from pydantic import BaseModel, field_serializer
from datetime import datetime, timezone
from typing import Optional, List, Literal


class ChatSessionCreateRequest(BaseModel):
    context_type: Literal['HEALTH_CHECKUP', 'PRESCRIPTION', 'DIET_GUIDE', 'SLEEP_GUIDE']
    context_id:   Optional[int] = None


class ChatSessionResponse(BaseModel):
    id:           int
    context_type: str
    context_id:   Optional[int]
    created_at:   datetime

    @field_serializer('created_at')
    def serialize_created_at(self, v: datetime) -> str:
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        return v.isoformat(timespec="seconds").replace("+00:00", "Z")

    class Config:
        from_attributes = True


class ChatMessageRequest(BaseModel):
    message:  str
    category: Optional[str] = None


class ChatMessageEditRequest(BaseModel):
    message:  str
    category: Optional[str] = None


class ChatMessageItem(BaseModel):
    id:         int
    role:       str
    content:    str
    created_at: datetime

    @field_serializer('created_at')
    def serialize_created_at(self, v: datetime) -> str:
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        return v.isoformat(timespec="seconds").replace("+00:00", "Z")

    class Config:
        from_attributes = True


class ChatMessageResponse(BaseModel):
    message:  str
    history:  List[ChatMessageItem]


class ChatHistoryResponse(BaseModel):
    session_id: int
    messages:   List[ChatMessageItem]