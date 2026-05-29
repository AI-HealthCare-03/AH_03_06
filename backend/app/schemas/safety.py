# app/schemas/safety.py
# 복약 안전점검(DUR) API 응답 스키마
#
# GET /api/v1/medical-records/{record_id}/safety-check
# 진료기록의 처방 묶음에 대한 안전 경고(병용금기·동일성분중복·효능군중복·회수약 등).

from typing import Literal

from pydantic import BaseModel


class SafetyAlert(BaseModel):
    level: Literal["BLOCK", "WARN", "INFO"]   # 차단 / 주의 / 참고
    type: str                                 # concurrent_ingredient / class_duplicate / contraindication / recall / elderly_caution / dose_exceeded
    drugs: list[str]                          # 관련 약품명 (표시용)
    message: str                              # 사용자 노출 문구
    detail: str | None = None                 # 보조 정보 (등급·성분명 등)


class SafetyCheckResponse(BaseModel):
    record_id: int
    alerts: list[SafetyAlert]                 # BLOCK > WARN > INFO 순 정렬
    summary: dict                             # {total, block, warn, info}
    skipped: list[str] = []                   # graceful-skip 사유 (매칭 실패·단위 불일치 등)
    disclaimer: str
