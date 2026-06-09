# app/utils/quote_fidelity.py
# 발췌 충실성 검증 — section.quote_raw 가 검색 청크의 substring 인지 런타임 검사.
# substring 미일치 = hard_fail(인용 재서술·주어 첨가·비존재). 문장경계·범위어 탈락은 검토용 flag.
# 청크가 공백 대신 \x01(PDF 추출 잔재)을 쓰는 경우가 있어 제어문자도 정규화로 제거한다.

from __future__ import annotations

import re
from typing import Any

_NORM = re.compile(r"[\s\x00-\x1f]+")          # 공백 + 제어문자 제거
_SENT = re.compile(r"(?<=[.。!?:])")            # 종결부호·콜론 뒤 분리
_SCOPE_WORDS = [
    "간기능부전", "간장애", "신장애", "고령자", "소아", "신생아", "임부", "수유부", "투여 중지", "과민증",
]


def norm(s: str) -> str:
    return _NORM.sub("", s or "")


def chunk_texts(ctx: dict[str, Any]) -> list[str]:
    """RAG context → 검증 대상 청크 본문 리스트."""
    cs: list[str] = []
    for key in ("drug_info_per_med", "drug_detail_per_med"):
        for d in ctx.get(key, []):
            cs += [r["content"] for r in d.get("retrieved", [])]
    cs += [r["content"] for r in ctx.get("guideline_general", [])]
    return cs


def _sentence_flag(qr_norm: str, chunk: str) -> str | None:
    """발췌가 청크 문장의 시작/끝과 맞는지(검토용). 일치하면 None, 아니면 flag kind."""
    sents = [norm(x) for x in _SENT.split(chunk) if norm(x)]
    full = "".join(sents)
    if qr_norm not in full:
        return None
    starts, pos = set(), 0
    for s in sents:
        starts.add(pos)
        pos += len(s)
    ends = {p for p in starts if p > 0} | {len(full)}
    idx = full.find(qr_norm)
    if idx not in starts:
        return "midsentence_start"
    if (idx + len(qr_norm)) not in ends:
        return "clause_end"
    return None


def validate_sections(sections: list[dict[str, Any]] | None, chunks: list[str]) -> dict[str, Any]:
    """각 section.quote_raw 를 청크 substring 검사.

    반환:
      kept      — substring 통과 섹션(quote_raw 제거, quote_display 유지)
      invalid   — [{title, quote_raw}]  substring 미일치(=hard fail)
      flags     — [{title, kind}]  midsentence_start/clause_end/scope_drop:* (검토용)
      hard_fail — bool(invalid)
    """
    norm_chunks = [norm(c) for c in chunks]
    kept: list[dict[str, Any]] = []
    invalid: list[dict[str, str]] = []
    flags: list[dict[str, str]] = []

    for s in sections or []:
        title = s.get("title", "")
        qr = norm(s.get("quote_raw", ""))
        if not qr or not any(qr in nc for nc in norm_chunks):
            invalid.append({"title": title, "quote_raw": s.get("quote_raw", "")})
            continue
        # 서빙되는 quote_display 가 quote_raw 의 '띄어쓰기 복원'이어야 함(단어 변경 금지).
        # 둘이 공백 제외하고 다르면 display 재서술 → invalid.
        qd = norm(s.get("quote_display", ""))
        if qd and qd != qr:
            invalid.append({"title": title, "quote_raw": s.get("quote_raw", "")})
            continue

        src = next((c for c in chunks if qr in norm(c)), "")
        sflag = _sentence_flag(qr, src)
        if sflag:
            flags.append({"title": title, "kind": sflag})
        scope_drop = [w for w in _SCOPE_WORDS if norm(w) in norm(src) and norm(w) not in qr]
        if scope_drop:
            flags.append({"title": title, "kind": "scope_drop:" + ",".join(scope_drop)})

        kept.append({
            "title": title,
            "scope": s.get("scope", ""),
            "gloss": s.get("gloss", ""),
            "quote_display": s.get("quote_display") or s.get("quote_raw", ""),
            "source": s.get("source", ""),
        })

    return {"kept": kept, "invalid": invalid, "flags": flags, "hard_fail": bool(invalid)}
