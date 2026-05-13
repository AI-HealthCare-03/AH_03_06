"""수면 상태 통합 분류(시간·사회적 시차·설문·ESS)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

Grade = Literal["정상", "주의", "위험"]
OverallGrade = Literal["정상", "주의", "위험"]


@dataclass(frozen=True)
class SleepComponentGrades:
    duration: Grade
    social_jetlag: Grade
    short_survey: Grade
    ess: Grade


@dataclass(frozen=True)
class SleepClassificationResult:
    """항목별 등급과 통합 판정."""

    components: SleepComponentGrades
    overall: OverallGrade


def classify_sleep_duration_hours(hours: float) -> Grade:
    """수면 시간(시간) 등급.

    - 정상: 7~9시간(끝값 포함)
    - 주의: 6~7시간(7 미만) 또는 9시간 초과~10시간 이하
    - 위험: 6시간 미만 또는 10시간 초과
    """
    if 7.0 <= hours <= 9.0:
        return "정상"
    if (6.0 <= hours < 7.0) or (9.0 < hours <= 10.0):
        return "주의"
    return "위험"


def classify_social_jetlag_grade(abs_hours: float) -> Grade:
    """사회적 시차(절댓값, 시간) 등급."""
    if abs_hours < 1.0:
        return "정상"
    if abs_hours <= 2.0:
        return "주의"
    return "위험"


def classify_short_survey_total(score_sum: int) -> Grade:
    """단축 설문 합계 점수 등급."""
    if 0 <= score_sum <= 5:
        return "정상"
    if 6 <= score_sum <= 10:
        return "주의"
    return "위험"


def classify_ess(score: int) -> Grade:
    """ESS(Epworth Sleepiness Scale) 등급."""
    if 0 <= score <= 10:
        return "정상"
    if 11 <= score <= 15:
        return "주의"
    return "위험"


def _count_grade(grades: list[Grade], target: Grade) -> int:
    return sum(1 for g in grades if g == target)


def integrate_sleep_grades(components: SleepComponentGrades) -> OverallGrade:
    """통합 판정 규칙.

    - 위험 항목이 1개 이상이면 통합 ``위험``.
    - 그렇지 않고 주의가 2개 이상이면 통합 ``주의``.
    - 그 외는 ``정상``.
    """
    gs = [
        components.duration,
        components.social_jetlag,
        components.short_survey,
        components.ess,
    ]
    if _count_grade(gs, "위험") >= 1:
        return "위험"
    if _count_grade(gs, "주의") >= 2:
        return "주의"
    return "정상"


def classify_sleep_state(
    sleep_hours: float,
    social_jetlag_abs_hours: float,
    short_survey_total: int,
    ess_score: int,
) -> SleepClassificationResult:
    """수면시간·사회적 시차·단축 설문·ESS를 결합해 최종 수면 상태를 판정한다.

    Args:
        sleep_hours: 주당 또는 평균 수면 시간(파이프라인 정의에 따름).
        social_jetlag_abs_hours: 사회적 시차 절댓값(시간).
        short_survey_total: 단축 설문 점수 합(0~15 가정).
        ess_score: ESS 총점.

    Returns:
        항목별 등급과 통합 등급.
    """
    comps = SleepComponentGrades(
        duration=classify_sleep_duration_hours(sleep_hours),
        social_jetlag=classify_social_jetlag_grade(social_jetlag_abs_hours),
        short_survey=classify_short_survey_total(short_survey_total),
        ess=classify_ess(ess_score),
    )
    return SleepClassificationResult(
        components=comps, overall=integrate_sleep_grades(comps)
    )
