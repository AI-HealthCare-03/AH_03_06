"""공통 전처리 스켈레톤."""


def normalize_numeric_frame(df, columns: list[str], method: str = "zscore"):
    """수치 컬럼을 스케일링한다.

    Args:
        df: 입력 테이블.
        columns: 변환할 컬럼명.
        method: ``zscore`` 또는 ``minmax`` 등.

    Returns:
        변환된 데이터프레임.
    """
    pass


def encode_categorical(df, columns: list[str]) -> tuple:
    """범주형 인코딩.

    Args:
        df: 입력 테이블.
        columns: 인코딩할 컬럼.

    Returns:
        (변환된 프레임, 인코더 또는 매핑).
    """
    pass
