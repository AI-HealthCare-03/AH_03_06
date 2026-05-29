# app/services/dur_service.py
# 복약 안전점검(DUR) — 진료기록 처방 묶음에 대한 안전성 검증.
#
# ml/notebooks/medication/03_dur_safety_check.ipynb 의 safety_check_all 5겹 로직을
# 백엔드로 포팅. 노트북은 pandas pickle 기반이었으나 여기서는 적재된 DB 테이블을 쓴다.
#
# Phase 1 (현재): 동일성분 중복 · 효능군 중복(ATC) · 병용금기(품목 페어) · 회수약.
# Phase 2 (예정): 노인주의(나이+성분코드) · 1일 최대투여량 초과.
#
# 내부 결과 dict 의 카테고리 키는 llm_service.format_safety_alerts 가 소비하는 계약과
# 동일하게 유지한다 (duplicates_ingredient / duplicates_efficacy / elderly_cautions /
# dose_exceeded / recall_warnings + 신규 contraindications).
#
# 데이터 근거 (라이브 RDS 검증):
#   - drug_info.drug_code = DUR item_seq (CAST, 402k 매칭)
#   - 병용금기는 dur_concurrent_product(품목 페어)만 사용
#     (dur_concurrent_ingredient 의 성분코드 체계는 drug_ingredient_map 과 불일치)
#   - 동일성분 중복은 drug_ingredient_map 의 주성분(is_main=1)만 비교
#     (첨가제까지 비교하면 미결정셀룰로오스 등으로 전 약품이 오탐)

import threading
from dataclasses import dataclass

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.drug_info import DrugInfo
from app.models.drug_ingredient_map import DrugIngredientMap
from app.models.dur_concurrent_product import DurConcurrentProduct
from app.models.prescription import Prescription
from app.schemas.safety import SafetyAlert, SafetyCheckResponse
from app.services.drug_matching_service import get_index, match_drug

LEVEL_BLOCK = "BLOCK"
LEVEL_WARN = "WARN"
LEVEL_INFO = "INFO"
_LEVEL_ORDER = {LEVEL_BLOCK: 0, LEVEL_WARN: 1, LEVEL_INFO: 2}

# ATC 코드 앞 5자리(화학적 소분류)로 효능군 "중복" 그룹핑.
# 식약처 "분류명" 컬럼이 DB에 없어 ATC 로 대체.
# 5자리를 쓰는 이유: 4자리(약리학적 소분류, 예 A10B 혈당강하제)는 너무 거칠어,
# 기전이 다른 표준 병용요법(글리메피리드 A10BB + 시타글립틴 A10BH)까지 "중복"으로
# 오경고한다. 5자리(A10BB=설포닐우레아 / A10BH=DPP-4)는 같은 화학계열 중복만 잡아
# 진짜 치료적 중복(예: 설포닐우레아 2종)을 검출하면서 상보적 병용은 통과시킨다.
_ATC_CLASS_PREFIX_LEN = 5

# 약명→item_seq 폴백 매칭 채택 임계 (오매칭이 미검출보다 위험).
_MATCH_CONFIDENCE_MIN = 90

DISCLAIMER = (
    "본 안전점검은 식약처 DUR 등 공개 데이터에 기반한 참고 정보이며, 의학적 진단·처방을 "
    "대체하지 않습니다. 실제 복약은 반드시 의사·약사와 상담하시기 바랍니다."
)


# ── 마스터 (프로세스 1회 빌드 후 캐시) ──────────────────────────────


@dataclass(frozen=True)
class _DrugFacts:
    drug_id: int
    item_seq: int | None       # drug_info.drug_code (DUR 품목 페어 조회용)
    atc: str | None
    main_ingredients: frozenset[str]


@dataclass(frozen=True)
class _Masters:
    by_drug_id: dict[int, _DrugFacts]
    item_seq_to_drug_id: dict[int, int]
    recalled_drug_ids: frozenset[int]


_MASTERS: _Masters | None = None
_LOCK = threading.Lock()


def _build_masters(db: Session) -> _Masters:
    # 주성분(is_main=1)만: drug_id → {성분코드}
    main_ingredients: dict[int, set[str]] = {}
    for drug_id, code in (
        db.query(DrugIngredientMap.drug_id, DrugIngredientMap.ingredient_code)
        .filter(DrugIngredientMap.is_main.is_(True))
        .all()
    ):
        if code:
            main_ingredients.setdefault(drug_id, set()).add(code)

    by_drug_id: dict[int, _DrugFacts] = {}
    item_seq_to_drug_id: dict[int, int] = {}
    recalled: set[int] = set()
    for drug_id, drug_code, atc, is_recalled in db.query(
        DrugInfo.drug_id, DrugInfo.drug_code, DrugInfo.atc_code, DrugInfo.is_recalled
    ).all():
        item_seq = int(drug_code) if drug_code and str(drug_code).isdigit() else None
        by_drug_id[drug_id] = _DrugFacts(
            drug_id=drug_id,
            item_seq=item_seq,
            atc=atc or None,
            main_ingredients=frozenset(main_ingredients.get(drug_id, ())),
        )
        if item_seq is not None:
            item_seq_to_drug_id[item_seq] = drug_id
        if is_recalled:
            recalled.add(drug_id)

    return _Masters(
        by_drug_id=by_drug_id,
        item_seq_to_drug_id=item_seq_to_drug_id,
        recalled_drug_ids=frozenset(recalled),
    )


def _get_masters(db: Session) -> _Masters:
    global _MASTERS
    if _MASTERS is None:
        with _LOCK:
            if _MASTERS is None:
                _MASTERS = _build_masters(db)
    return _MASTERS


def reset_masters_cache() -> None:
    """약품 데이터 갱신 후 캐시 무효화용 (테스트/관리)."""
    global _MASTERS
    with _LOCK:
        _MASTERS = None


# ── 처방 → 검증 입력 변환 ───────────────────────────────────────────


@dataclass
class _ResolvedDrug:
    name: str                  # 표시용 (처방에 적힌 약명)
    facts: _DrugFacts


def _resolve_prescriptions(
    prescriptions: list[Prescription], masters: _Masters, db: Session
) -> tuple[list[_ResolvedDrug], list[str]]:
    """처방 → (해석된 약 리스트, skip 사유). drug_id 있으면 직접, 없으면 약명 fuzzy(conf≥90)."""
    resolved: list[_ResolvedDrug] = []
    skipped: list[str] = []
    index = None
    for p in prescriptions:
        drug_id = p.drug_id
        if drug_id is None:
            if index is None:
                index = get_index(db)
            m = match_drug(p.drug_name, index)
            best = m.get("best_match")
            if best and m.get("confidence", 0) >= _MATCH_CONFIDENCE_MIN:
                code = best.get("drug_code")
                item_seq = int(code) if code and str(code).isdigit() else None
                drug_id = masters.item_seq_to_drug_id.get(item_seq) if item_seq else None
            if drug_id is None:
                skipped.append(f"{p.drug_name}: 약품 매칭 실패 (안전점검 제외)")
                continue
        facts = masters.by_drug_id.get(drug_id)
        if facts is None:
            skipped.append(f"{p.drug_name}: 약품정보 없음 (안전점검 제외)")
            continue
        resolved.append(_ResolvedDrug(name=p.drug_name, facts=facts))
    return resolved, skipped


# ── 검증 (Phase 1) ──────────────────────────────────────────────────


def _check_concurrent_ingredient(drugs: list[_ResolvedDrug]) -> list[dict]:
    """동일성분(주성분) 중복 — 두 약이 같은 주성분을 공유하면 BLOCK."""
    alerts = []
    for i, a in enumerate(drugs):
        for b in drugs[i + 1:]:
            overlap = a.facts.main_ingredients & b.facts.main_ingredients
            if overlap:
                alerts.append({
                    "level": LEVEL_BLOCK,
                    "type": "concurrent_ingredient",
                    "drugs": [a.name, b.name],
                    "message": f"동일 성분 중복: {a.name}와 {b.name}가 같은 주성분을 포함합니다.",
                    "detail": None,
                })
    return alerts


def _check_class_duplication(drugs: list[_ResolvedDrug]) -> list[dict]:
    """효능군 중복 — 같은 ATC 상위분류(앞 4자리)를 공유하는 약이 2개 이상이면 WARN."""
    by_class: dict[str, list[str]] = {}
    for d in drugs:
        atc = d.facts.atc
        if atc and len(atc) >= _ATC_CLASS_PREFIX_LEN:
            by_class.setdefault(atc[:_ATC_CLASS_PREFIX_LEN], []).append(d.name)
    alerts = []
    for cls, names in by_class.items():
        if len(names) >= 2:
            alerts.append({
                "level": LEVEL_WARN,
                "type": "class_duplicate",
                "drugs": names,
                "message": f"효능군 중복: {', '.join(names)}가 유사 계열({cls}) 약물입니다. 중복 복용 여부를 확인하세요.",
                "detail": f"ATC {cls}",
            })
    return alerts


def _check_contraindication(drugs: list[_ResolvedDrug], db: Session) -> list[dict]:
    """병용금기 — 처방 품목들 간 dur_concurrent_product 페어가 있으면 BLOCK.

    처방 item_seq 집합으로 단일 IN 쿼리 후, 메모리에서 페어 매칭(양방향 dedupe).
    """
    seq_to_name = {d.facts.item_seq: d.name for d in drugs if d.facts.item_seq is not None}
    item_seqs = list(seq_to_name.keys())
    if len(item_seqs) < 2:
        return []

    rows = (
        db.query(DurConcurrentProduct)
        .filter(
            DurConcurrentProduct.item_seq_a.in_(item_seqs),
            DurConcurrentProduct.item_seq_b.in_(item_seqs),
        )
        .all()
    )

    seen: set[frozenset] = set()
    alerts = []
    for r in rows:
        if r.item_seq_a == r.item_seq_b:
            continue
        key = frozenset((r.item_seq_a, r.item_seq_b))
        if key in seen:
            continue
        seen.add(key)
        name_a = seq_to_name.get(r.item_seq_a, r.item_name_a or str(r.item_seq_a))
        name_b = seq_to_name.get(r.item_seq_b, r.item_name_b or str(r.item_seq_b))
        reason = (r.prohibition_reason or "").strip()
        alerts.append({
            "level": LEVEL_BLOCK,
            "type": "contraindication",
            "drugs": [name_a, name_b],
            "message": f"병용금기: {name_a}와 {name_b}는 함께 복용하면 안 됩니다." + (f" ({reason})" if reason else ""),
            "detail": (r.grade or None),
        })
    return alerts


def _check_recall(drugs: list[_ResolvedDrug], masters: _Masters) -> list[dict]:
    """회수약 — is_recalled 약품이면 BLOCK."""
    alerts = []
    for d in drugs:
        if d.facts.drug_id in masters.recalled_drug_ids:
            alerts.append({
                "level": LEVEL_BLOCK,
                "type": "recall",
                "drugs": [d.name],
                "message": f"회수 대상 약품: {d.name}. 복용을 중단하고 의사·약사와 상담하세요.",
                "detail": None,
            })
    return alerts


# ── 통합 ────────────────────────────────────────────────────────────


def safety_check_prescriptions(
    prescriptions: list[Prescription], patient: dict | None, db: Session
) -> dict:
    """노트북 safety_check_all 호환 카테고리 dict 반환.

    patient: {'age': int} 또는 None (Phase 2 노인주의용; Phase 1 미사용).
    """
    masters = _get_masters(db)
    drugs, skipped = _resolve_prescriptions(prescriptions, masters, db)

    dup_ingr = _check_concurrent_ingredient(drugs)
    dup_eff = _check_class_duplication(drugs)
    contraindications = _check_contraindication(drugs, db)
    recall = _check_recall(drugs, masters)
    # Phase 2 자리 (노인주의·용량초과) — 현재는 빈 리스트
    elderly: list[dict] = []
    dose_exc: list[dict] = []

    all_alerts = [*dup_ingr, *dup_eff, *elderly, *dose_exc, *recall, *contraindications]
    summary = {
        "total_alerts": len(all_alerts),
        "block_count": sum(1 for a in all_alerts if a["level"] == LEVEL_BLOCK),
        "warn_count": sum(1 for a in all_alerts if a["level"] == LEVEL_WARN),
        "info_count": sum(1 for a in all_alerts if a["level"] == LEVEL_INFO),
    }
    return {
        "duplicates_ingredient": dup_ingr,
        "duplicates_efficacy": dup_eff,
        "elderly_cautions": elderly,
        "dose_exceeded": dose_exc,
        "recall_warnings": recall,
        "contraindications": contraindications,
        "summary": summary,
        "_skipped": skipped,
    }


def to_response(record_id: int, result: dict) -> SafetyCheckResponse:
    """카테고리 dict → 평탄 alerts(레벨 우선순위 정렬) SafetyCheckResponse."""
    flat = [
        *result["duplicates_ingredient"],
        *result["duplicates_efficacy"],
        *result["elderly_cautions"],
        *result["dose_exceeded"],
        *result["recall_warnings"],
        *result["contraindications"],
    ]
    flat.sort(key=lambda a: _LEVEL_ORDER.get(a["level"], 9))
    alerts = [
        SafetyAlert(level=a["level"], type=a["type"], drugs=a["drugs"], message=a["message"], detail=a.get("detail"))
        for a in flat
    ]
    s = result["summary"]
    return SafetyCheckResponse(
        record_id=record_id,
        alerts=alerts,
        summary={
            "total": s["total_alerts"],
            "block": s["block_count"],
            "warn": s["warn_count"],
            "info": s["info_count"],
        },
        skipped=result.get("_skipped", []),
        disclaimer=DISCLAIMER,
    )
