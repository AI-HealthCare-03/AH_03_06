"""수면효율 가이드 점수 산출식 (다변량 OLS 부분효과 β 기반).

근거: Sleep Efficiency Dataset (N=359, 19~64세) 다변량 회귀 분석.
모형: sleep_efficiency ~ smoking + caffeine + alcohol + exercise + age + gender
모형 적합도: R² = 0.346, Adj.R² = 0.335, F p < 1e-29
다중공선성: 모든 VIF < 1.23.

부분효과(β)를 가중치로 사용하는 이유:
  단변량 평균 차이는 음주·카페인·운동 등 라이프스타일 교란을 포함한 추정치라
  과대 추정됨. 다변량 통제 후 β 가 변수 자체의 순효과로, 가이드 가중치는
  이 값을 사용해야 정확하다.

[음주 단위 한계]
  원본 데이터셋의 alcohol 변수 단위는 "oz/일" 로 표기되어 있으나, 데이터셋
  메타에 음료 부피 oz vs pure alcohol oz 구분이 없다. 본 모듈은 음료 부피
  (fl oz) 가정 하에 ml 환산을 제공한다 (1 oz = 29.5735 ml).
  정확한 임상 환산은 후속 보완 항목.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Mapping


# 회귀 계수 (다변량 OLS). 단위: 변수 1단위 변화 → sleep_efficiency(0~1) 변화량
INTERCEPT: float = 0.7881

BETA: dict[str, float] = {
    "smoking":  -0.0796,   # 1=흡연자, 0=비흡연자          (p=3.6e-10)
    "alcohol":  -0.0339,   # 음주 oz/일                    (p=1.4e-19)
    "exercise": +0.0202,   # 운동 횟수/주                   (p=1.2e-06)
    "caffeine": +0.0002,   # 카페인 mg/일                   (p=0.26, 유의 X)
    "age":      +0.0010,   # 나이                           (p=0.06, 경계)
    "gender":   -0.0084,   # 1=남성, 0=여성 (drop_first)    (p=0.51, 유의 X)
}

# 95% 신뢰구간 (보고/시각화용)
BETA_CI: dict[str, tuple[float, float]] = {
    "smoking":  (-0.1039, -0.0554),
    "alcohol":  (-0.0409, -0.0270),
    "exercise": (+0.0122, +0.0283),
    "caffeine": (-0.0002, +0.0006),
    "age":      (-0.0000, +0.0020),
    "gender":   (-0.0335, +0.0166),
}

# 통계적으로 유의한(p<0.05) 변수만 가이드 권고에 활용
SIGNIFICANT_VARS: tuple[str, ...] = ("smoking", "alcohol", "exercise")


@dataclass
class UserProfile:
    smoking: int       # 0/1
    alcohol: float     # oz/일
    exercise: float    # 회/주
    caffeine: float    # mg/일
    age: int           # 세
    gender: int        # 0=여성, 1=남성

    def as_dict(self) -> dict[str, float]:
        return {
            "smoking": self.smoking, "alcohol": self.alcohol,
            "exercise": self.exercise, "caffeine": self.caffeine,
            "age": self.age, "gender": self.gender,
        }


def predicted_efficiency(profile: UserProfile | Mapping[str, float]) -> float:
    """다변량 회귀식으로 예측되는 수면효율(0~1).

    score = INTERCEPT + Σ β_i · x_i, 0~1 클리핑.
    """
    x = profile.as_dict() if isinstance(profile, UserProfile) else dict(profile)
    score = INTERCEPT + sum(BETA[k] * x[k] for k in BETA)
    return max(0.0, min(1.0, score))


def expected_improvement(variable: str, delta: float = 1.0) -> float:
    """변수 1단위 변화 시 기대되는 수면효율 변화량 (β · Δx).

    예) 금연(smoking 1→0): expected_improvement('smoking', delta=-1) = +0.0796
        음주 1oz 감소     : expected_improvement('alcohol', delta=-1) = +0.0339
        운동 1회/주 증가  : expected_improvement('exercise', delta=+1) = +0.0202
    """
    if variable not in BETA:
        raise KeyError(f"unknown variable: {variable}")
    return BETA[variable] * delta


# ──────────────────────────── 음주 단위 환산 (한국 친숙 단위) ────────────────────────────
# 회귀 β 는 oz/일 기준이라, 한국 사용자 입력(잔/캔/병/ml)을 oz 로 환산해서 적용.

ML_PER_OZ: float = 29.5735        # 1 fl oz = 29.5735 ml (US 표준)


def ml_to_oz(ml: float) -> float:
    """음료 부피 ml → fl oz."""
    return ml / ML_PER_OZ


def oz_to_ml(oz: float) -> float:
    """fl oz → ml."""
    return oz * ML_PER_OZ


# 한국 일반 음주 음료 표준량 (ml). UI 입력 옵션 + 자동 환산에 사용.
# 알코올 농도는 별도 — 본 환산은 음료 부피 기준 (회귀 β 단위와 정합).
ALCOHOL_DRINKS_ML: dict[str, int] = {
    "소주 1잔 (50ml)":   50,
    "소주 1병 (360ml)":  360,
    "맥주 1잔 (200ml)":  200,
    "맥주 1캔 (355ml)":  355,
    "맥주 1병 (500ml)":  500,
    "와인 1잔 (150ml)":  150,
    "막걸리 1잔 (200ml)": 200,
    "막걸리 1병 (750ml)": 750,
}


def alcohol_drinks_to_ml(entries: list[tuple[str, int]]) -> float:
    """음료 종류·잔수 리스트 → 총 음주량 (ml)."""
    return sum(ALCOHOL_DRINKS_ML[name] * cups for name, cups in entries)


def alcohol_ml_to_oz(ml: float) -> float:
    """음주량 ml → 회귀에 넣을 oz 값."""
    return ml_to_oz(ml)


# 가이드 UI에서 바로 노출 가능한 권고 카드 (유의한 변수만)
GUIDE_RECOMMENDATIONS: list[dict] = [
    {
        "id": "quit_smoking",
        "label": "금연",
        "variable": "smoking",
        "delta": -1,
        "expected_gain_pp": +7.96,
        "ci_pp": (+5.54, +10.39),
        "evidence": "다변량 OLS β = -0.0796 (95% CI [-0.104, -0.055], p=3.6e-10)",
    },
    {
        "id": "reduce_alcohol",
        "label": "음주 줄이기 (맥주 1캔 ≈ 12 oz, 소주 1잔 ≈ 1.7 oz)",
        "variable": "alcohol",
        "delta": -1,                # 단위 oz/일
        "expected_gain_pp": +3.39,  # 1 oz/일 감소 시 (=소주 약 0.6잔)
        "ci_pp": (+2.70, +4.09),
        "evidence": "다변량 OLS β = -0.0339 per oz/day (95% CI [-0.041, -0.027], p=1.4e-19). "
                    "ml 환산 시 1 ml/일 = 약 -0.115%p (음료 부피 가정).",
    },
    {
        "id": "increase_exercise",
        "label": "운동 1회/주 증가",
        "variable": "exercise",
        "delta": +1,
        "expected_gain_pp": +2.02,
        "ci_pp": (+1.22, +2.83),
        "evidence": "다변량 OLS β = +0.0202 (95% CI [+0.012, +0.028], p=1.2e-06)",
    },
]
