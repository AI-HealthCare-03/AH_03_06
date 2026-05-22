# backend/scripts/load_dur_ingredient.py
# DUR 성분 병용금기 데이터 적재 스크립트
# CSV(OpenData_PotOpenDurIngr) → dur_concurrent_ingredient 테이블

import csv
import os
import sys
from datetime import datetime

# CSV 한 칸의 글자 수 제한을 최대로 늘림 (DUR 금기내용 등 매우 긴 필드 대응)
csv.field_size_limit(sys.maxsize)

# backend 폴더를 import 경로에 추가 (app.* 를 불러오기 위해)
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import create_engine, insert
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.models.dur_concurrent_ingredient import DurConcurrentIngredient

# 적재 전용 빠른 엔진 (executemany 다건 INSERT 활성화)
FAST_URL = (
    f"mysql+pymysql://{settings.DB_USER}:{settings.DB_PASSWORD}"
    f"@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
)
fast_engine = create_engine(
    FAST_URL,
    insertmanyvalues_page_size=1000,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=fast_engine)

# CSV 파일 위치 (docker 안 /app/ml_data/ 에 복사한 위치)
CSV_PATH = "/app/ml_data/OpenData_PotOpenDurIngr_AC20260513.csv"


def parse_date(value):
    """'20090303' 같은 문자열을 날짜로 변환. 빈 값('-')이면 None."""
    value = (value or "").strip()
    if not value or value == "-":
        return None
    try:
        return datetime.strptime(value, "%Y%m%d").date()
    except ValueError:
        return None


def clean(value):
    """빈 값('-')을 None으로 정리. 앞뒤 따옴표도 제거."""
    value = (value or "").strip().strip('"')
    if not value or value == "-":
        return None
    return value


def main():
    import time
    t0 = time.time()
    db = SessionLocal()
    try:
        with open(CSV_PATH, encoding="utf-8-sig") as f:
            reader = csv.DictReader(f, quoting=csv.QUOTE_NONE)

            rows = []
            for row in reader:
                rows.append(
                    {
                        "dur_seq": int(row["DUR일련번호"]),
                        "dur_type": clean(row["DUR유형"]),
                        "ingredient_code_a": clean(row["DUR성분코드"]),
                        "ingredient_name_a": clean(row["DUR성분명"]),
                        "ingredient_code_b": clean(row["병용금기DUR성분코드"]),
                        "ingredient_name_b": clean(row["병용금기DUR성분명"]),
                        "prohibition_reason": clean(row["금기내용"]),
                        "grade": clean(row["등급"]),
                        "notice_date": parse_date(row["고시일자"]),
                    }
                )

        print(f"읽은 행 수: {len(rows)}")
        print(f"  [시간] CSV 읽기까지: {time.time() - t0:.1f}초")

        # SA 2.0의 insertmanyvalues는 dict의 NULL 패턴이 바뀌는 지점마다 배치를 끊는다.
        # 같은 NULL 패턴끼리 모이도록 정렬해 두면 한 번에 묶음 전송된다.
        # (현재 데이터는 운 좋게 패턴이 단조라 정렬 없어도 3초대지만, 데이터가 바뀌어도 안전하도록 예방 적용)
        nullable_fields = ("ingredient_name_a", "ingredient_name_b", "prohibition_reason", "grade", "notice_date")
        rows.sort(key=lambda r: tuple(r[k] is None for k in nullable_fields))

        # 기존 데이터 비우기 (재적재 시 중복 방지)
        deleted = db.query(DurConcurrentIngredient).delete()
        print(f"기존 데이터 삭제: {deleted}행")

        # 한꺼번에 DB에 넣기 (Core insert — 다건 묶음 INSERT로 최대 속도)
        t_before_insert = time.time()
        db.execute(insert(DurConcurrentIngredient), rows)
        db.commit()
        print(f"  [시간] DB 넣기(commit까지): {time.time() - t_before_insert:.1f}초")

        # 잘 들어갔는지 개수 확인
        count = db.query(DurConcurrentIngredient).count()
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