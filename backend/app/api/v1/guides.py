from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.services.diet_service import DietService
from app.schemas.diet import (
    DietGuideResponse,
    DietGuideListResponse,
    DietGuideGenerateRequest,
)

router = APIRouter()
diet_service = DietService()


@router.get('/diet/{id}', response_model=DietGuideResponse)
def get_diet_guide(
    id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = diet_service.get_diet_guide(db, id, current_user.id)
    if not result:
        raise HTTPException(status_code=404, detail='diet_guide_not_found')
    return result


@router.get('/diet', response_model=DietGuideListResponse)
def get_diet_guide_list(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    guides = diet_service.get_diet_guide_list(db, current_user.id)
    return {'guides': guides}


@router.post('/diet/generate', status_code=202)
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
    )

    return {'detail': 'diet_guide_generating'}


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