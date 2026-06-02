from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional


class DietGuideGenerateRequest(BaseModel):
    checkup_id: int
    target_date: Optional[date] = None


class DietGuideGenerateCourseRequest(BaseModel):
    checkup_id: int
    days: int = 7


class NutrientStandardSchema(BaseModel):
    recommended_calories: int
    recommended_protein: float
    recommended_carbs: float
    recommended_fat: float


class NutrientAchievementSchema(BaseModel):
    calories: Optional[int] = None
    protein: Optional[int] = None
    carbs: Optional[int] = None
    fat: Optional[int] = None


class DietGuideResponse(BaseModel):
    id: int
    guide_date: date
    meal_plan_type: str
    nutrient_standard: NutrientStandardSchema
    breakfast: Optional[str] = None
    lunch: Optional[str] = None
    dinner: Optional[str] = None
    recommended_foods: Optional[str] = None
    restricted_foods: Optional[str] = None
    nutrient_achievement: Optional[NutrientAchievementSchema] = None
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


class DietGuideDateListResponse(BaseModel):
    dates: list[date]


class DietGuideGenerateResponse(BaseModel):
    detail: str