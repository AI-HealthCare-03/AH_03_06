# api/v1/health_checkups.py
# 건강검진 관련 엔드포인트 담당
# 건강검진 데이터 입력/조회/수정/삭제
# 건강 수치 분류 결과 조회
# 건강 수치 변화 추이 조회

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.health_checkup import (
    HealthCheckupCreateRequest,
    HealthCheckupUpdateRequest,
    HealthCheckupResponse,
    HealthCheckupListResponse,
    HealthCheckupDeleteResponse,
    HealthClassificationResponse,
    HealthTrendResponse,
)
from app.services import health_checkup_service
from app.utils.auth import get_current_user

router = APIRouter()


# GET /api/v1/health-checkups/trend - 건강 수치 변화 추이 조회
@router.get("/trend", response_model=HealthTrendResponse)
def get_health_trend(
    period: str = "1y",
    item: str = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return health_checkup_service.get_trend(current_user.id, db, period, item)


# GET /api/v1/health-checkups/classification - 건강 수치 분류 결과 조회
@router.get("/classification", response_model=HealthClassificationResponse)
def get_health_classification(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return health_checkup_service.get_classification(current_user.id, db)


# GET /api/v1/health-checkups/year/{year} - 연도로 건강검진 상세 조회
@router.get("/year/{year}", response_model=HealthCheckupResponse)
def get_health_checkup_by_year(
    year: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return health_checkup_service.get_checkup_by_year(current_user.id, year, db)


# POST /api/v1/health-checkups - 건강검진 데이터 입력
@router.post("", response_model=HealthCheckupResponse, status_code=201)
def create_health_checkup(
    request: HealthCheckupCreateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return health_checkup_service.create_checkup(current_user.id, request, db)


# GET /api/v1/health-checkups - 건강검진 목록 조회
@router.get("", response_model=HealthCheckupListResponse)
def get_health_checkups(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return health_checkup_service.get_checkups(current_user.id, db)


# GET /api/v1/health-checkups/{id} - 건강검진 상세 조회
@router.get("/{checkup_id}", response_model=HealthCheckupResponse)
def get_health_checkup(
    checkup_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return health_checkup_service.get_checkup(current_user.id, checkup_id, db)


# PUT /api/v1/health-checkups/{id} - 건강검진 수정
@router.put("/{checkup_id}", response_model=HealthCheckupResponse)
def update_health_checkup(
    checkup_id: int,
    request: HealthCheckupUpdateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return health_checkup_service.update_checkup(current_user.id, checkup_id, request, db)


# DELETE /api/v1/health-checkups/{id} - 건강검진 삭제
@router.delete("/{checkup_id}", response_model=HealthCheckupDeleteResponse)
def delete_health_checkup(
    checkup_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return health_checkup_service.delete_checkup(current_user.id, checkup_id, db)