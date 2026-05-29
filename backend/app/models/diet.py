from sqlalchemy import BigInteger, Boolean, Column, DateTime, DECIMAL, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func
from app.database import Base


class NutrientStandard(Base):
    __tablename__ = 'NUTRIENT_STANDARD'

    id                   = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey('user.id'), nullable=False)
    recommended_calories = Column(Integer, nullable=True)
    recommended_protein  = Column(DECIMAL(5, 2), nullable=True)
    recommended_carbs    = Column(DECIMAL(5, 2), nullable=True)
    recommended_fat      = Column(DECIMAL(5, 2), nullable=True)
    meal_plan_type       = Column(String(50), nullable=False)
    created_at           = Column(DateTime, nullable=False, default=func.now())


class DietGuide(Base):
    __tablename__ = 'DIET_GUIDE'

    id                   = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey('user.id'), nullable=False)
    nutrient_standard_id = Column(BigInteger, ForeignKey('NUTRIENT_STANDARD.id'), nullable=False)
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