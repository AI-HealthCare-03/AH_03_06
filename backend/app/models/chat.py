from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.sql import func
from app.database import Base


class ChatSession(Base):
    __tablename__ = 'chat_session'

    id           = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id      = Column(BigInteger, ForeignKey('user.id'), nullable=False)
    context_type = Column(String(20), nullable=False)  # HEALTH_CHECKUP / PRESCRIPTION / DIET_GUIDE
    context_id   = Column(BigInteger, nullable=True)
    created_at   = Column(DateTime, nullable=False, default=func.now())


class ChatMessage(Base):
    __tablename__ = 'chat_message'

    id         = Column(BigInteger, primary_key=True, autoincrement=True)
    session_id = Column(BigInteger, ForeignKey('chat_session.id'), nullable=False)
    role       = Column(String(10), nullable=False)  # user / assistant
    content    = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, default=func.now())