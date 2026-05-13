"""운동 강도 조정: CVD·체형·대사증후군·기저질환·습관을 반영."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

IntensityLevel = Literal["저강도", "중강도", "고강도"]
ExerciseHabit = Literal["거의안함", "가끔", "규칙적"]


@dataclass(frozen=True)
class IntensityAdjustment:
    """조정된 권장 운동 강도와 근거 요약."""

    intensity: IntensityLevel
    cvd_score: float
    intensity_cap: IntensityLevel
    bmi_waist_grade: int
    metabolic_syndrome_count: int
    forced_low: bool
    habit: ExerciseHabit


def _grade_to_cap(grade: int) -> IntensityLevel:
    """BMI+허리둘레 등급(0~3)에 따른 상한."""
    if grade <= 0:
        return "고강도"
    if grade == 1:
        return "중강도"
    if grade == 2:
        return "중강도"
    return "저강도"


def _metabolic_adjustment(count: int) -> int:
    """대사증후군 항목 수(0~1 / 2 / 3+)에 따른 강도 하향 단계."""
    if count <= 1:
        return 0
    if count == 2:
        return 1
    return 2


def _lower_intensity(level: IntensityLevel, steps: int) -> IntensityLevel:
    order: list[IntensityLevel] = ["저강도", "중강도", "고강도"]
    idx = order.index(level)
    idx = max(0, idx - steps)
    return order[idx]


def _cvd_cap(cvd_score: float) -> IntensityLevel:
    """CVD 점수(0~1) 기반 권장 상한."""
    if cvd_score < 0.35:
        return "고강도"
    if cvd_score < 0.55:
        return "중강도"
    if cvd_score < 0.75:
        return "저강도"
    return "저강도"


def _habit_delta(habit: ExerciseHabit) -> int:
    """운동 습관에 따른 강도 보정(단계). 거의안함은 보수적으로 하향."""
    if habit == "거의안함":
        return 1
    if habit == "가끔":
        return 0
    return 0


def adjust_exercise_intensity(
    cvd_score: float,
    bmi_waist_grade: int,
    metabolic_syndrome_count: int,
    has_cardiovascular_comorbidity: bool,
    has_cerebrovascular_comorbidity: bool,
    has_peripheral_vascular_comorbidity: bool,
    exercise_habit: ExerciseHabit,
) -> IntensityAdjustment:
    """여러 임상·행동 요인을 반영해 운동 강도를 결정한다.

    규칙 요약:
        - CVD 점수로 기본 상한을 설정한다.
        - BMI+허리둘레 등급(0~3)으로 상한을 조정한다.
        - 대사증후군 항목 수(0~1 / 2 / 3+)에 따라 추가로 보수적으로 하향한다.
        - 심혈관/뇌혈관/말초혈관 기저질환이 하나라도 있으면 저강도로 고정한다.
        - 운동 습관(거의안함/가끔/규칙적)으로 미세 보정한다.

    Args:
        cvd_score: 0~1 클리핑된 CVD 점수.
        bmi_waist_grade: BMI·허리둘레 통합 등급 0(양호)~3(고위험).
        metabolic_syndrome_count: 대사증후군 구성 요소 개수.
        has_cardiovascular_comorbidity: 심혈관 질환 여부.
        has_cerebrovascular_comorbidity: 뇌혈관 질환 여부.
        has_peripheral_vascular_comorbidity: 말초혈관 질환 여부.
        exercise_habit: 자가 보고 운동 빈도 범주.

    Returns:
        최종 권장 강도와 중간 판단값.
    """
    forced = (
        has_cardiovascular_comorbidity
        or has_cerebrovascular_comorbidity
        or has_peripheral_vascular_comorbidity
    )
    if forced:
        return IntensityAdjustment(
            intensity="저강도",
            cvd_score=float(cvd_score),
            intensity_cap="저강도",
            bmi_waist_grade=int(bmi_waist_grade),
            metabolic_syndrome_count=int(metabolic_syndrome_count),
            forced_low=True,
            habit=exercise_habit,
        )

    cap_cvd = _cvd_cap(float(cvd_score))
    cap_bw = _grade_to_cap(int(max(0, min(3, bmi_waist_grade))))

    order: dict[IntensityLevel, int] = {"저강도": 0, "중강도": 1, "고강도": 2}
    cap_idx = min(order[cap_cvd], order[cap_bw])
    cap_level: IntensityLevel = ["저강도", "중강도", "고강도"][cap_idx]

    meta_steps = _metabolic_adjustment(int(max(0, metabolic_syndrome_count)))
    candidate = _lower_intensity(cap_level, meta_steps)
    candidate = _lower_intensity(candidate, _habit_delta(exercise_habit))

    return IntensityAdjustment(
        intensity=candidate,
        cvd_score=float(cvd_score),
        intensity_cap=cap_level,
        bmi_waist_grade=int(bmi_waist_grade),
        metabolic_syndrome_count=int(metabolic_syndrome_count),
        forced_low=False,
        habit=exercise_habit,
    )
