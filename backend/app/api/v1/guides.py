# api/v1/guides.py
# 가이드 관련 엔드포인트 담당
# 식단 가이드 조회/생성
# 운동 가이드 조회/생성
# 수면 가이드 조회/생성
# 복약 안내 조회

from fastapi import APIRouter

router = APIRouter()

# GET /api/v1/guides/diet - 식단 가이드 조회
@router.get("/diet")
def get_diet_guide():
    pass

# POST /api/v1/guides/diet/generate - 식단 가이드 생성 요청
@router.post("/diet/generate")
def generate_diet_guide():
    pass

# GET /api/v1/guides/exercise - 운동 가이드 조회
@router.get("/exercise")
def get_exercise_guide():
    pass

# POST /api/v1/guides/exercise/generate - 운동 가이드 생성 요청
@router.post("/exercise/generate")
def generate_exercise_guide():
    pass

# GET /api/v1/guides/sleep - 수면 가이드 조회
@router.get("/sleep")
def get_sleep_guide():
    pass

# POST /api/v1/guides/sleep/generate - 수면 가이드 생성 요청
@router.post("/sleep/generate")
def generate_sleep_guide():
    pass

# GET /api/v1/guides/medication - 복약 안내 조회
@router.get("/medication")
def get_medication_guide():
    pass