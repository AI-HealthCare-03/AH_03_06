from sqlalchemy import BigInteger, Column, Date, DateTime, Float, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.sql import func
from app.database import Base


class ExerciseGuide(Base):
    __tablename__ = 'exercise_guide'

    id              = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id         = Column(BigInteger, ForeignKey('user.id'), nullable=False)
    guide_date      = Column(Date, nullable=False)
    cvd_score       = Column(Float, nullable=False)
    cvd_range       = Column(String(20), nullable=False)
    intensity_label = Column(String(20), nullable=False)
    conditions      = Column(String(255), nullable=True)   # comma-separated
    exercise_guide  = Column(Text, nullable=False)
    created_at      = Column(DateTime, nullable=False, default=func.now())

    __table_args__ = (
        UniqueConstraint('user_id', 'guide_date', name='uq_exercise_guide_user_date'),
    )
