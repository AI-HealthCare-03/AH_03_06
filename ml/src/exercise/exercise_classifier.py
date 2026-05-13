"""운동 유형·강도 분류 스켈레톤."""


def classify_exercise_type(signal_features: dict) -> str:
    """센서 또는 설문 피처로 운동 유형을 분류한다.

    Args:
        signal_features: 입력 피처.

    Returns:
        운동 유형 라벨.
    """
    pass


def predict_intensity_zone(features: dict) -> str:
    """운동 강도 구간을 예측한다.

    Args:
        features: HR, RPE 등 피처.

    Returns:
        강도 구간 문자열.
    """
    pass
