# backend/scripts/verify_sleep_guide_flow.py
# 수면 가이드 정식 흐름 검증 — generate/get/list/delete + 본인 검증.
# HTTP 우회, 서비스 함수 직접 호출.
#
# 사용:
#   docker compose exec -T backend python scripts/verify_sleep_guide_flow.py
#
# 전제: User 1명 이상 존재. OpenAI 호출 발생 (gpt-4o-mini 1회 ~$0.002).

import sys
sys.path.insert(0, '/app')

import asyncio

from app.database import SessionLocal
from app.models.user import User
from app.models.sleep_guide import SleepGuide
from app.schemas.sleep_guide import SleepGenerateRequest, CaffeineEntry
from app.services import sleep_guide_service as svc


async def main():
    db = SessionLocal()
    try:
        user = db.query(User).first()
        if not user:
            print("FAIL: User 0명 — 회원 먼저 필요")
            return
        user_id = user.id
        print(f"[setup] user_id={user_id}")

        before = db.query(SleepGuide).filter(SleepGuide.user_id == user_id).count()
        print(f"[setup] 기존 수면 가이드 수: {before}")

        # 커피 시드 id 조회 (5종 재설계 후 id 비순차일 수 있음)
        from app.models.user import CaffeineDrinkType
        coffee = db.query(CaffeineDrinkType).filter(CaffeineDrinkType.name == "커피 1잔").first()
        energy = db.query(CaffeineDrinkType).filter(CaffeineDrinkType.name == "에너지 드링크 1캔").first()
        caffeine_entries = []
        if coffee:
            caffeine_entries.append(CaffeineEntry(caffeine_drink_type_id=coffee.id, cups=2))
        if energy:
            caffeine_entries.append(CaffeineEntry(caffeine_drink_type_id=energy.id, cups=1))

        # 주의~위험 케이스 (상담 권장 트리거)
        request = SleepGenerateRequest(
            weekday_bedtime="01:30", weekday_wakeup="07:00",
            weekend_bedtime="03:00", weekend_wakeup="09:30",
            brief_survey_q1=3, brief_survey_q2=3, brief_survey_q3=2, brief_survey_q4=3, brief_survey_q5=2,  # 13 위험
            ess_q1=2, ess_q2=3, ess_q3=2, ess_q4=3, ess_q5=3, ess_q6=2, ess_q7=2, ess_q8=1,  # 18 위험
            caffeine_entries=caffeine_entries,
            disturbance_causes=["스트레스·걱정", "스마트폰·화면", "카페인 섭취"],
        )

        # [1/5] generate
        print("\n[1/5] generate_sleep_guide ...")
        resp = await svc.generate_sleep_guide(request, user_id=user_id, db=db)
        print(f"  → detail={resp.detail}, guide_id={resp.guide_id}")
        new_guide_id = resp.guide_id
        after_gen = db.query(SleepGuide).filter(SleepGuide.user_id == user_id).count()
        print(f"  → DB 가이드 수: {before} → {after_gen}")

        # [2/5] list
        print("\n[2/5] list_sleep_guides ...")
        listing = svc.list_sleep_guides(user_id=user_id, db=db)
        print(f"  → total={listing.total}")
        latest = listing.guides[0]
        print(f"  → 최신: guide_id={latest.guide_id}, overall_status={latest.overall_status}, "
              f"sleep_hours_avg={latest.sleep_hours_avg}, is_fallback={latest.is_fallback}")

        # [3/5] get
        print(f"\n[3/5] get_sleep_guide({new_guide_id}) ...")
        guide = svc.get_sleep_guide(new_guide_id, user_id=user_id, db=db)
        print(f"  → overall_status={guide.overall_status} (0정상/1주의/2위험)")
        print(f"  → 분류: 수면시간={guide.sleep_hours_class}, 시차={guide.rhythm_diff_class}, "
              f"단축설문={guide.brief_survey_class}, ESS={guide.ess_class}")
        print(f"  → caffeine_mg_daily={guide.caffeine_mg_daily}, brief_total={guide.brief_survey_total}, ess_score={guide.ess_score}")
        print(f"  → consultation_required={guide.consultation_required}, reasons={guide.consultation_reasons}")
        print(f"  → is_fallback={guide.is_fallback}")
        print(f"  → references={guide.references}")
        print(f"  → key_point: {(guide.key_point or '')[:80]}…")
        print(f"  → today_actions 첫 줄: {(guide.today_actions or '').splitlines()[0] if guide.today_actions else '(없음)'}")
        print(f"  → consultation_recommendation: {(guide.consultation_recommendation or '(null)')[:60]}…")

        # [3.5/5] 본인 검증 — 가짜 user_id
        print("\n[3.5/5] 본인 검증 — 가짜 user_id 로 조회 ...")
        try:
            svc.get_sleep_guide(new_guide_id, user_id=999999, db=db)
            print("  → FAIL: 차단 안 됨!")
        except Exception as e:
            print(f"  → OK: {type(e).__name__}: {getattr(e, 'detail', e)}")

        # [4/5] delete
        print(f"\n[4/5] delete_sleep_guide({new_guide_id}) ...")
        del_resp = svc.delete_sleep_guide(new_guide_id, user_id=user_id, db=db)
        print(f"  → detail={del_resp.detail}")
        after_del = db.query(SleepGuide).filter(SleepGuide.user_id == user_id).count()
        print(f"  → DB 가이드 수: {after_gen} → {after_del}")

        ok = (after_gen == before + 1) and (after_del == before)
        print(f"\n검증 {'통과 ✅ (5/5)' if ok else 'FAIL ❌'}")
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
