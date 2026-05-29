# scripts/check_guide_generate.py
# 가이드 생성 파이프라인 단계별 검증 (L1 → L2 → L3 → L4).
# 현재는 L1 만 구현 — LLM 미호출, 무료·결정론적.
#   docker exec viva_backend python scripts/check_guide_generate.py

from __future__ import annotations

import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.config import settings
from app.utils.rag import prepare_rag_context
from app.services import llm_service as llm_svc
from app.services.llm_service import (
    is_retrieval_empty,
    generate_markdown,
    generate_guide_for_drug,
    FALLBACK_TEXT,
    DISCLAIMER,
)


EXPECTED_KEYS = {
    "safety",
    "drug_info_per_med",
    "drug_detail_per_med",
    "guideline_general",
    "user_query",
    "medications",
    "patient",
}

TYLENOL_MED = {"item_seq": "202005623", "drug_name": "어린이타이레놀산160밀리그램"}


def checkpoint_l1() -> bool:
    print("[L1] prepare_rag_context 호출 — LLM 미호출, drug_info + drug_detail + guideline")
    print(f"     medications=[{TYLENOL_MED}]")
    print('     user_query="이 약 부작용이 뭐예요?", safety=None')

    ctx = prepare_rag_context(
        [TYLENOL_MED],
        user_query="이 약 부작용이 뭐예요?",
        safety=None,
    )

    # 키 검증
    keys_ok = set(ctx.keys()) == EXPECTED_KEYS
    missing = EXPECTED_KEYS - set(ctx.keys())
    extra = set(ctx.keys()) - EXPECTED_KEYS
    print(f"  반환 키: {sorted(ctx.keys())}")
    if missing:
        print(f"    MISSING: {sorted(missing)}")
    if extra:
        print(f"    EXTRA:   {sorted(extra)}")

    # drug_info_per_med 비어있지 않은지
    di = ctx["drug_info_per_med"]
    di_first = di[0] if di else {}
    di_retrieved = di_first.get("retrieved", [])
    di_ok = len(di_retrieved) > 0
    print(f"  drug_info_per_med[0].retrieved: {len(di_retrieved)}건")
    for i, r in enumerate(di_retrieved, start=1):
        meta = r.get("metadata") or {}
        print(f"    {i}. sim={r['similarity']:.3f}  "
              f"{meta.get('drug_name','?')} ({meta.get('field_label_kr','?')})")

    # drug_detail_per_med — 커버리지 정보 (0 이어도 정상)
    dd = ctx["drug_detail_per_med"]
    dd_retrieved = dd[0].get("retrieved", []) if dd else []
    print(f"  drug_detail_per_med[0].retrieved: {len(dd_retrieved)}건 (0 이어도 정상)")

    # guideline_general 건수 출력 (PASS 기준엔 미포함 — 정보 출력)
    gl = ctx["guideline_general"]
    print(f"  guideline_general: {len(gl)}건")
    for i, r in enumerate(gl, start=1):
        meta = r.get("metadata") or {}
        print(f"    {i}. sim={r['similarity']:.3f}  "
              f"{meta.get('publisher','?')} chunk {meta.get('chunk_idx','?')}")

    # echo 필드
    print(f"  user_query echo: {ctx['user_query']!r}")
    print(f"  patient echo:    {ctx['patient']!r}")
    print(f"  safety echo:     {ctx['safety']!r}")

    print(f"  → keys_ok={keys_ok}, drug_info_non_empty={di_ok}")
    return keys_ok and di_ok


def checkpoint_l2() -> bool:
    print("[L2] is_retrieval_empty 게이트 검증 — LLM 미호출")

    # case A: 커버된 seq (L1 과 동일 입력) → False 기대
    ctx_covered = prepare_rag_context(
        [TYLENOL_MED],
        user_query="이 약 부작용이 뭐예요?",
        safety=None,
    )
    covered_empty = is_retrieval_empty(ctx_covered)
    di_n = sum(len(d.get("retrieved", [])) for d in ctx_covered["drug_info_per_med"])
    dd_n = sum(len(d.get("retrieved", [])) for d in ctx_covered["drug_detail_per_med"])
    gl_n = len(ctx_covered["guideline_general"])
    print(f"  case A (covered seq=202005623):")
    print(f"    drug_info={di_n}, drug_detail={dd_n}, guideline={gl_n}")
    print(f"    is_retrieval_empty={covered_empty}  (기대: False)")

    # case B: 가짜 seq + drug_name="" + user_query=None
    # → drug_info/drug_detail 는 item_seq 필터로 0건,
    #   guideline_query 는 빈 문자열이라 코드 경로상 결정론적으로 0건.
    fake_med = {"item_seq": "000000000", "drug_name": ""}
    ctx_fake = prepare_rag_context(
        [fake_med],
        user_query=None,
        safety=None,
    )
    fake_empty = is_retrieval_empty(ctx_fake)
    di_n2 = sum(len(d.get("retrieved", [])) for d in ctx_fake["drug_info_per_med"])
    dd_n2 = sum(len(d.get("retrieved", [])) for d in ctx_fake["drug_detail_per_med"])
    gl_n2 = len(ctx_fake["guideline_general"])
    print(f"  case B (fake seq=000000000, drug_name='', user_query=None):")
    print(f"    drug_info={di_n2}, drug_detail={dd_n2}, guideline={gl_n2}")
    print(f"    is_retrieval_empty={fake_empty}  (기대: True)")

    return (covered_empty is False) and (fake_empty is True)


def checkpoint_l3() -> bool:
    print("[L3] generate_markdown — OpenAI 호출 (개발 모델)")
    print(f"     model={settings.GENERATION_MODEL}, temperature={settings.GENERATION_TEMPERATURE}")
    if not settings.OPENAI_API_KEY:
        print("  OPENAI_API_KEY 미설정 — 건너뜀")
        return False

    ctx = prepare_rag_context(
        [TYLENOL_MED],
        user_query="이 약 부작용이 뭐예요?",
        safety=None,
    )
    try:
        md = generate_markdown(ctx)
    except Exception as e:
        print(f"  ERROR ({type(e).__name__}: {e})")
        return False

    print(f"  응답 길이: {len(md)}자")
    print("  --- 마크다운 본문 ---")
    print(md)
    print("  --- 끝 ---")

    return isinstance(md, str) and len(md.strip()) > 0


EXPECTED_PAYLOAD_KEYS = {
    "drug_name",
    "main_content",
    "is_fallback",
    "disclaimer",
    "references",
    "safety_block",
    "safety_warn",
    "safety_info",
    "safety_recommendations",
}


def checkpoint_l4() -> bool:
    print("[L4] generate_guide_for_drug — 분기·폴백 검증")
    if not settings.OPENAI_API_KEY:
        print("  OPENAI_API_KEY 미설정 — 건너뜀")
        return False

    # case A: 커버된 seq → is_fallback=False, main_content 비어있지 않음, LLM 호출됨
    print("  case A (covered seq=202005623):")
    payload_a = generate_guide_for_drug(
        item_seq="202005623",
        drug_name="어린이타이레놀산160밀리그램",
        user_query="이 약 부작용이 뭐예요?",
    )
    keys_a_ok = set(payload_a.keys()) == EXPECTED_PAYLOAD_KEYS
    a_ok = (
        keys_a_ok
        and payload_a["is_fallback"] is False
        and isinstance(payload_a["main_content"], str)
        and len(payload_a["main_content"].strip()) > 0
        and payload_a["main_content"] != FALLBACK_TEXT
        and payload_a["disclaimer"] == DISCLAIMER
    )
    print(f"    is_fallback={payload_a['is_fallback']}, "
          f"main_content_len={len(payload_a['main_content'])}자, "
          f"keys_ok={keys_a_ok}")

    # case B: 가짜 seq — generate_markdown 을 spy 로 교체해 LLM 미호출 확인.
    # generate_guide_for_drug 가 모듈 네임스페이스로 generate_markdown 을 해석하므로
    # llm_svc.generate_markdown 을 패치하면 호출 시도 시점에 잡힌다.
    print("  case B (fake seq=000000000, drug_name='', user_query=None):")
    spy_calls: list = []
    original_gm = llm_svc.generate_markdown

    def _spy(_ctx):  # noqa: ANN001
        spy_calls.append(1)
        raise AssertionError("generate_markdown 이 호출되면 폴백 분기가 깨진 것")

    llm_svc.generate_markdown = _spy
    try:
        payload_b = generate_guide_for_drug(
            item_seq="000000000",
            drug_name="",
            user_query=None,
        )
    finally:
        llm_svc.generate_markdown = original_gm

    keys_b_ok = set(payload_b.keys()) == EXPECTED_PAYLOAD_KEYS
    b_ok = (
        keys_b_ok
        and payload_b["is_fallback"] is True
        and payload_b["main_content"] == FALLBACK_TEXT
        and len(spy_calls) == 0
    )
    print(f"    is_fallback={payload_b['is_fallback']}, "
          f"main_content==FALLBACK_TEXT: {payload_b['main_content'] == FALLBACK_TEXT}, "
          f"LLM 호출 횟수={len(spy_calls)}, keys_ok={keys_b_ok}")

    return a_ok and b_ok


def main() -> int:
    l1_ok = checkpoint_l1()
    print()
    l2_ok = checkpoint_l2()
    print()
    l3_ok = checkpoint_l3()
    print()
    l4_ok = checkpoint_l4()
    print()

    def mark(ok: bool) -> str:
        return "PASS" if ok else "FAIL"

    overall = l1_ok and l2_ok and l3_ok and l4_ok
    print(f"summary: L1={mark(l1_ok)}, L2={mark(l2_ok)}, "
          f"L3={mark(l3_ok)}, L4={mark(l4_ok)}  →  {mark(overall)}")
    return 0 if overall else 1


if __name__ == "__main__":
    sys.exit(main())
