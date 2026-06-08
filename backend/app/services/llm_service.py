# app/services/llm_service.py
# 복약 가이드 LLM 생성 경로 (Phase B — 구조화 JSON)
# - RAG context → JSON 프롬프트 → OpenAI(response_format json_schema) → 구조화 payload
# - quote_raw 런타임 게이트: 검색 청크 substring 미일치 섹션 폐기(verbatim 보장)
# - 빈 검색 게이트: is_retrieval_empty → fallback (LLM 미호출)
# - 회수약: drug_info.is_recalled → safety_block 자동 채움

from __future__ import annotations

import json
import logging
import time
from typing import Any

from openai import AsyncOpenAI

from app.config import settings
from app.database import SessionLocal
from app.models.drug_info import DrugInfo
from app.utils.quote_fidelity import chunk_texts, validate_sections
from app.utils.rag import prepare_rag_context_async

logger = logging.getLogger(__name__)


def is_retrieval_empty(ctx: dict[str, Any]) -> bool:
    """drug_info + drug_detail + guideline 의 retrieved 가 모두 0건이면 True (LLM 호출 차단 게이트)."""
    total = 0
    for d in ctx.get("drug_info_per_med", []):
        total += len(d.get("retrieved", []))
    for d in ctx.get("drug_detail_per_med", []):
        total += len(d.get("retrieved", []))
    total += len(ctx.get("guideline_general", []))
    return total == 0


# 검색 0건·근거 전량 폐기 시 결정론적 폴백 (LLM 미호출 또는 미채택).
FALLBACK_TEXT = (
    "공식 출처(식약처 e약은요·의약품안전나라, 학회 진료지침)에서 이 약품에 대한 "
    "신뢰할 수 있는 정보를 확보하지 못했습니다. 정확한 복약 안내는 처방받은 의료기관이나 "
    "가까운 약국의 의사·약사와 상담해 주세요. 본 안내는 임의의 약리 지식을 추측해 제공하지 않습니다."
)
DISCLAIMER = "본 가이드는 일반적인 건강 정보 제공이며, 의학적 진단·처방·치료를 대체하지 않습니다."


# 구조화 생성 SYSTEM_PROMPT. 출력은 GUIDE_JSON_SCHEMA 의 JSON 하나만.
GUIDE_SYSTEM_PROMPT = """당신은 식품의약품안전처 의약품개요정보(e약은요), 의약품안전나라(nedrug), 학회 임상진료지침 검색 결과만으로 복약 안내를 구성하는 한국어 AI다. 출력은 지정된 JSON 하나만 낸다(마크다운·설명·코드펜스 금지).

## 출력 필드
- key_point: 지금 가장 중요한 포인트, 1~2문장. 아래 sections 가 직접 뒷받침하는 내용만. sections 전체를 가로질러 가장 중요한 핵심 1가지만 요약하며, 특정 section 의 gloss 를 거의 그대로 반복하거나 여러 section 을 단순히 이어붙이지 않는다.
- sections[]: { title, scope, gloss, quote_raw, quote_display, source }
  - title: 발췌 주제를 짧게(8자 안팎). 범위 일반화 금지.
  - scope: 적용 대상을 가리키는 짧은 명사구 라벨(12자 안팎). 예 "전체" / "간기능부전" / "임부·수유부" / "소아" / "투여 중지 후". "투여 중지 후 다른 혈압강하제 사용 시"처럼 긴 상황 설명은 scope 가 아니라 gloss 에 쓴다.
  - gloss: 쉬운 한국어 풀이 1~2문장.
  - quote_raw: 검색 청크에 글자 그대로 존재하는 완전한 문장(검증용).
  - quote_display: quote_raw 의 띄어쓰기·표기깨짐만 보정한 화면용.
  - source: 그 청크 metadata.source 값.
- safety_note: 일반 안전사용 안내 1문장.
- fallback_message: 정상 생성이면 null. 쓸 만한 근거가 없으면 안내 문구.

## 절대 원칙 (환각 차단 — 최우선)
1. 검색 컨텍스트(drug_info/drug_detail/guideline)에 명시된 내용만 사용. 사전지식으로 약명·용량·금기·부작용·상호작용 추가 금지.
2. quote_raw 는 청크에 **글자 그대로 있는 완전한 문장**:
   - 단어/문장 중간에서 시작·종료 금지("권장용량"을 "장용량"으로 자르지 말 것).
   - 청크에 없는 주어·단어를 앞·중간에 추가 금지(문장에 "암로디핀은"이 없으면 붙이지 말 것). 주어 없으면 없는 채로.
   - 같은 뜻 다른 표현으로 바꾸기 금지("복용해야 할 경우"→"복용할 때는" 금지).
3. quote_display 는 quote_raw 의 띄어쓰기·표기깨짐(`|` 등)만 보정. 단어·숫자·의미 변경 금지.
4. gloss/key_point/title 은 근거 발췌 밖 사실을 추가하지 않는다:
   - 특정 환자군·조건·약물 목록 한정을 "여러/다양한/모든/약 전체"로 일반화 금지.
   - 연구·관찰 표현("~한 경우 안전하였다", "~로 보고되었다")을 단정("안전합니다")으로 강화 금지.
   - 병용 안전성은 "함께 써도 안전" 단정 금지 — scope 에 나열 계열 유지, gloss 는 "그 밖의 병용은 의사·약사 상의".
5. scope: 발췌가 특정 대상 한정이면 명시, 전체 적용이면 "전체". gloss·key_point 는 발췌가 다루지 않은 다른 환자군·상황에 "해당 없음/괜찮음" 같은 대조·추론을 덧붙이지 않는다(적용 범위는 scope 로만 표시).
6. 행동지시(용량 변경·중단·약 교체 직접 지시) 금지 — 상담 권유로. 감량·증량의 폭·속도를 구체적으로 지시하지 말고, 중단·조절은 "의사와 상의"로 권유한다.
7. key_point 는 기본적으로 scope 가 "전체"인 핵심 안전정보를 우선한다. 사용자가 해당 환자군인지 알 수 없는 소집단 한정 주의(소아·임부·수유부·간기능부전·신장애 등)는 key_point 에 올리지 않고 sections.scope 로만 다룬다(예: 소아 주의로 key_point 를 시작하지 말 것).

## 섹션 선택 (임상 우선순위)
- sections 는 검색된 관련 발췌만큼 1~4개. 억지로 채우지 않는다.
- 다음 우선순위로 고른다:
  1순위: 사용자 질문이 있으면 그 질문에 직접 답하는 발췌
  2순위: 금기·중대한 경고·중대한 이상반응·간손상·과민증 등 강한 안전정보
  3순위: 복용 핵심 — 용량·복용법·투여 중지 시 주의·상호작용·중대한 부작용
  4순위: 특정 환자군 주의(임부·수유부·소아·고령자·간기능부전 등)
  5순위: 그 외 저위험 정보
- "운전 및 기계 사용에 영향 없음"처럼 위험도·행동지침이 약한 발췌는 1~4순위가 부족해 자리가 남을 때만, 최대 1개까지만 넣는다.

## 별도 표시(JSON 본문에 쓰지 않음)
- 안전성 알림(BLOCK/WARN/INFO)·면책·출처 목록은 시스템이 별도 필드로 표시한다.

## 검색 결과가 부족하면
- 쓸 만한 발췌가 없으면 sections=[], key_point="", fallback_message 에 "공식 출처에서 …확보하지 못했습니다. 의료기관·약국 상담을 권합니다." 형태.

## 자체검증(출력 전)
- 모든 quote_raw 가 청크의 완전한 문장 substring 인가(단어중간/주어날조/재서술 없음)?
- gloss/key_point 가 발췌 밖 사실·범위 일반화·단정 강화 없는가?
- scope 가 발췌의 적용 범위와 일치하며 짧은 라벨(12자 안팎)인가?
- key_point 가 특정 section 의 반복이 아니고, 소집단 한정 주의를 올리지 않았는가?
- sections 가 임상 우선순위대로 선택됐고, 저가치 섹션이 핵심 섹션을 밀어내지 않았는가?
- 병용 안전성 표현이 "여러 약물과 안전"처럼 일반화되지 않았는가?
- JSON 외 텍스트가 없는가?
"""


# response_format json_schema (strict) — 구조 강제.
GUIDE_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "required": ["key_point", "sections", "safety_note", "fallback_message"],
    "properties": {
        "key_point": {"type": "string"},
        "sections": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["title", "scope", "gloss", "quote_raw", "quote_display", "source"],
                "properties": {
                    "title": {"type": "string"},
                    "scope": {"type": "string"},
                    "gloss": {"type": "string"},
                    "quote_raw": {"type": "string"},
                    "quote_display": {"type": "string"},
                    "source": {"type": "string"},
                },
            },
        },
        "safety_note": {"type": "string"},
        "fallback_message": {"type": ["string", "null"]},
    },
}


def _collect_references(ctx: dict[str, Any]) -> list[str]:
    """검색 hit 의 metadata['source'] 만 모아 순서 보존 dedupe → 출처 목록.

    LLM 본문 출력이 아니라 RAG 검색 결과에서 직접 조립한다(창작·병합 없음).
    검색 0건이면 빈 리스트.
    """
    sources: list[str] = []
    seen: set[str] = set()

    def _add(hits: list[dict[str, Any]] | None) -> None:
        for r in hits or []:
            src = (r.get("metadata") or {}).get("source")
            if src and src not in seen:
                seen.add(src)
                sources.append(src)

    for d in ctx.get("drug_info_per_med", []):
        _add(d.get("retrieved"))
    for d in ctx.get("drug_detail_per_med", []):
        _add(d.get("retrieved"))
    _add(ctx.get("guideline_general"))
    return sources


def format_rag_context(ctx: dict[str, Any]) -> str:
    """RAG context dict → LLM user 메시지 텍스트."""
    lines: list[str] = []

    patient = ctx.get("patient")
    if patient:
        lines.append(f"[환자] age={patient.get('age', '미상')}")

    meds = ctx.get("medications") or []
    if meds:
        med_names = ", ".join(m.get("drug_name", "?") for m in meds)
        lines.append(f"[등록 약품] {med_names}")
    else:
        lines.append("[등록 약품] (없음)")

    user_q = ctx.get("user_query")
    if user_q:
        lines.append(f"[사용자 질문] {user_q}")

    lines.append("\n[drug_info 검색 결과 (e약은요)]")
    drug_info_per_med = ctx.get("drug_info_per_med") or []
    if not drug_info_per_med:
        lines.append("(검색 대상 없음)")
    for d in drug_info_per_med:
        lines.append(f"\n약품: {d.get('drug_name', '?')}")
        retrieved = d.get("retrieved") or []
        if not retrieved:
            lines.append("  (검색 결과 0건)")
        for r in retrieved:
            field = r["metadata"].get("field_label_kr", "?")
            src = r["metadata"].get("source", "?")
            lines.append(f"  [{field} | source={src}] {r['content']}")

    detail_per_med = ctx.get("drug_detail_per_med") or []
    if detail_per_med:
        lines.append("\n[drug_detail 검색 결과 (식약처 nedrug PDF 본문, 임상 문헌체)]")
        for d in detail_per_med:
            lines.append(f"\n약품: {d.get('drug_name', '?')}")
            retrieved = d.get("retrieved") or []
            if not retrieved:
                lines.append("  (검색 결과 0건)")
            for r in retrieved:
                field = r["metadata"].get("field_label_kr", "?")
                src = r["metadata"].get("source", "?")
                lines.append(f"  [{field} | source={src}] {r['content']}")

    lines.append("\n[guideline 검색 결과 (학회 진료지침)]")
    guideline = ctx.get("guideline_general") or []
    if not guideline:
        lines.append("(검색 결과 0건)")
    for r in guideline:
        src = r["metadata"].get("source", "?")
        lines.append(f"  [source={src}] {r['content']}")

    return "\n".join(lines)


def _lookup_recall_warning(item_seq: str) -> str | None:
    """drug_info.is_recalled 기반 회수약 메시지 (🚫 포맷). 회수약 아니면 None."""
    if not item_seq:
        return None
    db = SessionLocal()
    try:
        row = (
            db.query(DrugInfo)
            .filter(DrugInfo.drug_code == str(item_seq))
            .first()
        )
        if row and row.is_recalled:
            reason = (row.recall_reason or "회수 대상 약품입니다.").strip()
            return f"🚫 회수약 알림: {reason}"
        return None
    finally:
        db.close()


def _build_correction(invalid: list[dict[str, str]]) -> str:
    """재생성용 — 직전 응답에서 substring 미일치였던 quote_raw 목록 + 교정 규칙."""
    lines = "\n".join(f'- "{i.get("quote_raw", "")}"' for i in invalid)
    return (
        "직전 응답의 아래 인용(quote_raw)은 제공된 청크 원문의 substring 이 아니라 사용할 수 없습니다:\n"
        f"{lines}\n"
        "규칙: quote_raw 는 청크에 글자 그대로 있는 완전한 문장만 넣는다. 같은 뜻을 다른 표현으로 바꾸지 말 것"
        '("복용해야 할 경우"→"복용할 때는" 금지). 청크에 없는 "이 약은"·약품명·주어를 앞에 붙이지 말 것. '
        "quote_display 는 quote_raw 의 띄어쓰기만 복원하고 단어를 바꾸지 마라(quote_raw 와 같은 문장이어야 함). "
        "해당 섹션은 청크에 실제 있는 다른 문장으로 교체하거나, 적절한 발췌가 없으면 그 섹션을 빼라."
    )


_async_openai_client: AsyncOpenAI | None = None


def _get_async_openai_client() -> AsyncOpenAI:
    global _async_openai_client
    if _async_openai_client is None:
        _async_openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _async_openai_client


async def generate_structured_async(ctx: dict[str, Any], correction: str | None = None) -> dict[str, Any]:
    """RAG ctx → OpenAI(json_schema strict) → 구조화 dict. correction 있으면 재생성 교정 메시지 추가."""
    client = _get_async_openai_client()
    messages = [
        {"role": "system", "content": GUIDE_SYSTEM_PROMPT},
        {"role": "user", "content": format_rag_context(ctx)},
    ]
    if correction:
        messages.append({"role": "user", "content": correction})
    resp = await client.chat.completions.create(
        model=settings.GENERATION_MODEL,
        temperature=settings.GENERATION_TEMPERATURE,
        response_format={
            "type": "json_schema",
            "json_schema": {"name": "medication_guide", "strict": True, "schema": GUIDE_JSON_SCHEMA},
        },
        messages=messages,
    )
    return json.loads(resp.choices[0].message.content)


def _fallback_payload(drug_name: str, references: list[str], safety_block: str | None) -> dict[str, Any]:
    return {
        "drug_name": drug_name,
        "key_point": "",
        "sections": [],
        "safety_note": "정해진 용량·용법을 지키고, 궁금한 점이나 이상징후는 의사·약사와 상담하세요.",
        "fallback_message": FALLBACK_TEXT,
        "is_fallback": True,
        "references": references,
        "disclaimer": DISCLAIMER,
        "safety_block": safety_block,
    }


async def generate_guide_for_drug_async(
    item_seq: str,
    drug_name: str = "",
    user_query: str | None = None,
    patient: dict[str, Any] | None = None,
    safety: dict[str, Any] | None = None,
    top_k: int = 3,
) -> dict[str, Any]:
    """item_seq 한 건의 구조화 가이드 payload 생성 오케스트레이션.

    검색 0건이면 LLM 미호출 fallback. 생성 후 quote_raw 게이트로 미일치 섹션 폐기,
    남은 섹션이 없으면 fallback 처리. references 는 검색 출처에서 조립, 회수약은 DB lookup.
    """
    t0 = time.perf_counter()
    ctx = await prepare_rag_context_async(
        [{"item_seq": str(item_seq), "drug_name": drug_name}],
        patient=patient,
        user_query=user_query,
        safety=safety,
        top_k=top_k,
    )
    references = _collect_references(ctx)
    safety_block = _lookup_recall_warning(str(item_seq)) if item_seq else None

    if is_retrieval_empty(ctx):
        logger.info(f"[TIMING] item_seq={item_seq} drug_name={drug_name[:30]} retrieve-only fallback")
        return _fallback_payload(drug_name, references, safety_block)

    chunks = chunk_texts(ctx)
    data = await generate_structured_async(ctx)
    res = validate_sections(data.get("sections"), chunks)
    if res["hard_fail"]:
        # 재서술·주어첨가·비substring 인용 발견 → 그 목록 실어 1회 재생성
        logger.info(f"[QUOTE-FAIL] item_seq={item_seq} invalid={len(res['invalid'])} → 재생성 1회")
        data2 = await generate_structured_async(ctx, correction=_build_correction(res["invalid"]))
        res2 = validate_sections(data2.get("sections"), chunks)
        if len(res2["kept"]) >= len(res["kept"]):
            data, res = data2, res2   # 재생성이 같거나 더 많은 유효 섹션 → 채택
        else:
            logger.info(f"[QUOTE-KEEP1] item_seq={item_seq} 재생성 유효섹션({len(res2['kept'])})<1차({len(res['kept'])}) → 1차 유효섹션 유지")
        if res["invalid"]:
            logger.info(f"[QUOTE-DROP] item_seq={item_seq} 잔존 invalid={len(res['invalid'])} 섹션 제거")
    for f in res["flags"]:
        logger.debug(f"[QUOTE-FLAG] {f['title']}: {f['kind']}")

    sections = res["kept"]
    if not sections:
        # 쓸 만한 발췌가 없음(검증 통과 0) → 근거 미확보 fallback
        fb = _fallback_payload(drug_name, references, safety_block)
        fb["fallback_message"] = data.get("fallback_message") or FALLBACK_TEXT
        return fb

    t_total = time.perf_counter() - t0
    logger.info(
        f"[TIMING] item_seq={item_seq} drug_name={drug_name[:30]} "
        f"sections={len(sections)} total={t_total:.2f}s"
    )

    return {
        "drug_name": drug_name,
        "key_point": data.get("key_point", ""),
        "sections": sections,
        "safety_note": data.get("safety_note", ""),
        "fallback_message": None,
        "is_fallback": False,
        "references": references,
        "disclaimer": DISCLAIMER,
        "safety_block": safety_block,
    }
