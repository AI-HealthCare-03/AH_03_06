from datetime import date
from pydantic import BaseModel


class ExerciseGuideGenerateRequest(BaseModel):
    checkup_id:  int
    target_date: date | None = None


class ExerciseGuideGenerateResponse(BaseModel):
    detail: str


class ExerciseGuideResponse(BaseModel):
    guide_date:      date
    cvd_score:       float
    cvd_range:       str
    intensity_label: str
    conditions:      list[str]
    exercise_guide:  str


class ExerciseChatRequest(BaseModel):
    checkup_id: int
    category:   str
    message:    str


class ExerciseChatResponse(BaseModel):
    answer: str
