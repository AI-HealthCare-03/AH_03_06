from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from typing import Literal


class ChatSessionCreateRequest(BaseModel):
    context_type: Literal['HEALTH_CHECKUP', 'PRESCRIPTION', 'DIET_GUIDE', 'SLEEP_GUIDE']
    context_id:   Optional[int] = None


class ChatSessionResponse(BaseModel):
    id:           int
    context_type: str
    context_id:   Optional[int]
    created_at:   datetime

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

    class Config:
        from_attributes = True


class ChatMessageResponse(BaseModel):
    message:  str
    history:  List[ChatMessageItem]


class ChatHistoryResponse(BaseModel):
    session_id: int
    messages:   List[ChatMessageItem]