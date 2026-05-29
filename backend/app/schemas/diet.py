from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class DietGuideGenerateRequest(BaseModel):
    checkup_id: int


class NutrientStandardSchema(BaseModel):
    recommended_calories: int
    recommended_protein: float
    recommended_carbs: float
    recommended_fat: float


class NutrientAchievementSchema(BaseModel):
    calories: int
    protein: int
    carbs: int
    fat: int


class DietGuideResponse(BaseModel):
    id: int
    meal_plan_type: str
    nutrient_standard: NutrientStandardSchema
    breakfast: Optional[str]
    lunch: Optional[str]
    dinner: Optional[str]
    recommended_foods: Optional[str]
    restricted_foods: Optional[str]
    nutrient_achievement: Optional[NutrientAchievementSchema]
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


class DietGuideListItem(BaseModel):
    id: int
    meal_plan_type: str
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


class DietGuideListResponse(BaseModel):
    guides: list[DietGuideListItem]


class DietGuideGenerateResponse(BaseModel):
    detail: str