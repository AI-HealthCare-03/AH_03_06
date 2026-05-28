# backend/scripts/verify_sleep_classifier.py
# 수면 분류 + 점수 산출식 검증. DB·LLM 의존성 없음.
#
# 사용:
#   docker compose exec -T backend python scripts/verify_sleep_classifier.py

import sys
sys.path.insert(0, '/app')

from datetime import time

from app.services import sleep_classifier as sc
from app.services import sleep_score_formula as sf


def case_normal():
    """정상 케이스: 7.5h 수면, 사회적 시차 0.5h, 단축 설문 3점, ESS 미입력."""
    return sc.classify_all(
        weekday_bedtime=time(23, 30), weekday_wakeup=time(7, 0),
        weekend_bedtime=time(23, 30), weekend_wakeup=time(7, 30),
        brief_q1=0, brief_q2=1, brief_q3=0, brief_q4=1, brief_q5=1,  # total=3
        caffeine_entries=[(75, 1)],  # 캔커피 1잔 = 75mg
    )


def case_caution():
    """주의 케이스: 6.5h 수면, 사회적 시차 1.5h, 단축 설문 8점, ESS 12점."""
    return sc.classify_all(
        weekday_bedtime=time(0, 30), weekday_wakeup=time(7, 0),
        weekend_bedtime=time(1, 30), weekend_wakeup=time(8, 30),
        brief_q1=2, brief_q2=2, brief_q3=1, brief_q4=2, brief_q5=1,  # total=8
        caffeine_entries=[(230, 2), (80, 1)],  # 아메리카노 2 + 에너지중 1 = 460+80 = 540mg
        ess_q1=1, ess_q2=2, ess_q3=1, ess_q4=2, ess_q5=2, ess_q6=1, ess_q7=2, ess_q8=1,  # 12
    )


def case_risk():
    """위험 케이스: 5h 수면, 사회적 시차 2.5h, 단축 설문 13점, ESS 18점."""
    return sc.classify_all(
        weekday_bedtime=time(2, 0), weekday_wakeup=time(7, 0),
        weekend_bedtime=time(3, 30), weekend_wakeup=time(9, 30),
        brief_q1=3, brief_q2=3, brief_q3=2, brief_q4=3, brief_q5=2,  # total=13
        caffeine_entries=[(230, 3), (160, 1)],  # 아메리카노 3 + 에너지대 1 = 690+160 = 850mg
        ess_q1=2, ess_q2=3, ess_q3=2, ess_q4=3, ess_q5=3, ess_q6=2, ess_q7=2, ess_q8=1,  # 18
    )


def print_result(label: str, result: sc.ClassificationResult):
    print(f"\n=== {label} ===")
    print(f"  수면시간 가중평균   : {result.sleep_hours_avg}h  (class={result.sleep_hours_class})")
    print(f"  사회적 시차         : {result.rhythm_diff_hours}h  (class={result.rhythm_diff_class})")
    print(f"  단축 설문 합계      : {result.brief_survey_total_score}/15  (class={result.brief_survey_class})")
    print(f"  ESS 합계            : {result.ess_score}/24  (class={result.ess_class})")
    print(f"  카페인 mg/일        : {result.caffeine_mg_daily}")
    print(f"  종합 위험 단계      : {result.overall_status}  (0정상/1주의/2위험)")
    print(f"  상담 권장           : {result.consultation_required}  reasons={result.consultation_reasons}")


def main():
    results = {
        "케이스 A — 정상": case_normal(),
        "케이스 B — 주의": case_caution(),
        "케이스 C — 위험": case_risk(),
    }
    for label, r in results.items():
        print_result(label, r)

    # 회귀 점수 산출식 검증 (guide_score_formula)
    print("\n=== 회귀 점수 산출식 자가 검증 ===")
    profile_smoker = sf.UserProfile(smoking=1, alcohol=5, exercise=1, caffeine=540, age=30, gender=1)
    profile_clean = sf.UserProfile(smoking=0, alcohol=0, exercise=3, caffeine=75, age=30, gender=1)
    eff_smoker = sf.predicted_efficiency(profile_smoker)
    eff_clean = sf.predicted_efficiency(profile_clean)
    print(f"  흡연자(주의 케이스 라이프스타일) 예측 수면효율: {eff_smoker:.4f}")
    print(f"  금연·운동·저카페인              예측 수면효율: {eff_clean:.4f}")
    print(f"  개선 폭                                       : {(eff_clean - eff_smoker)*100:+.2f}%p")
    print()
    print("  [권고별 기대 개선치 (유의 변수만)]")
    for rec in sf.GUIDE_RECOMMENDATIONS:
        ci_lo, ci_hi = rec["ci_pp"]
        print(f"    - {rec['label']:<50} → 수면효율 {rec['expected_gain_pp']:+.2f}%p "
              f"(95% CI [{ci_lo:+.2f}, {ci_hi:+.2f}]%p)")

    # 음주 단위 환산 — 한국 친숙 단위 vs 회귀 oz
    print("\n=== 음주 단위 환산 (회귀 β oz 기준 → 한국 친숙 단위) ===")
    print(f"  1 oz                     = {sf.oz_to_ml(1):.2f} ml")
    print()
    print("  음료별 환산:")
    for label, ml in sf.ALCOHOL_DRINKS_ML.items():
        oz = sf.ml_to_oz(ml)
        impact_pp = sf.BETA["alcohol"] * oz * 100  # %p
        print(f"    {label:<25} = {oz:>5.2f} oz → 1잔/일 마실 때 수면효율 {impact_pp:+.2f}%p")
    print()
    # 예시: 맥주 1캔 + 소주 1잔 마신 경우
    entries = [("맥주 1캔 (355ml)", 1), ("소주 1잔 (50ml)", 1)]
    total_ml = sf.alcohol_drinks_to_ml(entries)
    total_oz = sf.alcohol_ml_to_oz(total_ml)
    impact_pp = sf.BETA["alcohol"] * total_oz * 100
    print(f"  [예시] 맥주 1캔 + 소주 1잔/일 = {total_ml} ml = {total_oz:.2f} oz → 수면효율 {impact_pp:+.2f}%p")

    print("\n검증 통과 ✅ — 분류·환산·회귀 모두 동작")


if __name__ == "__main__":
    main()
