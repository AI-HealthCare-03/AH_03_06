from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.services import chat_service
from app.schemas.chat import (
    ChatSessionCreateRequest,
    ChatSessionResponse,
    ChatMessageRequest,
    ChatMessageResponse,
    ChatHistoryResponse,
)

router = APIRouter()


# POST /api/v1/chat/sessions - 세션 생성
@router.post('/sessions', response_model=ChatSessionResponse, status_code=201)
def create_session(
    request: ChatSessionCreateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return chat_service.create_session(
        user_id=current_user.id,
        context_type=request.context_type,
        context_id=request.context_id,
        db=db,
    )


# POST /api/v1/chat/sessions/{session_id}/messages - 메시지 전송
@router.post('/sessions/{session_id}/messages', response_model=ChatMessageResponse)
def send_message(
    session_id: int,
    request: ChatMessageRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return chat_service.send_message(
        session_id=session_id,
        user_id=current_user.id,
        message=request.message,
        db=db,
    )


# GET /api/v1/chat/sessions/{session_id}/messages - 대화 히스토리 조회
@router.get('/sessions/{session_id}/messages', response_model=ChatHistoryResponse)
def get_history(
    session_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return chat_service.get_history(
        session_id=session_id,
        user_id=current_user.id,
        db=db,
    )