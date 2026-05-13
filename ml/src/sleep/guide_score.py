"""수면효율 예측 점수(회귀 가중치) 및 기대 개선치."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class GuideScoreResult:
    """클리핑된 점수와 라이프스타일별 한 단위 변화에 대한 기대 개선치."""

    score: float
    delta_if_quit_smoking: float
    delta_per_alcohol_oz_reduction: float
    delta_per_exercise_session: float


def predict_sleep_efficiency_score(
    smoking: float,
    alcohol_oz: float,
    exercise_per_week: float,
) -> GuideScoreResult:
    """다변량 선형식으로 수면효율 지표를 근사한다.

    산출식:
        score = 0.7881
              + (smoking × -0.0796)
              + (alcohol_oz × -0.0339)
              + (exercise_per_week × 0.0202)

    ``smoking``은 0~1 이진 또는 연속(강도) 표현을 가정하고, 결과 점수는 0~1로 클리핑한다.
    계수의 절댓값을 이용해 라이프스타일별 기대 개선치(점수 단위)를 함께 반환한다.

    Args:
        smoking: 흡연 지표(0=비흡연 등 스케일에 맞게 정의).
        alcohol_oz: 주당 알코올 온스(또는 동일 스케일의 음주량).
        exercise_per_week: 주당 운동 횟수·분 단위 등 파이프라인에서 정의한 값.

    Returns:
        클리핑된 점수와 해석용 한계 효과 요약.
    """
    raw = (
        0.7881
        + (smoking * -0.0796)
        + (alcohol_oz * -0.0339)
        + (exercise_per_week * 0.0202)
    )
    score = max(0.0, min(1.0, float(raw)))

    return GuideScoreResult(
        score=score,
        delta_if_quit_smoking=0.0796,
        delta_per_alcohol_oz_reduction=0.0339,
        delta_per_exercise_session=0.0202,
    )
