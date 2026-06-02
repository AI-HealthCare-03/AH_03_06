from sqlalchemy import BigInteger, Boolean, Column, Date, DateTime, DECIMAL, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.sql import func
from app.database import Base


class NutrientStandard(Base):
    __tablename__ = 'nutrient_standard'

    id                   = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id              = Column(BigInteger, ForeignKey('user.id'), nullable=False)
    recommended_calories = Column(Integer, nullable=True)
    recommended_protein  = Column(DECIMAL(5, 2), nullable=True)
    recommended_carbs    = Column(DECIMAL(5, 2), nullable=True)
    recommended_fat      = Column(DECIMAL(5, 2), nullable=True)
    meal_plan_type       = Column(String(50), nullable=False)
    created_at           = Column(DateTime, nullable=False, default=func.now())


class DietGuide(Base):
    __tablename__ = 'diet_guide'

    id                   = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id              = Column(BigInteger, ForeignKey('user.id'), nullable=False)
    nutrient_standard_id = Column(BigInteger, ForeignKey('nutrient_standard.id'), nullable=False)
    guide_date           = Column(Date, nullable=False)
    breakfast            = Column(Text, nullable=True)
    lunch                = Column(Text, nullable=True)
    dinner               = Column(Text, nullable=True)
    recommended_foods    = Column(Text, nullable=True)
    restricted_foods     = Column(Text, nullable=True)
    actual_calories      = Column(Integer, nullable=True)
    actual_protein       = Column(DECIMAL(5, 2), nullable=True)
    actual_carbs         = Column(DECIMAL(5, 2), nullable=True)
    actual_fat           = Column(DECIMAL(5, 2), nullable=True)
    is_verified          = Column(Boolean, nullable=False, default=False)
    created_at           = Column(DateTime, nullable=False, default=func.now())

    __table_args__ = (
        UniqueConstraint('user_id', 'guide_date', name='uq_diet_guide_user_date'),
    )