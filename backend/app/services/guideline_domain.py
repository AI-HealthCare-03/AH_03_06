# 약품 ATC 코드 → 학회 진료지침(guideline_rag) 도메인 매핑.
# guideline_rag 는 4개 만성질환 학회 지침만 보유(당뇨·심부전·이상지질혈증·고혈압).
# ATC 치료군이 이 중 하나에 해당할 때만 그 도메인 지침을 출처로 부착하고,
# 무관한 약(예: 진통제 N02)은 빈 목록 → guideline 미부착.
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.drug_info import DrugInfo

_DIABETES = "diabetes_2025_KDA"
_HEART_FAILURE = "heartfailure_2022_KSHF"
_DYSLIPIDEMIA = "dyslipidemia_2022_KSoLA"
_HYPERTENSION = "hypertension_2022_KSH"


def atc_to_domains(atc_code: str | None) -> list[str]:
    """ATC 코드 → guideline_id 목록. 매칭 도메인 없으면 빈 목록.

    심부전(KSHF)에는 일단 C01 만 연결한다. 심부전 약은 고혈압 약과
    크게 겹쳐, 양쪽에 다 넣으면 출처가 충돌하기 때문. C03/C07/C09 확장은 추후 결정.
    """
    if not atc_code:
        return []
    a = atc_code.strip().upper()
    if a.startswith("A10"):
        return [_DIABETES]
    if a.startswith("C10"):
        return [_DYSLIPIDEMIA]
    if a.startswith("C01"):
        return [_HEART_FAILURE]
    if a[:3] in {"C02", "C03", "C07", "C08", "C09"}:
        return [_HYPERTENSION]
    return []


def domains_for_item_seq(item_seq: str | None, db: Session | None = None) -> list[str]:
    """item_seq(=drug_code)로 drug_info.atc_code 조회 후 도메인 매핑.

    약을 특정 못 하면(빈 item_seq·미존재·atc 없음) 빈 목록 → guideline 미부착(안전 기본값).
    db 미지정 시 자체 읽기 전용 세션을 열고 닫는다.
    """
    seq = str(item_seq or "").strip()
    if not seq:
        return []
    own = db is None
    if own:
        db = SessionLocal()
    try:
        atc = db.query(DrugInfo.atc_code).filter(DrugInfo.drug_code == seq).scalar()
    finally:
        if own:
            db.close()
    return atc_to_domains(atc)
