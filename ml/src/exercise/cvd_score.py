"""CVD(심혈관) 위험 점수 산출."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CVDScoreResult:
    """CVD 점수와 위험도 판정."""

    score: float
    risk_band: str


def compute_cvd_score(
    systolic_bp: float,
    fasting_glucose: float,
    total_cholesterol: float,
    age: float,
) -> CVDScoreResult:
    """진료 수치 기반 CVD 점수를 계산한다.

    공식:
        CVD_score = (수축기혈압/200 × 0.30)
                  + (공복혈당/300 × 0.25)
                  + (총콜레스테롤/300 × 0.20)
                  + (나이/80 × 0.25)

    점수는 0~1로 클리핑하고, 위험도 구간을 함께 반환한다.

    Args:
        systolic_bp: 수축기 혈압 (mmHg).
        fasting_glucose: 공복 혈당 (mg/dL).
        total_cholesterol: 총콜레스테롤 (mg/dL).
        age: 만 나이.

    Returns:
        클리핑된 점수와 ``저위험``/``중위험``/``고위험``/``매우고위험`` 중 하나.
    """
    raw = (
        (systolic_bp / 200.0) * 0.30
        + (fasting_glucose / 300.0) * 0.25
        + (total_cholesterol / 300.0) * 0.20
        + (age / 80.0) * 0.25
    )
    score = max(0.0, min(1.0, float(raw)))

    if score < 0.35:
        band = "저위험"
    elif score < 0.55:
        band = "중위험"
    elif score < 0.75:
        band = "고위험"
    else:
        band = "매우고위험"

    return CVDScoreResult(score=score, risk_band=band)
