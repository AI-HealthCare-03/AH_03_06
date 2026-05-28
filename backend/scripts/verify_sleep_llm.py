# backend/scripts/verify_sleep_llm.py
# 수면 가이드 생성 종합 검증 — sleep_classifier + RAG + LLM 호출 → 7섹션 JSON.
#
# 사용:
#   docker compose exec -T backend python scripts/verify_sleep_llm.py
#
# 비용: OpenAI Chat Completion 호출 3회 (gpt-4o-mini, 각 ~$0.001) + 임베딩 호출 다수 (저렴).

import sys
sys.path.insert(0, '/app')

import asyncio
import time as _time
from datetime import time

from app.services import sleep_classifier as sc
from app.services import sleep_llm_service as llm


def case_normal():
    """정상 케이스: 7.5h, 시차 0.5h, 단축 3점."""
    return sc.classify_all(
        weekday_bedtime=time(23, 30), weekday_wakeup=time(7, 0),
        weekend_bedtime=time(23, 30), weekend_wakeup=time(7, 30),
        brief_q1=0, brief_q2=1, brief_q3=0, brief_q4=1, brief_q5=1,  # total=3
        caffeine_entries=[(150, 1)],  # 커피 1잔 (시드 5종 기준)
    )


def case_caution():
    """주의 케이스: 6.6h, 시차 1.5h, 단축 8점, ESS 12점."""
    return sc.classify_all(
        weekday_bedtime=time(0, 30), weekday_wakeup=time(7, 0),
        weekend_bedtime=time(1, 30), weekend_wakeup=time(8, 30),
        brief_q1=2, brief_q2=2, brief_q3=1, brief_q4=2, brief_q5=1,
        caffeine_entries=[(150, 2), (100, 1)],  # 커피 2 + 에너지 1 = 400mg
        ess_q1=1, ess_q2=2, ess_q3=1, ess_q4=2, ess_q5=2, ess_q6=1, ess_q7=2, ess_q8=1,  # 12
    )


def case_risk():
    """위험 케이스: 5.3h, 시차 2.5h, 단축 13점, ESS 18점, 상담 권장."""
    return sc.classify_all(
        weekday_bedtime=time(2, 0), weekday_wakeup=time(7, 0),
        weekend_bedtime=time(3, 30), weekend_wakeup=time(9, 30),
        brief_q1=3, brief_q2=3, brief_q3=2, brief_q4=3, brief_q5=2,
        caffeine_entries=[(150, 3), (100, 1)],  # 커피 3 + 에너지 1 = 550mg
        ess_q1=2, ess_q2=3, ess_q3=2, ess_q4=3, ess_q5=3, ess_q6=2, ess_q7=2, ess_q8=1,  # 18
    )


USER_INFO_SAMPLE = {
    "age": 30,
    "gender_label": "남",
    "smoking_status": 1,
    "alcohol_status": 1,
    "smoking_status_label": "흡연 (하루 5개비)",
    "alcohol_status_label": "음주 (주 3회·1잔)",
}


CAFFEINE_LABELS = {
    "normal": ["커피 1잔 1잔"],
    "caution": ["커피 1잔 2잔", "에너지 드링크 1캔 1캔"],
    "risk": ["커피 1잔 3잔", "에너지 드링크 1캔 1캔"],
}


DISTURBANCE_CAUSES_SAMPLE = ["스트레스·걱정", "스마트폰·화면", "카페인 섭취"]


def print_response(label: str, sections: dict, sources: set):
    print(f"\n{'=' * 72}")
    print(f"  {label}")
    print('=' * 72)
    print(f"\n[is_fallback] {sections.get('is_fallback')}")
    print(f"[사용된 sources] {len(sources)}건")
    for s in sorted(sources):
        print(f"  - {s}")
    print()
    for key in ["key_point", "today_actions", "weekly_goal", "coping_strategy",
                "lifestyle_adjustment", "consultation_recommendation", "next_checkup_guide"]:
        val = sections.get(key)
        if val is None:
            print(f"▶ {key}\n  (null)\n")
        else:
            print(f"▶ {key}")
            for line in str(val).strip().split("\n"):
                print(f"  {line}")
            print()


async def main():
    cases = [
        ("케이스 A — 정상 (overall=0, 상담 X)", case_normal(), CAFFEINE_LABELS["normal"]),
        ("케이스 B — 주의 (overall=1, 상담 X)", case_caution(), CAFFEINE_LABELS["caution"]),
        ("케이스 C — 위험 (overall=2, 상담 ✅)", case_risk(), CAFFEINE_LABELS["risk"]),
    ]

    timings = []
    for label, classification, caffeine_labels in cases:
        print(f"\n[generating...] {label}")
        t0 = _time.perf_counter()
        sections, sources = await llm.generate_sleep_guide_async(
            classification=classification,
            user_info=USER_INFO_SAMPLE,
            caffeine_entries_label=caffeine_labels,
            disturbance_causes=DISTURBANCE_CAUSES_SAMPLE,
        )
        elapsed = _time.perf_counter() - t0
        timings.append((label, elapsed, sections))
        print_response(label, sections, sources)
        # 본문 길이 측정
        total_chars = sum(len(str(sections.get(k) or "")) for k in
                          ["key_point", "today_actions", "weekly_goal", "coping_strategy",
                           "lifestyle_adjustment", "consultation_recommendation", "next_checkup_guide"])
        print(f"[측정] 응답 시간: {elapsed:.1f}초 | 7섹션 합계: {total_chars}자")

    print("\n=== 응답 시간 요약 (스트리밍 결정용) ===")
    for label, elapsed, _ in timings:
        verdict = "스트리밍 불필요" if elapsed < 5 else ("로딩 표시 권장" if elapsed < 10 else "스트리밍 가치 ↑")
        print(f"  {elapsed:>5.1f}초  {verdict}  | {label}")

    print("\n검증 완료 ✅ — 3 케이스 LLM 응답 받음")


if __name__ == "__main__":
    asyncio.run(main())
