# scripts/check_rag_retrieve.py
# RAG 검색 슬라이스 검증 — 04 노트북 retrieve 와 동일한 정합(threshold·헬퍼) 확인.
#   docker exec viva_backend python scripts/check_rag_retrieve.py
#
# [A] 세 컬렉션 count (1288 / 13467 / 1657) — OpenAI 불필요
# [B] retrieve_drug_info("이 약 부작용이 뭐예요?", "202005623", top_k=3)
#     drug_info 비어있지 않고, 모든 similarity >= 0.3, drug_name 에 "타이레놀" 포함
# [C] retrieve("타이레놀", "drug_info_rag", top_k=3) — threshold 게이트로 빈 리스트
# [D] retrieve("메트포르민 부작용", "guideline_rag", top_k=3) — 비어있지 않음
# PASS = B AND C AND D

from __future__ import annotations

import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.config import settings
from app.utils.rag import SIMILARITY_THRESHOLD, get_chroma_client, retrieve, retrieve_drug_info


EXPECTED_COUNTS = {
    "drug_info_rag": 1288,
    "drug_detail_rag": 13467,
    "guideline_rag": 1657,
}

TYLENOL_SEQ = "202005623"  # 04 cell 10 OTC_FORCE_INCLUDE_SEQS — 어린이타이레놀산160밀리그램


def checkpoint_a() -> None:
    print(f"[A] CHROMA_DIR = {settings.CHROMA_DIR}")
    client = get_chroma_client()
    for name, expected in EXPECTED_COUNTS.items():
        try:
            actual = client.get_collection(name=name).count()
        except Exception as e:
            print(f"  - {name}: ERROR  ({type(e).__name__}: {e})")
            continue
        mark = "OK" if actual == expected else "MISMATCH"
        print(f"  - {name}: count={actual} (expected={expected})  [{mark}]")


def checkpoint_b() -> bool:
    print(f'[B] retrieve_drug_info(query="이 약 부작용이 뭐예요?", item_seq="{TYLENOL_SEQ}", top_k=3)')
    if not settings.OPENAI_API_KEY:
        print("  OPENAI_API_KEY 미설정 — 임베딩 호출 건너뜀")
        return False
    try:
        result = retrieve_drug_info("이 약 부작용이 뭐예요?", TYLENOL_SEQ, top_k=3)
    except Exception as e:
        print(f"  ERROR ({type(e).__name__}: {e})")
        return False

    drug_info = result.get("drug_info", [])
    drug_detail = result.get("drug_detail", [])

    print(f"  drug_info: {len(drug_info)}건")
    for i, r in enumerate(drug_info, start=1):
        meta = r.get("metadata") or {}
        drug_name = meta.get("drug_name", "(no drug_name)")
        field = meta.get("field_label_kr", "?")
        sim = r.get("similarity")
        snippet = (r.get("content") or "")[:80].replace("\n", " ")
        print(f"    {i}. sim={sim:.3f}  {drug_name} ({field})")
        print(f"       {snippet}...")

    print(f"  drug_detail: {len(drug_detail)}건 (커버리지 정보 — 0 이어도 정상)")

    non_empty = len(drug_info) > 0
    all_above_threshold = all(float(r["similarity"]) >= SIMILARITY_THRESHOLD for r in drug_info)
    has_tylenol = any("타이레놀" in (r.get("metadata") or {}).get("drug_name", "") for r in drug_info)

    print(f"  → non_empty={non_empty}, all>=0.3={all_above_threshold}, has_타이레놀={has_tylenol}")
    return non_empty and all_above_threshold and has_tylenol


def checkpoint_c() -> bool:
    print('[C] retrieve(query="타이레놀", collection="drug_info_rag", top_k=3)')
    if not settings.OPENAI_API_KEY:
        print("  OPENAI_API_KEY 미설정 — 임베딩 호출 건너뜀")
        return False
    try:
        results = retrieve("타이레놀", "drug_info_rag", top_k=3)
    except Exception as e:
        print(f"  ERROR ({type(e).__name__}: {e})")
        return False

    print(f"  결과 {len(results)}건")
    print("  이전 0.27/0.25/0.24 가 모두 0.3 미만 → 필터됨. threshold 게이트 동작 확인: 0건이 정상.")
    return len(results) == 0


def checkpoint_d() -> bool:
    print('[D] retrieve(query="메트포르민 부작용", collection="guideline_rag", top_k=3)')
    if not settings.OPENAI_API_KEY:
        print("  OPENAI_API_KEY 미설정 — 임베딩 호출 건너뜀")
        return False
    try:
        results = retrieve("메트포르민 부작용", "guideline_rag", top_k=3)
    except Exception as e:
        print(f"  ERROR ({type(e).__name__}: {e})")
        return False

    print(f"  결과 {len(results)}건")
    for i, r in enumerate(results, start=1):
        meta = r.get("metadata") or {}
        pub = meta.get("publisher", "?")
        idx = meta.get("chunk_idx", "?")
        sim = r.get("similarity")
        snippet = (r.get("content") or "")[:80].replace("\n", " ")
        print(f"    {i}. sim={sim:.3f}  {pub} chunk {idx}")
        print(f"       {snippet}...")
    return len(results) > 0


def main() -> int:
    checkpoint_a()
    print()
    b_ok = checkpoint_b()
    print()
    c_ok = checkpoint_c()
    print()
    d_ok = checkpoint_d()
    print()

    def mark(ok: bool) -> str:
        return "PASS" if ok else "FAIL"

    overall = b_ok and c_ok and d_ok
    print(f"summary: B={mark(b_ok)}, C={mark(c_ok)}, D={mark(d_ok)}  →  {mark(overall)}")
    return 0 if overall else 1


if __name__ == "__main__":
    sys.exit(main())
