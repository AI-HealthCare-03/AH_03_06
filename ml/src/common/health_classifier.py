"""공통 건강 지표 분류(혈압·혈당·지질·BMI·허리둘레)."""

from __future__ import annotations

from typing import Literal

Grade = Literal["정상", "주의", "위험"]


def classify_systolic_bp(mmhg: float) -> Grade:
    """수축기 혈압: 정상(<120), 주의(120~139), 위험(>=140)."""
    if mmhg < 120:
        return "정상"
    if mmhg < 140:
        return "주의"
    return "위험"


def classify_diastolic_bp(mmhg: float) -> Grade:
    """이완기 혈압: 정상(<80), 주의(80~89), 위험(>=90)."""
    if mmhg < 80:
        return "정상"
    if mmhg < 90:
        return "주의"
    return "위험"


def classify_fasting_glucose(mg_dl: float) -> Grade:
    """공복혈당: 정상(<100), 주의(100~125), 위험(>=126)."""
    if mg_dl < 100:
        return "정상"
    if mg_dl < 126:
        return "주의"
    return "위험"


def classify_total_cholesterol(mg_dl: float) -> Grade:
    """총콜레스테롤: 정상(<200), 주의(200~239), 위험(>=240)."""
    if mg_dl < 200:
        return "정상"
    if mg_dl < 240:
        return "주의"
    return "위험"


def classify_bmi(bmi: float) -> Grade:
    """BMI: 정상(18.5~22.9), 주의(23~24.9), 위험(>=25).

    18.5 미만 저체중은 임상적으로 별도 관리가 필요하므로 ``주의``로 분류한다.
    """
    if bmi < 18.5:
        return "주의"
    if 18.5 <= bmi <= 22.9:
        return "정상"
    if bmi <= 24.9:
        return "주의"
    return "위험"


def classify_waist_circumference(cm: float, *, sex: str) -> Grade:
    """허리둘레: 남성 90cm 이상, 여성 85cm 이상이면 ``위험``, 그 외 ``정상``.

    Args:
        cm: 허리둘레(cm).
        sex: ``\"M\"``/``\"남\"`` 계열은 남성, 그 외는 여성으로 처리.
    """
    male = sex.upper().startswith("M") or sex in ("남", "남성", "male", "Male")
    threshold = 90.0 if male else 85.0
    if cm >= threshold:
        return "위험"
    return "정상"
