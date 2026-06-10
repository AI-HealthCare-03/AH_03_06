from datetime import date
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.services.diet_service import DietService
from app.services.exercise_service import ExerciseService
from app.schemas.diet import (
    DietGuideResponse,
    DietGuideDateListResponse,
    DietGuideGenerateRequest,
    DietGuideGenerateCourseRequest,
    DietGuideGenerateResponse,
)

from app.schemas.exercise import (
    ExerciseGuideResponse,
    ExerciseGuideGenerateRequest,
    ExerciseGuideGenerateResponse,
)
from app.limiter import limiter

exercise_service = ExerciseService()


router = APIRouter()
diet_service = DietService()


@router.get('/diet', response_model=DietGuideDateListResponse)
def get_diet_guide_dates(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dates = diet_service.get_diet_guide_dates(db, current_user.id)
    return {'dates': dates}


@router.get('/diet/{guide_date}', response_model=DietGuideResponse)
def get_diet_guide(
    guide_date: date,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = diet_service.get_diet_guide(db, guide_date, current_user.id)
    if not result:
        raise HTTPException(status_code=404, detail='diet_guide_not_found')
    return result


@router.delete('/diet/{guide_date}', status_code=204)
def delete_diet_guide(
    guide_date: date,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = diet_service.get_diet_guide(db, guide_date, current_user.id)
    if not result:
        raise HTTPException(status_code=404, detail='diet_guide_not_found')
    diet_service.delete_diet_guide(db, guide_date, current_user.id)


@router.post('/diet/generate', status_code=202, response_model=DietGuideGenerateResponse)
@limiter.limit("5/minute")
def generate_diet_guide(
    request: Request,
    body: DietGuideGenerateRequest,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    checkup = diet_service.get_checkup_by_id(db, body.checkup_id, current_user.id)
    if not checkup:
        raise HTTPException(status_code=404, detail='checkup_not_found')

    background_tasks.add_task(
        diet_service.generate_diet_guide,
        db=db,
        user_id=current_user.id,
        checkup=checkup,
        target_date=body.target_date,
    )

    return {'detail': 'diet_guide_generating'}


@router.post('/diet/regenerate', status_code=202, response_model=DietGuideGenerateResponse)
@limiter.limit("5/minute")
def regenerate_diet_guide(
    request: Request,
    body: DietGuideGenerateRequest,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    checkup = diet_service.get_checkup_by_id(db, body.checkup_id, current_user.id)
    if not checkup:
        raise HTTPException(status_code=404, detail='checkup_not_found')

    background_tasks.add_task(
        diet_service.regenerate_diet_guide,
        db=db,
        user_id=current_user.id,
        checkup=checkup,
        target_date=body.target_date,
    )

    return {'detail': 'diet_guide_regenerating'}


@router.post('/diet/generate-course', status_code=202, response_model=DietGuideGenerateResponse)
@limiter.limit("5/minute")
def generate_diet_guide_course(
    request: Request,
    body: DietGuideGenerateCourseRequest,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    checkup = diet_service.get_checkup_by_id(db, body.checkup_id, current_user.id)
    if not checkup:
        raise HTTPException(status_code=404, detail='checkup_not_found')

    background_tasks.add_task(
        diet_service.generate_course,
        db=db,
        user_id=current_user.id,
        checkup=checkup,
        days=body.days,
    )

    return {'detail': 'diet_guide_course_generating'}

# guides.py의 exercise 관련 엔드포인트 부분만 교체하세요

# ── GET: 날짜로 저장된 가이드 조회 ──────────────
@router.get('/exercise/{guide_date}', response_model=ExerciseGuideResponse)
def get_exercise_guide(
    guide_date: date,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = exercise_service.get_guide_by_date(db, current_user.id, guide_date)
    if not result:
        raise HTTPException(status_code=404, detail='exercise_guide_not_found')
    return result


# ── POST: 가이드 생성 (백그라운드) ───────────────
@router.post('/exercise/generate', status_code=202, response_model=ExerciseGuideGenerateResponse)
@limiter.limit("5/minute")
def generate_exercise_guide(
    request: Request,
    req: ExerciseGuideGenerateRequest,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    checkup = exercise_service.get_checkup_by_id(db, req.checkup_id, current_user.id)
    if not checkup:
        raise HTTPException(status_code=404, detail='checkup_not_found')

    target_date = req.target_date or date.today()

    background_tasks.add_task(
        exercise_service.generate_exercise_guide,
        db          = db,
        user_id     = current_user.id,
        checkup     = checkup,
        target_date = target_date,
    )
    return {'detail': 'exercise_guide_generating'}


@router.get('/sleep')
def get_sleep_guide():
    pass


@router.post('/sleep/generate')
def generate_sleep_guide():
    pass


@router.get('/medication')
def get_medication_guide():
    pass