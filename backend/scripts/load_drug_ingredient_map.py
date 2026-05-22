# backend/scripts/load_drug_ingredient_map.py
# 약품 ↔ 성분 N:M 매핑 적재 스크립트
# XLS(ItemPermitDetail)의 '주성분명' / '첨가제명' 컬럼에서 [M코드]이름 패턴을 파싱.
#
# 데이터 흐름:
#   1) drug_info에서 drug_code → drug_id, drug_name → drug_id 사전(폴백 포함)
#   2) XLS 한 줄씩 읽으며 주성분명·첨가제명 파싱
#   3) 같은 (drug_id, ingredient_code) 충돌 시 주성분(is_main=True)이 첨가제(False)를 이김
#   4) UNIQUE (drug_id, ingredient_code) 메모리 dedup
#   5) NULL 정렬 후 묶음 INSERT
#
# 파싱 형식:  "[M040702]포도당|[M040426]염화나트륨"  →  [("M040702", "포도당"), ("M040426", "염화나트륨")]

import os
import re
import sys
import time

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

import xlrd
from sqlalchemy import create_engine, insert
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.models.drug_info import DrugInfo
from app.models.drug_ingredient_map import DrugIngredientMap

# 적재 전용 빠른 엔진
FAST_URL = (
    f"mysql+pymysql://{settings.DB_USER}:{settings.DB_PASSWORD}"
    f"@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
)
fast_engine = create_engine(FAST_URL, insertmanyvalues_page_size=1000)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=fast_engine)

XLS_PATH = "/app/ml_data/OpenData_ItemPermitDetail20260513.xls"

# XLS 컬럼 인덱스 (peek_item_permit_detail.py 결과 기준)
COL_DRUG_CODE = 2     # 품목일련번호
COL_DRUG_NAME = 0     # 품목명 (폴백용)
COL_MAIN = 32         # 주성분명
COL_ADDITIVE = 33     # 첨가제명

INGREDIENT_RE = re.compile(r"^\[(M\d+)\](.+)$")


def parse_ingredients(value):
    """'[M040702]포도당|[M040426]염화나트륨' → [('M040702', '포도당'), ('M040426', '염화나트륨')]"""
    if not value or not str(value).strip() or str(value).strip() == "-":
        return []
    results = []
    for chunk in str(value).split("|"):
        chunk = chunk.strip()
        if not chunk:
            continue
        m = INGREDIENT_RE.match(chunk)
        if m:
            code = m.group(1).strip()
            name = m.group(2).strip()
            results.append((code, name))
        # M코드 패턴이 없는 청크는 조용히 무시 (예: 단순 텍스트)
    return results


def cell_str(sheet, r, c):
    v = sheet.cell(r, c).value
    if v is None:
        return None
    s = str(v).strip()
    return s if s else None


def main():
    t0 = time.time()
    db = SessionLocal()
    try:
        # 1) 매칭 사전 만들기
        code_to_id = dict(
            db.query(DrugInfo.drug_code, DrugInfo.drug_id)
            .filter(DrugInfo.drug_code.isnot(None))
            .all()
        )
        name_to_id = dict(db.query(DrugInfo.drug_name, DrugInfo.drug_id).all())
        print(f"drug_code → drug_id 사전: {len(code_to_id)}건")
        print(f"drug_name → drug_id 사전(폴백): {len(name_to_id)}건")

        # 2) XLS 열기
        t = time.time()
        book = xlrd.open_workbook(XLS_PATH)
        sheet = book.sheet_by_index(0)
        print(f"XLS 열기: {sheet.nrows}행 × {sheet.ncols}열  ({time.time()-t:.1f}초)")

        # 3) 행 순회 + 파싱 + 매핑
        # pair_key (drug_id, ingredient_code) → {"ingredient_name": str|None, "is_main": bool}
        # 주성분(True)을 먼저 등록하고, 첨가제(False)는 같은 키가 이미 있으면 덮어쓰지 않는다.
        pairs = {}
        unmatched_drug = 0
        no_ingredient = 0
        fallback_hits = 0

        for r in range(1, sheet.nrows):
            drug_code = cell_str(sheet, r, COL_DRUG_CODE)
            drug_name = cell_str(sheet, r, COL_DRUG_NAME)

            drug_id = code_to_id.get(drug_code) if drug_code else None
            if drug_id is None and drug_name:
                drug_id = name_to_id.get(drug_name)
                if drug_id is not None:
                    fallback_hits += 1
            if drug_id is None:
                unmatched_drug += 1
                continue

            main_value = cell_str(sheet, r, COL_MAIN)
            add_value = cell_str(sheet, r, COL_ADDITIVE)
            mains = parse_ingredients(main_value)
            adds = parse_ingredients(add_value)

            if not mains and not adds:
                no_ingredient += 1
                continue

            # 주성분 먼저 등록 (충돌 시 주성분이 우선)
            for code, name in mains:
                key = (drug_id, code)
                pairs[key] = {"ingredient_name": name, "is_main": True}
            # 그다음 첨가제 — 같은 키가 이미 주성분으로 있으면 건너뜀
            for code, name in adds:
                key = (drug_id, code)
                if key in pairs:
                    continue
                pairs[key] = {"ingredient_name": name, "is_main": False}

        print(f"XLS 순회: drug 미매칭 {unmatched_drug}행, 성분 정보 없음 {no_ingredient}행, "
              f"drug_name 폴백 매칭 {fallback_hits}건")
        print(f"  [시간] XLS 파싱까지: {time.time() - t0:.1f}초")

        # 4) dict → 행 리스트 변환
        rows = [
            {
                "drug_id": drug_id,
                "ingredient_code": code,
                "ingredient_name": v["ingredient_name"],
                "is_main": v["is_main"],
            }
            for (drug_id, code), v in pairs.items()
        ]
        print(f"적재 대상: {len(rows)}건 "
              f"(주성분: {sum(1 for r in rows if r['is_main'])}건, "
              f"첨가제: {sum(1 for r in rows if not r['is_main'])}건)")

        # 5) NULL 패턴별 정렬 (ingredient_name만 nullable)
        rows.sort(key=lambda r: (r["ingredient_name"] is None,))

        # 6) DB 적재
        deleted = db.query(DrugIngredientMap).delete()
        print(f"기존 데이터 삭제: {deleted}행")

        t_before_insert = time.time()
        db.execute(insert(DrugIngredientMap), rows)
        db.commit()
        print(f"  [시간] DB 넣기(commit까지): {time.time() - t_before_insert:.1f}초")

        count = db.query(DrugIngredientMap).count()
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
