"""수면 가이드 수치 분류 + 파생 변수 계산.

순수 함수 모듈. DB·LLM 의존성 없음. SleepGuide 의 분석/분류 컬럼들 채우는 데 사용.

분류 cut-off 출처:
  - NSF (Hirshkowitz 2015): 수면시간
  - Wittmann 2006 / Roenneberg 2012: 사회적 시차
  - PSQI-K 기반 자체 단축형: 단축 설문 5문항 합계 (서비스 운영용 분류)
  - Johns 1991: ESS 졸림 척도
"""
from __future__ import annotations
from dataclasses import dataclass
from datetime import time
from typing import Iterable, Optional


# 분류 코드 (ERD: 0=정상, 1=주의, 2=위험)
CLASS_NORMAL = 0
CLASS_CAUTION = 1
CLASS_RISK = 2


# ─────────────────── 시각 → 시간 파생 ───────────────────

def time_to_hours_diff(bedtime: time, wakeup: time) -> float:
    """취침 시각 → 기상 시각의 경과 시간 (자정 넘김 처리, 시간 단위).

    예) 23:00 → 07:00 → 8.0
        01:30 → 09:00 → 7.5
    """
    bed_min = bedtime.hour * 60 + bedtime.minute
    wake_min = wakeup.hour * 60 + wakeup.minute
    diff_min = (wake_min - bed_min) % (24 * 60)
    return diff_min / 60.0


def sleep_hours_weighted_avg(weekday_hours: float, weekend_hours: float) -> float:
    """가중평균 수면시간 (주중×5 + 주말×2) / 7 — ERD SleepGuide.sleep_hours_avg 산식."""
    return (weekday_hours * 5 + weekend_hours * 2) / 7


def rhythm_diff_hours_from_wakeup(weekday_wakeup: time, weekend_wakeup: time) -> float:
    """주중·주말 기상 시각 차이 (절댓값, 시간) — 사회적 시차 근사.

    ERD SleepGuide.rhythm_diff_hours 컬럼 산식 ("주중·주말 기상 시각 차") 를 따름.
    학술 정확 정의(midpoint of sleep 차이)는 향후 확장 항목.
    """
    wd_min = weekday_wakeup.hour * 60 + weekday_wakeup.minute
    we_min = weekend_wakeup.hour * 60 + weekend_wakeup.minute
    return abs(we_min - wd_min) / 60.0


# ─────────────────── 단축 설문 / ESS 합계 ───────────────────

def brief_survey_total(q1: int, q2: int, q3: int, q4: int, q5: int) -> int:
    """단축 수면 설문 5문항 합계 (0~15)."""
    return q1 + q2 + q3 + q4 + q5


def ess_total(q1: Optional[int], q2: Optional[int], q3: Optional[int],
              q4: Optional[int], q5: Optional[int], q6: Optional[int],
              q7: Optional[int], q8: Optional[int]) -> Optional[int]:
    """ESS 8문항 합계 (0~24). 한 항목이라도 NULL이면 None 반환 (전부 입력 or 전부 미입력 규칙)."""
    values = (q1, q2, q3, q4, q5, q6, q7, q8)
    if any(v is None for v in values):
        return None
    return sum(values)  # type: ignore[arg-type]


# ─────────────────── 카페인 mg 환산 ───────────────────

def caffeine_mg_total(entries: Iterable) -> int:
    """카페인 음료 잔수 × 1잔당 mg 합산.

    entries: SleepSurveyCaffeine row 리스트 또는 (mg_per_cup, cups) tuple 리스트.
             ORM row 의 경우 .drink_type.caffeine_mg_per_cup 와 .cups 속성 사용.
    """
    total = 0
    for e in entries:
        if hasattr(e, "drink_type") and hasattr(e, "cups"):
            total += e.drink_type.caffeine_mg_per_cup * e.cups
        elif isinstance(e, tuple) and len(e) == 2:
            mg_per_cup, cups = e
            total += mg_per_cup * cups
        elif isinstance(e, dict):
            total += e["caffeine_mg_per_cup"] * e["cups"]
        else:
            raise TypeError(f"unsupported caffeine entry: {e!r}")
    return total


# ─────────────────── 분류 ───────────────────

def classify_sleep_hours(hours: float) -> int:
    """수면시간 분류 (NSF 성인 18~64세 기준).

    정상: 7~9   /  주의: 6~7 또는 9~10   /  위험: <6 또는 >10
    """
    if 7.0 <= hours <= 9.0:
        return CLASS_NORMAL
    if (6.0 <= hours < 7.0) or (9.0 < hours <= 10.0):
        return CLASS_CAUTION
    return CLASS_RISK


def classify_rhythm_diff(diff_hours: float) -> int:
    """사회적 시차 분류 (Wittmann 2006).

    정상: <1h  /  주의: 1~2h  /  위험: >2h
    """
    if diff_hours < 1.0:
        return CLASS_NORMAL
    if diff_hours <= 2.0:
        return CLASS_CAUTION
    return CLASS_RISK


def classify_brief_survey(total: int) -> int:
    """단축 설문 합계 분류 (PSQI-K 기반 자체 단축형, 0~15).

    정상: 0~5  /  주의: 6~10  /  위험: 11~15
    """
    if total <= 5:
        return CLASS_NORMAL
    if total <= 10:
        return CLASS_CAUTION
    return CLASS_RISK


def classify_ess(score: Optional[int]) -> Optional[int]:
    """ESS 졸림 척도 분류 (Johns 1991, 0~24). 미입력 시 None."""
    if score is None:
        return None
    if score <= 10:
        return CLASS_NORMAL
    if score <= 15:
        return CLASS_CAUTION
    return CLASS_RISK


def overall_status(
    sleep_hours_class: int,
    rhythm_diff_class: int,
    brief_survey_class: int,
    ess_class: Optional[int],
) -> int:
    """4개 항목 분류 중 최고값 — ERD overall_status (FR-803-1)."""
    classes = [sleep_hours_class, rhythm_diff_class, brief_survey_class]
    if ess_class is not None:
        classes.append(ess_class)
    return max(classes)


# ─────────────────── 통합 결과 ───────────────────

@dataclass
class ClassificationResult:
    """수면 가이드 분류 + 파생 변수 통합 결과. SleepGuide 컬럼과 1:1 매핑."""
    sleep_hours_avg: float
    rhythm_diff_hours: float
    caffeine_mg_daily: int
    brief_survey_total_score: int
    ess_score: Optional[int]
    sleep_hours_class: int
    rhythm_diff_class: int
    brief_survey_class: int
    ess_class: Optional[int]
    overall_status: int
    consultation_required: bool
    consultation_reasons: list[str]


def _consultation_assessment(
    brief_survey_total_score: int,
    ess_score: Optional[int],
) -> tuple[bool, list[str]]:
    """상담 권장 판단 (FR-805).

    조건:
      - 단축 설문 11~15 (위험) → insomnia_suspected
      - ESS 16+ → ess_high
    하나라도 충족 시 consultation_required=True.
    """
    reasons: list[str] = []
    if brief_survey_total_score >= 11:
        reasons.append("insomnia_suspected")
    if ess_score is not None and ess_score >= 16:
        reasons.append("ess_high")
    return (len(reasons) > 0, reasons)


def classify_all(
    *,
    weekday_bedtime: time,
    weekday_wakeup: time,
    weekend_bedtime: time,
    weekend_wakeup: time,
    brief_q1: int, brief_q2: int, brief_q3: int, brief_q4: int, brief_q5: int,
    caffeine_entries: Iterable = (),
    ess_q1: Optional[int] = None, ess_q2: Optional[int] = None,
    ess_q3: Optional[int] = None, ess_q4: Optional[int] = None,
    ess_q5: Optional[int] = None, ess_q6: Optional[int] = None,
    ess_q7: Optional[int] = None, ess_q8: Optional[int] = None,
) -> ClassificationResult:
    """SLEEP_SURVEY_RESPONSE 입력값 → SLEEP_GUIDE 분류·파생 컬럼 일괄 산출."""
    weekday_hours = time_to_hours_diff(weekday_bedtime, weekday_wakeup)
    weekend_hours = time_to_hours_diff(weekend_bedtime, weekend_wakeup)
    hours_avg = sleep_hours_weighted_avg(weekday_hours, weekend_hours)
    rhythm_diff = rhythm_diff_hours_from_wakeup(weekday_wakeup, weekend_wakeup)

    bs_total = brief_survey_total(brief_q1, brief_q2, brief_q3, brief_q4, brief_q5)
    ess_score = ess_total(ess_q1, ess_q2, ess_q3, ess_q4, ess_q5, ess_q6, ess_q7, ess_q8)
    caffeine_mg = caffeine_mg_total(caffeine_entries)

    sh_class = classify_sleep_hours(hours_avg)
    rd_class = classify_rhythm_diff(rhythm_diff)
    bs_class = classify_brief_survey(bs_total)
    ess_class = classify_ess(ess_score)
    overall = overall_status(sh_class, rd_class, bs_class, ess_class)

    consultation_required, reasons = _consultation_assessment(bs_total, ess_score)

    return ClassificationResult(
        sleep_hours_avg=round(hours_avg, 1),
        rhythm_diff_hours=round(rhythm_diff, 1),
        caffeine_mg_daily=caffeine_mg,
        brief_survey_total_score=bs_total,
        ess_score=ess_score,
        sleep_hours_class=sh_class,
        rhythm_diff_class=rd_class,
        brief_survey_class=bs_class,
        ess_class=ess_class,
        overall_status=overall,
        consultation_required=consultation_required,
        consultation_reasons=reasons,
    )
