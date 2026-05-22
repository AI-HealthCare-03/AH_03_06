# backend/scripts/load_drug_info_detail_e_drug.py
# e약은요(EasyExcelList) → drug_info_detail 테이블 적재 (source_type='e_drug')
#
# 적재 흐름:
#   1) drug_info에서 drug_code → drug_id 사전을 메모리에 만든다.
#   2) EasyExcelList CSV를 읽으면서 품목일련번호로 drug_id를 찾아 7개 텍스트 필드와 함께 dict 구성.
#   3) drug_info에 없는 품목일련번호는 건너뜀(미매칭).
#   4) NULL 패턴별 정렬 후 한 번에 묶음 INSERT.
#   5) 기존에 source_type='e_drug'로 들어있던 행만 미리 비움 (permit_detail 데이터는 안 건드림).

import csv
import os
import sys
import time

csv.field_size_limit(sys.maxsize)
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import create_engine, insert
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.models.drug_info import DrugInfo
from app.models.drug_info_detail import DrugInfoDetail

# 적재 전용 빠른 엔진 (executemany 다건 INSERT 활성화)
FAST_URL = (
    f"mysql+pymysql://{settings.DB_USER}:{settings.DB_PASSWORD}"
    f"@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
)
fast_engine = create_engine(FAST_URL, insertmanyvalues_page_size=1000)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=fast_engine)

CSV_PATH = "/app/ml_data/OpenData_EasyExcelListC20260513.csv"
SOURCE_TYPE = "e_drug"

# CSV 한글 컬럼명 → drug_info_detail 필드명
COL_MAP = {
    "이 약의 효능은 무엇입니까?": "efficacy",
    "이 약은 어떻게 사용합니까?": "usage_method",
    "이 약을 사용하기 전에 반드시 알아야 할 내용은 무엇입니까?": "precautions_before",
    "이 약의 사용상 주의사항은 무엇입니까?": "precautions_usage",
    "이 약을 사용하는 동안 주의해야 할 약 또는 음식은 무엇입니까?": "drug_food_interactions",
    "이 약은 어떤 이상반응이 나타날 수 있습니까?": "side_effects",
    "이 약은 어떻게 보관해야 합니까?": "storage_method",
}
TEXT_FIELDS = tuple(COL_MAP.values())  # NULL 정렬용


def clean(value):
    """빈 값('-')을 None으로, 앞뒤 따옴표·공백 제거."""
    value = (value or "").strip().strip('"')
    if not value or value == "-":
        return None
    return value


def main():
    t0 = time.time()
    db = SessionLocal()
    try:
        # 1) 매칭용 사전 두 개 만들기
        #   주: drug_code(품목일련번호) → drug_id
        #   폴백: drug_name(제품명) → drug_id
        #         식약처가 같은 약품에 새 품목일련번호를 재발급하는 경우 대응
        #         drug_name은 drug_info에서 UNIQUE 제약 → 폴백 안전
        t = time.time()
        code_to_id = dict(
            db.query(DrugInfo.drug_code, DrugInfo.drug_id)
            .filter(DrugInfo.drug_code.isnot(None))
            .all()
        )
        name_to_id = dict(db.query(DrugInfo.drug_name, DrugInfo.drug_id).all())
        print(f"drug_code → drug_id 사전: {len(code_to_id)}건")
        print(f"drug_name → drug_id 사전(폴백용): {len(name_to_id)}건")
        print(f"  [시간] 사전 구축: {time.time()-t:.1f}초")

        # 2) CSV 읽기 + 매핑
        rows = []
        unmatched = 0
        fallback_hits = 0
        with open(CSV_PATH, encoding="utf-8-sig") as f:
            reader = csv.DictReader(f, quoting=csv.QUOTE_NONE)
            for row in reader:
                drug_code = clean(row["품목일련번호"])
                product_name = clean(row["제품명"])

                drug_id = code_to_id.get(drug_code) if drug_code else None
                if drug_id is None and product_name:
                    drug_id = name_to_id.get(product_name)
                    if drug_id is not None:
                        fallback_hits += 1

                if drug_id is None:
                    unmatched += 1
                    continue

                record = {"drug_id": drug_id, "source_type": SOURCE_TYPE}
                for csv_col, model_field in COL_MAP.items():
                    record[model_field] = clean(row[csv_col])
                rows.append(record)

        print(f"읽은 행 수: {len(rows)}  (drug_code 매칭: {len(rows) - fallback_hits}, drug_name 폴백 매칭: {fallback_hits}, 미매칭: {unmatched})")
        print(f"  [시간] CSV 읽기까지: {time.time() - t0:.1f}초")

        # 3) NULL 패턴별 정렬 (SA 배칭 깨짐 방지)
        rows.sort(key=lambda r: tuple(r[k] is None for k in TEXT_FIELDS))

        # 4) 기존 e_drug 행만 비우기 (permit_detail 데이터는 안 건드림)
        deleted = (
            db.query(DrugInfoDetail)
            .filter(DrugInfoDetail.source_type == SOURCE_TYPE)
            .delete()
        )
        print(f"기존 source_type='{SOURCE_TYPE}' 데이터 삭제: {deleted}행")

        # 5) 묶음 INSERT
        t_before_insert = time.time()
        db.execute(insert(DrugInfoDetail), rows)
        db.commit()
        print(f"  [시간] DB 넣기(commit까지): {time.time() - t_before_insert:.1f}초")

        # 6) 검증
        count = (
            db.query(DrugInfoDetail)
            .filter(DrugInfoDetail.source_type == SOURCE_TYPE)
            .count()
        )
        print(f"DB에 저장된 행 수 (source_type='{SOURCE_TYPE}'): {count}")
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
