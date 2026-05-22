# backend/scripts/load_dur_product.py
# DUR 품목 단위 병용금기 데이터 적재 스크립트
# CSV(OpenData_PotOpenDurItem) → dur_concurrent_product 테이블
#
# 핵심:
#   - 약 404,121행 — 최대 규모. NULL 정렬 패턴이 필수 (없으면 시간 단위로 늘어남).
#   - UNIQUE 제약 (dur_seq, item_seq_a, item_seq_b) → 메모리 dedup으로 사전 차단.
#   - 정수 필드 3개(dur_seq, item_seq_a, item_seq_b)가 NOT NULL → 변환 실패 시 행 스킵.
#   - grade 컬럼은 CSV에 없어 항상 None.

import csv
import os
import sys
import time
from datetime import datetime

csv.field_size_limit(sys.maxsize)
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import create_engine, insert
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.models.dur_concurrent_product import DurConcurrentProduct

# 적재 전용 빠른 엔진
FAST_URL = (
    f"mysql+pymysql://{settings.DB_USER}:{settings.DB_PASSWORD}"
    f"@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
)
fast_engine = create_engine(FAST_URL, insertmanyvalues_page_size=1000)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=fast_engine)

CSV_PATH = "/app/ml_data/OpenData_PotOpenDurItem_AC20260513.csv"


def clean(value):
    value = (value or "").strip().strip('"')
    if not value or value == "-":
        return None
    return value


def parse_date(value):
    """'20171106' → date. 빈 값('-')이면 None."""
    value = (value or "").strip()
    if not value or value == "-":
        return None
    try:
        return datetime.strptime(value, "%Y%m%d").date()
    except ValueError:
        return None


def parse_int(value):
    """문자열 → int. 빈 값('-' 등) 또는 변환 실패면 None."""
    value = (value or "").strip().strip('"')
    if not value or value == "-":
        return None
    try:
        return int(value)
    except ValueError:
        return None


def main():
    t0 = time.time()

    # 1) CSV 읽기 + dedup + 정수 검증
    rows = []
    seen_keys = set()
    skipped_invalid = 0   # 필수 정수 변환 실패
    duplicates = 0        # 유니크 키 중복
    with open(CSV_PATH, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f, quoting=csv.QUOTE_NONE)
        for csv_row in reader:
            dur_seq = parse_int(csv_row["DUR일련번호"])
            item_seq_a = parse_int(csv_row["품목일련번호"])
            item_seq_b = parse_int(csv_row["병용금기품목기준코드"])

            # NOT NULL Integer 3개 중 하나라도 변환 실패 → 스킵 (DB에 못 넣음)
            if dur_seq is None or item_seq_a is None or item_seq_b is None:
                skipped_invalid += 1
                continue

            # UNIQUE 제약 (dur_seq, item_seq_a, item_seq_b) — 메모리 dedup
            key = (dur_seq, item_seq_a, item_seq_b)
            if key in seen_keys:
                duplicates += 1
                continue
            seen_keys.add(key)

            rows.append(
                {
                    "dur_seq": dur_seq,
                    "dur_type": clean(csv_row["DUR유형명"]),
                    "item_seq_a": item_seq_a,
                    "item_name_a": clean(csv_row["품목명"]),
                    "item_seq_b": item_seq_b,
                    "item_name_b": clean(csv_row["병용금기품목명"]),
                    "prohibition_reason": clean(csv_row["금기내용"]),
                    "grade": None,  # CSV에 grade 컬럼 없음
                    "notice_date": parse_date(csv_row["고시일자"]),
                }
            )

    print(f"읽은 행 수: {len(rows)}")
    print(f"  필수값 누락으로 스킵: {skipped_invalid}, 유니크키 중복으로 스킵: {duplicates}")
    print(f"  [시간] CSV 읽기까지: {time.time() - t0:.1f}초")

    # 2) NULL 패턴별 정렬 (배칭 깨짐 방지 — 404K행에선 결정적)
    nullable_fields = ("item_name_a", "item_name_b", "prohibition_reason", "grade", "notice_date")
    rows.sort(key=lambda r: tuple(r[k] is None for k in nullable_fields))

    # 3) DB 적재
    db = SessionLocal()
    try:
        deleted = db.query(DurConcurrentProduct).delete()
        print(f"기존 데이터 삭제: {deleted}행")

        t_before_insert = time.time()
        db.execute(insert(DurConcurrentProduct), rows)
        db.commit()
        print(f"  [시간] DB 넣기(commit까지): {time.time() - t_before_insert:.1f}초")

        count = db.query(DurConcurrentProduct).count()
        print(f"DB에 저장된 행 수: {count}")
        print(f"  [시간] 전체 완료까지: {time.time() - t0:.1f}초")
        print("적재 완료")

    except Exception as e:
        db.rollback()
        print(f"에러 발생 — 롤백했습니다: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
