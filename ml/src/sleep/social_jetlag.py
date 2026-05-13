"""사회적 시차(Social Jetlag, Wittmann et al. 2006 스타일 정의)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import time
from typing import Literal

JetlagGrade = Literal["정상", "주의", "위험"]


@dataclass(frozen=True)
class SocialJetlagResult:
    """주중·주말 수면 미드포인트와 사회적 시차(시간)."""

    midsleep_weekday_hours: float
    midsleep_weekend_hours: float
    social_jetlag_hours_signed: float
    social_jetlag_hours_abs: float
    grade: JetlagGrade


def _to_decimal_hours(t: time) -> float:
    return t.hour + t.minute / 60.0 + t.second / 3600.0


def compute_sleep_midsleep_hours(bedtime: time, waketime: time) -> float:
    """취침·기상 시각으로 수면 중간 시각(미드포인트)을 시 단위(0~24 루프)로 계산한다.

    자정을 넘는 수면은 기상에 24h를 더해 연속 시간축에서 중점을 구한 뒤, 0~24 범위로 환원한다.

    Args:
        bedtime: 취침 시각(당일 기준).
        waketime: 기상 시각(익일 기준이면 당일 시각으로 표기).

    Returns:
        수면 중간 시각을 0~24로 표현한 값(예: 새벽 3시 ≈ 3.0).
    """
    bed = _to_decimal_hours(bedtime)
    wake = _to_decimal_hours(waketime)
    if wake <= bed:
        wake += 24.0
    mid = (bed + wake) / 2.0
    if mid >= 24.0:
        mid -= 24.0
    return float(mid)


def circular_time_difference_hours(a: float, b: float) -> float:
    """24시간 루프에서 두 시각(시 단위)의 최소 호 길이를 이용한 차이(절댓값, 시간)."""
    d = (a - b) % 24.0
    if d > 12.0:
        d = 24.0 - d
    return float(d)


def circular_time_difference_signed_hours(
    reference_later: float, reference_earlier: float
) -> float:
    """Wittmann 스타일 MSF - MSW 부호를 보존한 시차(시간, -12~12로 정규화).

    ``reference_later`` 쪽이 더 늦은 시각(예: 주말 미드포인트)일 때 양수가 되도록 정의한다.
    """
    d = (reference_later - reference_earlier + 12.0) % 24.0 - 12.0
    return float(d)


def classify_jetlag_magnitude_hours(abs_hours: float) -> JetlagGrade:
    """사회적 시차 크기(|시간|)를 정상/주의/위험으로 분류한다.

    - 정상: 1시간 미만
    - 주의: 1~2시간
    - 위험: 2시간 초과
    """
    if abs_hours < 1.0:
        return "정상"
    if abs_hours <= 2.0:
        return "주의"
    return "위험"


def compute_social_jetlag(
    weekday_bedtime: time,
    weekday_waketime: time,
    weekend_bedtime: time,
    weekend_waketime: time,
) -> SocialJetlagResult:
    """주중·주말 수면 미드포인트 차이로 사회적 시차를 산출한다.

    원형 차이(circular difference)로 시차의 크기를 구하고, 부호 있는 시차는
    주말 미드포인트 − 주중 미드포인트로 정의한다.

    Args:
        weekday_bedtime: 주중 취침.
        weekday_waketime: 주중 기상.
        weekend_bedtime: 주말 취침.
        weekend_waketime: 주말 기상.

    Returns:
        미드포인트, 시차(부호/절댓값), 등급.
    """
    ms_wd = compute_sleep_midsleep_hours(weekday_bedtime, weekday_waketime)
    ms_we = compute_sleep_midsleep_hours(weekend_bedtime, weekend_waketime)
    signed = circular_time_difference_signed_hours(ms_we, ms_wd)
    abs_hours = abs(signed)
    grade = classify_jetlag_magnitude_hours(abs_hours)

    return SocialJetlagResult(
        midsleep_weekday_hours=ms_wd,
        midsleep_weekend_hours=ms_we,
        social_jetlag_hours_signed=signed,
        social_jetlag_hours_abs=abs_hours,
        grade=grade,
    )
