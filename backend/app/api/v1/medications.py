# api/v1/medications.py
# 복약 관련 엔드포인트 담당
# 약 등록/조회/수정/삭제
# 복약 완료 체크/취소
# 복약 이력 조회/내보내기
# 복약 완료율 통계
# 월간 복약 리포트
# 알림 발송 이력 조회

from fastapi import APIRouter

router = APIRouter()

# POST /api/v1/medications - 약 등록
@router.post("")
def register_medication():
    pass

# GET /api/v1/medications - 약 목록 조회
@router.get("")
def get_medications():
    pass

# GET /api/v1/medications/{id} - 약 상세 조회
@router.get("/{medication_id}")
def get_medication(medication_id: int):
    pass

# PUT /api/v1/medications/{id} - 약 정보 수정
@router.put("/{medication_id}")
def update_medication(medication_id: int):
    pass

# DELETE /api/v1/medications/{id} - 약 삭제
@router.delete("/{medication_id}")
def delete_medication(medication_id: int):
    pass

# POST /api/v1/medications/{id}/check - 복약 완료 체크
@router.post("/{medication_id}/check")
def check_medication(medication_id: int):
    pass

# DELETE /api/v1/medications/{id}/check - 복약 완료 체크 취소
@router.delete("/{medication_id}/check")
def uncheck_medication(medication_id: int):
    pass

# GET /api/v1/medications/history - 복약 이력 조회
@router.get("/history")
def get_medication_history():
    pass

# GET /api/v1/medications/history/export - 복약 이력 파일 내보내기
@router.get("/history/export")
def export_medication_history():
    pass

# GET /api/v1/medications/statistics - 복약 완료율 통계 조회
@router.get("/statistics")
def get_medication_statistics():
    pass

# GET /api/v1/medications/report/monthly - 월간 복약 리포트 조회
@router.get("/report/monthly")
def get_monthly_report():
    pass

# GET /api/v1/medications/notifications/history - 알림 발송 이력 조회
@router.get("/notifications/history")
def get_notification_history():
    pass