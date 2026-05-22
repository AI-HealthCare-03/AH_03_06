# backend/scripts/verify_recall_in_drug_info.py
# drug_info의 is_recalled / recall_reason 칸이 회수 데이터로 잘 채워졌는지 확인.
# 읽기만 함 — DB는 한 글자도 안 바꿈.

import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.database import SessionLocal
from app.models.drug_info import DrugInfo


db = SessionLocal()
try:
    total = db.query(DrugInfo).count()
    recalled = db.query(DrugInfo).filter(DrugInfo.is_recalled == True).count()
    print(f"전체 drug_info: {total}행")
    print(f"  is_recalled=True: {recalled}행")
    print()
    print("회수 표시된 약품 샘플 3개:")
    for d in db.query(DrugInfo).filter(DrugInfo.is_recalled == True).limit(3).all():
        print(f"  - {d.drug_name}")
        print(f"    사유: {(d.recall_reason or '')[:80]}")
finally:
    db.close()
