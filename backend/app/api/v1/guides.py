from datetime import date
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.services.diet_service import DietService
from app.schemas.diet import (
    DietGuideResponse,
    DietGuideDateListResponse,
    DietGuideGenerateRequest,
    DietGuideGenerateCourseRequest,
    DietGuideGenerateResponse,
)

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
def generate_diet_guide(
    request: DietGuideGenerateRequest,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    checkup = diet_service.get_checkup_by_id(db, request.checkup_id, current_user.id)
    if not checkup:
        raise HTTPException(status_code=404, detail='checkup_not_found')

    background_tasks.add_task(
        diet_service.generate_diet_guide,
        db=db,
        user_id=current_user.id,
        checkup=checkup,
        target_date=request.target_date,
    )

    return {'detail': 'diet_guide_generating'}


@router.post('/diet/regenerate', status_code=202, response_model=DietGuideGenerateResponse)
def regenerate_diet_guide(
    request: DietGuideGenerateRequest,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    checkup = diet_service.get_checkup_by_id(db, request.checkup_id, current_user.id)
    if not checkup:
        raise HTTPException(status_code=404, detail='checkup_not_found')

    background_tasks.add_task(
        diet_service.regenerate_diet_guide,
        db=db,
        user_id=current_user.id,
        checkup=checkup,
        target_date=request.target_date,
    )

    return {'detail': 'diet_guide_regenerating'}


@router.post('/diet/generate-course', status_code=202, response_model=DietGuideGenerateResponse)
def generate_diet_guide_course(
    request: DietGuideGenerateCourseRequest,
    background_tasks: BackgroundTasks,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    checkup = diet_service.get_checkup_by_id(db, request.checkup_id, current_user.id)
    if not checkup:
        raise HTTPException(status_code=404, detail='checkup_not_found')

    background_tasks.add_task(
        diet_service.generate_course,
        db=db,
        user_id=current_user.id,
        checkup=checkup,
        days=request.days,
    )

    return {'detail': 'diet_guide_course_generating'}


@router.get('/exercise')
def get_exercise_guide():
    pass


@router.post('/exercise/generate')
def generate_exercise_guide():
    pass


@router.get('/sleep')
def get_sleep_guide():
    pass


@router.post('/sleep/generate')
def generate_sleep_guide():
    pass


@router.get('/medication')
def get_medication_guide():
    pass