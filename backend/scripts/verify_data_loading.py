# backend/scripts/verify_data_loading.py
# 적재 종합 검증 — 읽기 전용, DB 변경 없음.
#
# 검증 항목:
#   [0] 테이블별 행 수 요약
#   [1] FK 무결성 (자식 테이블의 drug_id가 drug_info에 다 존재하는지)
#   [2] 커버리지 (drug_info 기준 자식 데이터 비율)
#   [3] 종단 trace — drug_info + e약은요 + 성분매핑 다 있는 약품 샘플로 흐름 확인

import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from app.database import SessionLocal
from app.models.drug_info import DrugInfo
from app.models.drug_info_detail import DrugInfoDetail
from app.models.drug_ingredient_map import DrugIngredientMap
from app.models.dur_concurrent_ingredient import DurConcurrentIngredient
from app.models.dur_concurrent_product import DurConcurrentProduct
from app.models.drug_dose_limit import DrugDoseLimit


def section(title):
    print()
    print("=" * 70)
    print(title)
    print("=" * 70)


db = SessionLocal()
try:
    # ── [0] 테이블별 행 수 ───────────────────────────────────────
    section("[0] 테이블별 행 수")
    counts = {
        "drug_info":                          db.query(DrugInfo).count(),
        "drug_info_detail (전체)":            db.query(DrugInfoDetail).count(),
        "drug_info_detail (e_drug)":          db.query(DrugInfoDetail).filter(DrugInfoDetail.source_type == "e_drug").count(),
        "drug_info_detail (permit_detail)":   db.query(DrugInfoDetail).filter(DrugInfoDetail.source_type == "permit_detail").count(),
        "drug_ingredient_map":                db.query(DrugIngredientMap).count(),
        "drug_dose_limit":                    db.query(DrugDoseLimit).count(),
        "dur_concurrent_ingredient":          db.query(DurConcurrentIngredient).count(),
        "dur_concurrent_product":             db.query(DurConcurrentProduct).count(),
    }
    for name, n in counts.items():
        print(f"  {name:38}  {n:>10,}행")

    # ── [1] FK 무결성 ────────────────────────────────────────────
    section("[1] FK 무결성 — 자식 테이블의 drug_id가 모두 drug_info에 존재하는가")
    orphan_detail = db.execute(text("""
        SELECT COUNT(*) FROM drug_info_detail d
        LEFT JOIN drug_info p ON d.drug_id = p.drug_id
        WHERE p.drug_id IS NULL
    """)).scalar()
    orphan_map = db.execute(text("""
        SELECT COUNT(*) FROM drug_ingredient_map m
        LEFT JOIN drug_info p ON m.drug_id = p.drug_id
        WHERE p.drug_id IS NULL
    """)).scalar()
    print(f"  drug_info_detail   고아 행: {orphan_detail}")
    print(f"  drug_ingredient_map 고아 행: {orphan_map}")
    print(f"  → {'무결성 OK ✅' if orphan_detail == 0 and orphan_map == 0 else '문제 발견 ❌'}")

    # ── [2] 커버리지 ────────────────────────────────────────────
    section("[2] 커버리지 (drug_info 43,180행 기준)")
    total = counts["drug_info"]

    with_e_drug = db.execute(text(
        "SELECT COUNT(DISTINCT drug_id) FROM drug_info_detail WHERE source_type = 'e_drug'"
    )).scalar()
    with_mapping = db.execute(text(
        "SELECT COUNT(DISTINCT drug_id) FROM drug_ingredient_map"
    )).scalar()
    recalled = db.query(DrugInfo).filter(DrugInfo.is_recalled == True).count()

    print(f"  e약은요 텍스트 보유 약품:   {with_e_drug:>7,} ({with_e_drug/total*100:5.1f}%)")
    print(f"  성분 매핑 보유 약품:       {with_mapping:>7,} ({with_mapping/total*100:5.1f}%)")
    print(f"  회수 표시된 약품:          {recalled:>7,} ({recalled/total*100:5.1f}%)")

    distinct_ingredients = db.execute(text(
        "SELECT COUNT(DISTINCT ingredient_code) FROM drug_ingredient_map"
    )).scalar()
    main_pairs = db.execute(text(
        "SELECT COUNT(*) FROM drug_ingredient_map WHERE is_main = TRUE"
    )).scalar()
    add_pairs = db.execute(text(
        "SELECT COUNT(*) FROM drug_ingredient_map WHERE is_main = FALSE"
    )).scalar()
    print(f"  drug_ingredient_map 고유 성분 수: {distinct_ingredients:,}")
    print(f"    주성분 관계: {main_pairs:>9,}개")
    print(f"    첨가제 관계: {add_pairs:>9,}개")

    # ── [3] 종단 trace ──────────────────────────────────────────
    section("[3] 종단 trace — drug_info + e약은요 + 성분매핑이 모두 있는 약품 2개")
    sample_drugs = db.execute(text("""
        SELECT d.drug_id, d.drug_name, d.manufacturer, d.is_recalled
        FROM drug_info d
        WHERE EXISTS (SELECT 1 FROM drug_info_detail WHERE drug_id = d.drug_id AND source_type = 'e_drug')
          AND EXISTS (SELECT 1 FROM drug_ingredient_map WHERE drug_id = d.drug_id)
        LIMIT 2
    """)).all()

    for drug_id, drug_name, manufacturer, is_recalled in sample_drugs:
        print()
        print(f"  ▶ drug_id={drug_id}  '{drug_name}'")
        print(f"    제조사: {manufacturer},  회수표시: {is_recalled}")

        ingredients = db.execute(text("""
            SELECT ingredient_code, ingredient_name, is_main
            FROM drug_ingredient_map WHERE drug_id = :id
            ORDER BY is_main DESC, ingredient_code
        """), {"id": drug_id}).all()
        mains = [(c, n) for c, n, m in ingredients if m]
        adds = [(c, n) for c, n, m in ingredients if not m]
        print(f"    주성분({len(mains)}): " + ", ".join(f"{c}({n})" for c, n in mains[:4]) + ("..." if len(mains) > 4 else ""))
        print(f"    첨가제({len(adds)}): " + ", ".join(f"{c}({n})" for c, n in adds[:3]) + ("..." if len(adds) > 3 else ""))

        detail = db.execute(text("""
            SELECT efficacy, usage_method, side_effects
            FROM drug_info_detail WHERE drug_id = :id AND source_type = 'e_drug'
            LIMIT 1
        """), {"id": drug_id}).first()
        if detail:
            eff = (detail[0] or "")[:80]
            usage = (detail[1] or "")[:80]
            side = (detail[2] or "")[:80]
            print(f"    효능 일부 : {eff}{'...' if len(detail[0] or '') > 80 else ''}")
            print(f"    용법 일부 : {usage}{'...' if len(detail[1] or '') > 80 else ''}")
            print(f"    이상반응 : {side}{'...' if len(detail[2] or '') > 80 else ''}")

finally:
    db.close()

print()
print("검증 완료.")
