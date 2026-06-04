# scripts/check_quote_fidelity.py
# 발췌 충실성 리포터 (Phase B)
#   "서빙되는 결과"(런타임 재생성·폐기 후 generate_guide_for_drug_async 반환)의 quote_display 가
#   청크 substring 인지 검사. 목표: served invalid 0 (PASS).
#   1차 생성의 raw 위반·재생성 발동은 docker 로그([QUOTE-FAIL]/[QUOTE-KEEP1]/[QUOTE-DROP])로 본다.
#   docker exec viva_backend python scripts/check_quote_fidelity.py
from __future__ import annotations

import asyncio
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.utils.quote_fidelity import chunk_texts, norm
from app.utils.rag import prepare_rag_context_async
from app.services.llm_service import generate_guide_for_drug_async

CASES = [
    ("200402637", "아모디핀정5밀리그램(암로디핀캄실산염)"),
    ("202005623", "어린이타이레놀산160밀리그램"),
]
RUNS = 2


async def _one(item_seq: str, drug_name: str) -> dict:
    payload = await generate_guide_for_drug_async(item_seq, drug_name)
    ctx = await prepare_rag_context_async([{"item_seq": item_seq, "drug_name": drug_name}])
    norm_chunks = [norm(c) for c in chunk_texts(ctx)]
    secs = payload.get("sections", [])
    bad = [
        (s.get("quote_display") or "")[:40]
        for s in secs
        if not any(norm(s.get("quote_display", "")) in nc for nc in norm_chunks)
    ]
    return {"sections": len(secs), "bad": bad, "fallback": payload.get("is_fallback")}


async def main() -> int:
    tot_sec = tot_bad = 0
    for seq, name in CASES:
        print(f"\n=== {name} ({seq}) ===")
        for i in range(RUNS):
            r = await _one(seq, name)
            tot_sec += r["sections"]
            tot_bad += len(r["bad"])
            tag = " (fallback)" if r["fallback"] else ""
            line = f"  run{i + 1}: served sections={r['sections']} invalid={len(r['bad'])}{tag}"
            if r["bad"]:
                line += f"  ✗{r['bad']}"
            print(line)
    ok = tot_bad == 0
    print(f"\nsummary: served invalid {tot_bad}/{tot_sec} → {'PASS' if ok else 'FAIL'}  (런타임 재생성·폐기 후 결과)")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
