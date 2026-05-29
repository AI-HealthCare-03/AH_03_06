# backend/scripts/seed_sleep_master.py
# 수면 가이드 마스터 시드: CAFFEINE_DRINK_TYPE 5종 + CLINICAL_GUIDELINE 5종
#
# 사용:
#   첫 시드:                docker compose exec -T backend python scripts/seed_sleep_master.py
#   카페인 시드 재설계 시:  docker compose exec -T backend python scripts/seed_sleep_master.py --reset-caffeine
#
# 멱등성: 이미 존재하면 skip (name 또는 title 기준 중복 체크)

import argparse
import sys
sys.path.insert(0, '/app')  # docker exec 환경 대비 (cwd 가 /app/scripts 인 경우)

from app.database import SessionLocal
from app.models.user import CaffeineDrinkType
from app.models.clinical_guideline import ClinicalGuideline
from app.models.sleep_survey import SleepSurveyCaffeine


# 시안 5종 묶음으로 재설계 (UX Pilot 시안 Caffeine Drink 화면 기준).
# 각 묶음 대표 mg 는 흔한 1잔 평균 추정 (회귀 β=+0.0002/mg·p=0.26 유의 X 라 정확도 영향 작음).
CAFFEINE_SEEDS = [
    {"name": "커피 1잔",          "caffeine_mg_per_cup": 150},  # 아메리카노 230 / 라떼 150 / 캔커피 75 평균 ≈ 150
    {"name": "녹차·홍차 1잔",     "caffeine_mg_per_cup": 40},   # 녹차 30 / 홍차 50 평균
    {"name": "에너지 드링크 1캔", "caffeine_mg_per_cup": 100},  # 소 30 / 중 80 / 대 160 평균
    {"name": "콜라·탄산음료 1캔", "caffeine_mg_per_cup": 35},   # 콜라 30 / 제로콜라 ~40
    {"name": "초콜릿 음료 1잔",   "caffeine_mg_per_cup": 20},   # 핫초코·코코아 일반
]


# guide_category: 0=sleep, 1=diet, 2=exercise, 3=medication
CLINICAL_GUIDELINE_SEEDS = [
    {
        "title": "한국판 불면증 임상진료지침",
        "publisher": "대한수면학회",
        "publication_year": 2020,
        "guide_category": 0,
        "chroma_collection": "sleep_guidelines",
        "source_url": "https://openingnow.github.io/guidelines/pdfs/2019.pdf",
    },
    {
        "title": "AASM CBT-I 행동·심리 치료 가이드라인",
        "publisher": "American Academy of Sleep Medicine",
        "publication_year": 2021,
        "guide_category": 0,
        "chroma_collection": "sleep_guidelines",
        "source_url": "https://doi.org/10.5664/jcsm.8986",
    },
    {
        "title": "AASM 일주기 리듬 수면각성 장애 가이드라인",
        "publisher": "American Academy of Sleep Medicine",
        "publication_year": 2015,
        "guide_category": 0,
        "chroma_collection": "sleep_guidelines",
        "source_url": "https://doi.org/10.5664/jcsm.4788",
    },
    {
        "title": "성인 만성 불면증의 행동 및 심리 치료 (강력 권고)",
        "publisher": "American Academy of Sleep Medicine",
        "publication_year": 2021,
        "guide_category": 0,
        "chroma_collection": "sleep_guidelines",
        "source_url": "https://doi.org/10.5664/jcsm.8986",
    },
    {
        "title": "성인 만성 불면증의 약물 치료",
        "publisher": "American Academy of Sleep Medicine",
        "publication_year": 2017,
        "guide_category": 0,
        "chroma_collection": "sleep_guidelines",
        "source_url": "https://doi.org/10.5664/jcsm.6470",
    },
]


def seed_caffeine_drink_type(db, reset: bool = False):
    if reset:
        # SLEEP_SURVEY_CAFFEINE 가 caffeine_drink_type_id 를 참조하므로 정션 row 먼저 점검
        survey_caffeine_count = db.query(SleepSurveyCaffeine).count()
        if survey_caffeine_count > 0:
            print(f"[CAFFEINE_DRINK_TYPE] reset 차단: SLEEP_SURVEY_CAFFEINE 에 {survey_caffeine_count} 행 존재 (FK 참조). "
                  f"가이드 데이터부터 정리 후 재시도.")
            return
        deleted = db.query(CaffeineDrinkType).delete()
        db.commit()
        print(f"[CAFFEINE_DRINK_TYPE] reset: {deleted} 행 삭제")

    inserted, skipped = 0, 0
    for entry in CAFFEINE_SEEDS:
        existing = db.query(CaffeineDrinkType).filter(CaffeineDrinkType.name == entry["name"]).first()
        if existing:
            skipped += 1
            continue
        db.add(CaffeineDrinkType(**entry))
        inserted += 1
    db.commit()
    print(f"[CAFFEINE_DRINK_TYPE] inserted={inserted}, skipped={skipped}")


def seed_clinical_guideline(db):
    inserted, skipped = 0, 0
    for entry in CLINICAL_GUIDELINE_SEEDS:
        existing = db.query(ClinicalGuideline).filter(
            ClinicalGuideline.title == entry["title"],
            ClinicalGuideline.publication_year == entry["publication_year"],
        ).first()
        if existing:
            skipped += 1
            continue
        db.add(ClinicalGuideline(**entry))
        inserted += 1
    db.commit()
    print(f"[CLINICAL_GUIDELINE]    inserted={inserted}, skipped={skipped}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--reset-caffeine",
        action="store_true",
        help="caffeine_drink_type 전체 삭제 후 재시드 (시드 재설계 시). "
             "SLEEP_SURVEY_CAFFEINE 참조 행이 있으면 차단됨.",
    )
    args = parser.parse_args()

    db = SessionLocal()
    try:
        seed_caffeine_drink_type(db, reset=args.reset_caffeine)
        seed_clinical_guideline(db)
        # 결과 확인
        caffeine_total = db.query(CaffeineDrinkType).count()
        guideline_total = db.query(ClinicalGuideline).count()
        print()
        print(f"총합 — CAFFEINE_DRINK_TYPE: {caffeine_total}건, CLINICAL_GUIDELINE: {guideline_total}건")
    finally:
        db.close()


if __name__ == "__main__":
    main()
