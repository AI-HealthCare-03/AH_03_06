# backend/scripts/load_dose_limit.py
# 1일 최대 투여량 데이터 적재 스크립트
# CSV(OpenData_DayMaxDosgQyInfo) → drug_dose_limit 테이블

import csv
import os
import sys
import time
from decimal import Decimal, InvalidOperation

# CSV 한 칸의 글자 수 제한을 최대로 늘림
csv.field_size_limit(sys.maxsize)

# backend 폴더를 import 경로에 추가
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import insert
from app.database import SessionLocal
from app.models.drug_dose_limit import DrugDoseLimit

# CSV 파일 위치 (docker 안 /app/ml_data/ 에 복사한 위치)
CSV_PATH = "/app/ml_data/OpenData_DayMaxDosgQyInfoC20260513.csv"


def clean(value):
    """빈 값('-')을 None으로 정리. 앞뒤 따옴표도 제거."""
    value = (value or "").strip().strip('"')
    if not value or value == "-":
        return None
    return value


def parse_decimal(value):
    """'4.5' 같은 문자열을 숫자로 변환. 변환 불가 시 None."""
    value = clean(value)
    if value is None:
        return None
    try:
        return Decimal(value)
    except InvalidOperation:
        return None


def main():
    t0 = time.time()
    db = SessionLocal()
    try:
        with open(CSV_PATH, encoding="utf-8-sig") as f:
            reader = csv.DictReader(f, quoting=csv.QUOTE_NONE)

            rows = []
            skipped = 0
            for row in reader:
                code = clean(row["성분코드"])
                dose = parse_decimal(row["1일최대투여량"])

                # 성분코드나 최대투여량이 없으면 건너뛰기 (필수값)
                if code is None or dose is None:
                    skipped += 1
                    continue

                rows.append(
                    {
                        "ingredient_code": code,
                        "ingredient_name_ko": clean(row["성분명(한글)"]),
                        "dosage_form_code": clean(row["제형코드"]),
                        "dosage_form": clean(row["제형명"]),
                        "route": clean(row["투여경로"]),
                        "dose_unit": clean(row["투여단위"]),
                        "max_daily_dose": dose,
                    }
                )

        print(f"읽은 행 수: {len(rows)} (건너뛴 행: {skipped})")
        print(f"  [시간] CSV 읽기까지: {time.time() - t0:.1f}초")

        # SA 2.0의 insertmanyvalues는 dict의 NULL 패턴이 바뀌는 지점마다 배치를 끊는다.
        # 같은 NULL 패턴끼리 모이도록 정렬해 두면 한 번에 묶음 전송된다. (144초 → 3.2초)
        nullable_fields = ("ingredient_name_ko", "dosage_form_code", "dosage_form", "route", "dose_unit")
        rows.sort(key=lambda r: tuple(r[k] is None for k in nullable_fields))

        # 기존 데이터 비우기 (재적재 시 중복 방지)
        deleted = db.query(DrugDoseLimit).delete()
        print(f"기존 데이터 삭제: {deleted}행")

        # 한꺼번에 DB에 넣기 (Core insert)
        t_before_insert = time.time()
        db.execute(insert(DrugDoseLimit), rows)
        db.commit()
        print(f"  [시간] DB 넣기(commit까지): {time.time() - t_before_insert:.1f}초")

        # 잘 들어갔는지 개수 확인
        count = db.query(DrugDoseLimit).count()
        print(f"DB에 저장된 행 수: {count}")
        print(f"  [시간] 전체 완료까지: {time.time() - t0:.1f}초")
        print("적재 완료!")

    except Exception as e:
        db.rollback()
        print(f"에러 발생 — 롤백했습니다: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()