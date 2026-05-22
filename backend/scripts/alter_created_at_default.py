# backend/scripts/alter_created_at_default.py
# 목적: 모델을 server_default=func.now()로 바꾼 것과 짝을 맞추기 위해,
#       RDS의 created_at / updated_at 컬럼에 DB 기본값(CURRENT_TIMESTAMP)을 추가한다.
#       ※ 이미 들어있는 데이터는 전혀 바뀌지 않음 (NULL 값 채워넣기가 아니라, 칸의 "기본값 규칙"만 변경)
#
# 재실행 안전 — 이미 DEFAULT가 걸린 컬럼에 다시 같은 ALTER를 해도 효과는 동일.

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

# 테이블별로 어떤 컬럼에 DEFAULT를 추가할지 정의.
# created_at만 있는 테이블 / created_at + updated_at 모두 있는 테이블이 섞여 있음.
TABLES_AND_COLS = [
    ("dur_concurrent_ingredient", ["created_at"]),
    ("drug_dose_limit",            ["created_at"]),
    ("drug_info",                  ["created_at", "updated_at"]),
    ("drug_info_detail",           ["created_at", "updated_at"]),
    ("drug_ingredient_map",        ["created_at"]),
    ("dur_concurrent_product",     ["created_at"]),
]


def show_default(conn, table, col):
    return conn.execute(
        text(
            "SELECT COLUMN_DEFAULT FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA = :db AND TABLE_NAME = :t AND COLUMN_NAME = :c"
        ),
        {"db": settings.DB_NAME, "t": table, "c": col},
    ).scalar()


with engine.begin() as conn:
    for table, cols in TABLES_AND_COLS:
        for col in cols:
            before = show_default(conn, table, col)
            if before is not None and before.upper().replace("()", "").strip() in ("CURRENT_TIMESTAMP",):
                print(f"[{table}.{col}] 이미 CURRENT_TIMESTAMP — 건너뜀")
                continue
            print(f"[{table}.{col}] 변경 전: {before!r}")
            conn.execute(
                text(f"ALTER TABLE {table} MODIFY {col} DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP")
            )
            after = show_default(conn, table, col)
            print(f"[{table}.{col}] 변경 후: {after!r}")
        print()

print("완료 — 대상 컬럼들에 CURRENT_TIMESTAMP 기본값이 보장되었습니다.")
