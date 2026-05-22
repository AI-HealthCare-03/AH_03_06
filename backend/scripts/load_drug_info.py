# backend/scripts/load_drug_info.py
# 약품 기준 정보 적재 스크립트
# CSV(OpenData_ItemPermit) + CSV(OpenData_PotOpenRecallSaleStop) → drug_info 테이블
#
# 적재 흐름:
#   1) 회수 CSV(933행)를 먼저 읽어 품목명 → 회수사유 매핑을 만든다.
#   2) ItemPermit CSV(43,276행)를 읽으면서, 같은 품목명이 회수 목록에 있으면 is_recalled=True / recall_reason 채움.
#   3) drug_name UNIQUE 제약을 지키기 위해 dedup.
#   4) NULL 패턴별 정렬 후 한 번에 묶음 INSERT (SA 배칭 깨짐 방지 — 이전 작업 경험).

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
from app.models.drug_ingredient_map import DrugIngredientMap

# 적재 전용 빠른 엔진 (executemany 다건 INSERT 활성화)
FAST_URL = (
    f"mysql+pymysql://{settings.DB_USER}:{settings.DB_PASSWORD}"
    f"@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
)
fast_engine = create_engine(FAST_URL, insertmanyvalues_page_size=1000)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=fast_engine)

PERMIT_CSV = "/app/ml_data/OpenData_ItemPermitC20260513.csv"
RECALL_CSV = "/app/ml_data/OpenData_PotOpenRecallSaleStopC20260513.csv"


def clean(value):
    """빈 값('-')을 None으로, 앞뒤 따옴표·공백 제거."""
    value = (value or "").strip().strip('"')
    if not value or value == "-":
        return None
    return value


def main():
    t0 = time.time()

    # 1) 회수 CSV → {품목명: 회수사유 문자열} 사전 만들기
    recalls = {}
    with open(RECALL_CSV, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f, quoting=csv.QUOTE_NONE)
        for row in reader:
            name = clean(row["품목명"])
            if name is None:
                continue
            reason = clean(row["회수사유내용"]) or ""
            order_date = clean(row["회수명령일자"])
            full = f"{reason} (회수명령일자: {order_date})" if order_date else (reason or None)
            recalls[name] = full
    print(f"회수 데이터: {len(recalls)}건 로드")

    # 2) ItemPermit 읽기 + 회수 정보 합치기 + dedup
    rows = []
    seen_names = set()
    dup_name = 0
    matched_recall = 0
    with open(PERMIT_CSV, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f, quoting=csv.QUOTE_NONE)
        for row in reader:
            drug_name = clean(row["품목명"])
            if drug_name is None:
                continue
            if drug_name in seen_names:
                dup_name += 1
                continue
            seen_names.add(drug_name)

            if drug_name in recalls:
                is_recalled = True
                recall_reason = recalls[drug_name]
                matched_recall += 1
            else:
                is_recalled = False
                recall_reason = None

            rows.append(
                {
                    "drug_name": drug_name,
                    "generic_name": clean(row["주성분"]),
                    "drug_code": clean(row["품목일련번호"]),
                    "manufacturer": clean(row["업체명"]),
                    "dosage_form": None,        # 본 CSV에 없음
                    "drug_type": clean(row["전문일반구분"]),
                    "atc_code": None,           # 본 CSV에 없음 ("분류명"은 ATC가 아님)
                    "is_recalled": is_recalled,
                    "recall_reason": recall_reason,
                }
            )
    print(f"읽은 행 수: {len(rows)}  (drug_name 중복 건너뜀: {dup_name}, 회수 매칭: {matched_recall}건)")
    print(f"  [시간] CSV 읽기까지: {time.time() - t0:.1f}초")

    # 3) NULL 패턴별 정렬 (SA 배칭 깨짐 방지)
    nullable_fields = ("generic_name", "drug_code", "manufacturer", "dosage_form",
                       "drug_type", "atc_code", "recall_reason")
    rows.sort(key=lambda r: tuple(r[k] is None for k in nullable_fields))

    # 4) DB 적재
    db = SessionLocal()
    try:
        # ★ 안전 가드 — drug_info 재적재는 자식 테이블(drug_ingredient_map, drug_info_detail)이
        #   비어있을 때만 허용. drug_id를 참조하므로 DELETE→재INSERT 시 FK 위반 또는 고아 행 발생.
        #   drug_info 보강이 필요하면 이 스크립트를 다시 돌리지 말고, 별도 UPDATE 스크립트로
        #   drug_id 매칭해서 손대야 한다.
        child_counts = {
            "drug_info_detail": db.query(DrugInfoDetail).count(),
            "drug_ingredient_map": db.query(DrugIngredientMap).count(),
        }
        non_empty = {k: v for k, v in child_counts.items() if v > 0}
        if non_empty:
            raise RuntimeError(
                f"중단 — drug_info 재적재 거부. 자식 테이블에 데이터 있음: {non_empty}. "
                f"재적재 시 FK 위반·고아 행 위험. 보강이 필요하면 UPDATE 스크립트로만 진행."
            )

        deleted = db.query(DrugInfo).delete()
        print(f"기존 데이터 삭제: {deleted}행")

        t_before_insert = time.time()
        db.execute(insert(DrugInfo), rows)
        db.commit()
        print(f"  [시간] DB 넣기(commit까지): {time.time() - t_before_insert:.1f}초")

        count = db.query(DrugInfo).count()
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
