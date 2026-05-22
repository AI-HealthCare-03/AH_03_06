# backend/scripts/verify_unmatched_e_drug.py
# 5a 적재 시 매칭 실패한 e약은요 행들의 정체를 확인.
# 각 미매칭 행에 대해, drug_info에 같은 제품명이 있는지(drug_code만 다른지) 함께 점검.
# 읽기만 함 — DB는 한 글자도 안 바꿈.

import csv
import os
import sys

csv.field_size_limit(sys.maxsize)
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.database import SessionLocal
from app.models.drug_info import DrugInfo


CSV_PATH = "/app/ml_data/OpenData_EasyExcelListC20260513.csv"


def clean(value):
    value = (value or "").strip().strip('"')
    if not value or value == "-":
        return None
    return value


db = SessionLocal()
try:
    code_to_id = dict(
        db.query(DrugInfo.drug_code, DrugInfo.drug_id)
        .filter(DrugInfo.drug_code.isnot(None))
        .all()
    )

    unmatched = []
    with open(CSV_PATH, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f, quoting=csv.QUOTE_NONE)
        for row in reader:
            drug_code = clean(row["품목일련번호"])
            if drug_code is None or drug_code not in code_to_id:
                unmatched.append(
                    {
                        "drug_code": drug_code,
                        "product_name": clean(row["제품명"]),
                        "manufacturer": clean(row["업체명"]),
                    }
                )

    print(f"매칭 실패 총 {len(unmatched)}건의 상세:\n")
    for i, r in enumerate(unmatched, 1):
        # 제품명으로라도 drug_info에 있는지 폴백 검사
        existing = (
            db.query(DrugInfo.drug_id, DrugInfo.drug_code, DrugInfo.manufacturer)
            .filter(DrugInfo.drug_name == r["product_name"])
            .first()
        )
        if existing is None:
            note = "drug_info에 같은 제품명 없음 (허가 빠진 약품 추정)"
        else:
            note = (
                f"제품명은 drug_info에 있음 (drug_id={existing[0]}, "
                f"drug_code={existing[1]!r}, 업체={existing[2]!r}) "
                f"→ drug_code가 CSV와 달라 매칭 실패"
            )
        print(f"  {i}. 품목일련번호={r['drug_code']!r}, 제품명={r['product_name']!r}")
        print(f"     업체={r['manufacturer']!r}")
        print(f"     해석: {note}")
        print()
finally:
    db.close()
