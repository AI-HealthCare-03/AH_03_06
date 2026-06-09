# backend/scripts/add_medication_schedule_columns.py
# 목적: 복약 "수정"·"식사 기준" 기능에서 모델에 추가한 컬럼을 RDS medication_schedules에 반영한다.
#         - interval_days     : N일마다 복용(격일=2·주1회=7·4주=28). NULL/1=매일(요일 기반)
#         - is_as_needed      : 필요시 복용(PRN) — 정해진 시간 없음
#         - meal_basis        : 식사 기준(식전·식후·식간·상관없음). NULL=미지정
#         - timing_offset_min : 식사 기준 오프셋(분). 식후 30분=30
#       ※ create_all은 기존 테이블에 컬럼을 추가하지 않으므로 수동 ALTER 필요.
#       ※ interval_days·is_as_needed는 공유 RDS에 6/5 반영 완료 — 재실행 시 건너뜀.
#
# 재실행 안전 — 이미 있는 컬럼은 건너뜀.

import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import create_engine, text
from app.config import settings

URL = (
    f"mysql+pymysql://{settings.DB_USER}:{settings.DB_PASSWORD}"
    f"@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
)
engine = create_engine(URL)

TABLE = "medication_schedules"

# 컬럼명 → 추가할 정의
COLUMNS = {
    "interval_days":     "ADD COLUMN interval_days INT NULL",
    "is_as_needed":      "ADD COLUMN is_as_needed TINYINT(1) NOT NULL DEFAULT 0",
    "meal_basis":        "ADD COLUMN meal_basis VARCHAR(10) NULL",
    "timing_offset_min": "ADD COLUMN timing_offset_min INT NULL",
}


def existing_cols(conn):
    rows = conn.execute(
        text(
            "SELECT COLUMN_NAME FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA = :db AND TABLE_NAME = :t"
        ),
        {"db": settings.DB_NAME, "t": TABLE},
    )
    return {r[0] for r in rows}


with engine.begin() as conn:
    have = existing_cols(conn)
    for name, ddl in COLUMNS.items():
        if name in have:
            print(f"[{TABLE}.{name}] 이미 있음 — 건너뜀")
            continue
        conn.execute(text(f"ALTER TABLE {TABLE} {ddl}"))
        print(f"[{TABLE}.{name}] 추가 완료")

print("완료 — medication_schedules에 interval_days · is_as_needed · meal_basis · timing_offset_min 보장되었습니다.")
