# api/v1/dashboard.py
# 홈/대시보드 관련 엔드포인트 담당
# 오늘의 복약 현황
# 건강 수치 요약
# 오늘의 AI 가이드 요약
# 최근 진료기록 요약

from fastapi import APIRouter

router = APIRouter()

# GET /api/v1/dashboard - 홈 대시보드 전체 조회
@router.get("")
def get_dashboard():
    pass