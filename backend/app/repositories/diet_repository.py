from datetime import date, timedelta
from sqlalchemy.orm import Session
from app.models.diet import NutrientStandard, DietGuide


class NutrientStandardRepository:

    @staticmethod
    def create(db: Session, user_id: int, meal_plan_type: str,
               recommended_calories: int, recommended_protein: float,
               recommended_carbs: float, recommended_fat: float) -> NutrientStandard:
        nutrient_standard = NutrientStandard(
            user_id=user_id,
            meal_plan_type=meal_plan_type,
            recommended_calories=recommended_calories,
            recommended_protein=recommended_protein,
            recommended_carbs=recommended_carbs,
            recommended_fat=recommended_fat,
        )
        db.add(nutrient_standard)
        db.flush()
        return nutrient_standard

    @staticmethod
    def get_by_user_id(db: Session, user_id: int) -> NutrientStandard | None:
        return db.query(NutrientStandard).filter(
            NutrientStandard.user_id == user_id
        ).order_by(NutrientStandard.created_at.desc()).first()


class DietGuideRepository:

    @staticmethod
    def create(db: Session, user_id: int, nutrient_standard_id: int,
               guide_date: date, breakfast: str, lunch: str, dinner: str,
               recommended_foods: str, restricted_foods: str,
               actual_calories: int, actual_protein: float,
               actual_carbs: float, actual_fat: float,
               is_verified: bool) -> DietGuide:
        diet_guide = DietGuide(
            user_id=user_id,
            nutrient_standard_id=nutrient_standard_id,
            guide_date=guide_date,
            breakfast=breakfast,
            lunch=lunch,
            dinner=dinner,
            recommended_foods=recommended_foods,
            restricted_foods=restricted_foods,
            actual_calories=actual_calories,
            actual_protein=actual_protein,
            actual_carbs=actual_carbs,
            actual_fat=actual_fat,
            is_verified=is_verified,
        )
        db.add(diet_guide)
        db.flush()
        return diet_guide

    @staticmethod
    def get_by_date(db: Session, user_id: int, guide_date: date) -> DietGuide | None:
        return db.query(DietGuide).filter(
            DietGuide.user_id == user_id,
            DietGuide.guide_date == guide_date,
        ).first()

    @staticmethod
    def get_by_id(db: Session, diet_guide_id: int, user_id: int) -> DietGuide | None:
        return db.query(DietGuide).filter(
            DietGuide.id == diet_guide_id,
            DietGuide.user_id == user_id,
        ).first()

    @staticmethod
    def get_dates_by_user_id(db: Session, user_id: int) -> list[date]:
        rows = db.query(DietGuide.guide_date).filter(
            DietGuide.user_id == user_id,
        ).order_by(DietGuide.guide_date.desc()).all()
        return [row.guide_date for row in rows]

    @staticmethod
    def get_recent_guides(db: Session, user_id: int, days: int = 7) -> list[DietGuide]:
        since = date.today() - timedelta(days=days)
        return db.query(DietGuide).filter(
            DietGuide.user_id == user_id,
            DietGuide.guide_date >= since,
        ).order_by(DietGuide.guide_date.desc()).all()

    @staticmethod
    def delete_by_date(db: Session, user_id: int, guide_date: date) -> None:
        db.query(DietGuide).filter(
            DietGuide.user_id == user_id,
            DietGuide.guide_date == guide_date,
        ).delete()
        db.flush()