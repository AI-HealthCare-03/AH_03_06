# scripts/check_quote_fidelity.py
# 복약 가이드 발췌 충실성 게이트
#   substring(하드) + 문장 시작/절단위·범위어 탈락(플래그)
#   청크가 \n·\x01(PDF 추출 잔재) 섞인 run-on 이라 문장 경계는 하드가 아닌 플래그로 둠
#   docker exec viva_backend python scripts/check_quote_fidelity.py
from __future__ import annotations

import os
import re
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.utils.rag import prepare_rag_context
from app.services.llm_service import generate_guide_for_drug

_SENT = re.compile(r"(?<=[.。!?:])")  # 종결부호·콜론 뒤 분리 (청크 \n 은 _norm 에서 제거)
_QUOTE = re.compile(r'[\"“”]([^\"“”]+)[\"“”]')
_SCOPE = ["간기능부전", "간장애", "신장애", "고령자", "소아", "신생아", "임부", "수유부", "투여 중지", "과민증"]


def _norm(s: str) -> str:
    # 공백 + 제어문자(\x01 등 PDF 추출 잔재) 제거 — 청크가 띄어쓰기 대신 \x01 을 쓰는 경우가 있음
    return re.sub(r"[\s\x00-\x1f]+", "", s or "")


def _chunks(item_seq: str, drug_name: str) -> list[str]:
    ctx = prepare_rag_context([{"item_seq": str(item_seq), "drug_name": drug_name}])
    cs: list[str] = []
    for key in ("drug_info_per_med", "drug_detail_per_med"):
        for d in ctx.get(key, []):
            cs += [r["content"] for r in d.get("retrieved", [])]
    cs += [r["content"] for r in ctx.get("guideline_general", [])]
    return cs


# 단어 중간 절단 신호: 발췌가 어느 문장의 '시작'과 맞는지 본다.
# 청크가 공백 없는 run-on 이라 문장 경계 판정이 완벽하지 않으므로 substring 만 하드, 나머지는 플래그.
def _classify(nq: str, chunk: str) -> str | None:
    sents = [_norm(s) for s in _SENT.split(chunk) if _norm(s)]
    full = "".join(sents)
    if nq not in full:
        return None
    starts, pos = set(), 0
    for s in sents:
        starts.add(pos)
        pos += len(s)
    ends = {p for p in starts if p > 0} | {len(full)}
    idx = full.find(nq)
    start_ok = idx in starts
    end_ok = (idx + len(nq)) in ends
    if start_ok and end_ok:
        return "PASS"
    if start_ok:
        return "FLAG_clause_end"
    return "FLAG_midsentence_start"


def check(item_seq: str, drug_name: str) -> bool:
    md = generate_guide_for_drug(str(item_seq), drug_name)["main_content"]
    quotes = _QUOTE.findall(md)
    chunks = _chunks(item_seq, drug_name)
    print(f"\n=== {drug_name} ({item_seq}) — 인용 {len(quotes)}개 ===")
    ok = True
    for q in quotes:
        nq = _norm(q)
        verdicts = [v for v in (_classify(nq, c) for c in chunks) if v]
        if not verdicts:
            best = "FAIL_not_substring"
        elif "PASS" in verdicts:
            best = "PASS"
        elif "FLAG_clause_end" in verdicts:
            best = "FLAG_clause_end"
        elif "FLAG_midsentence_start" in verdicts:
            best = "FLAG_midsentence_start"
        else:
            best = verdicts[0]
        src = next((c for c in chunks if nq in _norm(c)), "")
        scope_drop = [w for w in _SCOPE if _norm(w) in _norm(src) and _norm(w) not in nq]
        flag = f"  ⚠범위어탈락:{scope_drop}" if scope_drop else ""
        if best.startswith("FAIL"):  # 하드 실패는 substring 미일치뿐
            ok = False
        print(f"  [{best}]{flag}  \"{q[:54]}\"")
    return ok


if __name__ == "__main__":
    CASES = [
        ("200402637", "아모디핀정5밀리그램(암로디핀캄실산염)"),  # 권장용량·간기능부전 주의사항 보유
        ("202005623", "어린이타이레놀산160밀리그램"),
    ]
    all_ok = all(check(s, n) for s, n in CASES)
    print(f"\nsummary: {'PASS' if all_ok else 'FAIL (비substring 인용 존재)'}  (FLAG 는 검토용, 하드 실패 아님)")
    sys.exit(0 if all_ok else 1)
