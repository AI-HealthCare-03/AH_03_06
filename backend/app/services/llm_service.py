# app/services/llm_service.py
# 복약 가이드 LLM 생성 경로
# - RAG context → format_rag_context → OpenAI Chat Completions → 마크다운 응답
# - 빈 검색 게이트: is_retrieval_empty → FALLBACK_TEXT (LLM 미호출, 비용·환각 차단)
# - 회수약: DB drug_info.is_recalled lookup → safety_block 자동 채움
# - 단계별 timing 로그 출력: [TIMING] item_seq=... retrieve=...s llm=...s

from __future__ import annotations

import time
from typing import Any

from openai import AsyncOpenAI, OpenAI

from app.config import settings
from app.database import SessionLocal
from app.models.drug_info import DrugInfo
from app.utils.rag import prepare_rag_context, prepare_rag_context_async


_openai_client: OpenAI | None = None


def _get_openai_client() -> OpenAI:
    global _openai_client
    if _openai_client is None:
        _openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _openai_client


def is_retrieval_empty(ctx: dict[str, Any]) -> bool:
    """drug_info + drug_detail + guideline 의 retrieved 가 모두 0건이면 True (LLM 호출 차단 게이트)."""
    total = 0
    for d in ctx.get("drug_info_per_med", []):
        total += len(d.get("retrieved", []))
    for d in ctx.get("drug_detail_per_med", []):
        total += len(d.get("retrieved", []))
    total += len(ctx.get("guideline_general", []))
    return total == 0


# 검색 0건 시 결정론적 폴백 (LLM 미호출).
FALLBACK_TEXT = (
    "공식 출처(식약처 e약은요·의약품안전나라, 학회 진료지침)에서 이 약품에 대한 "
    "신뢰할 수 있는 정보를 확보하지 못했습니다. 정확한 복약 안내는 처방받은 의료기관이나 "
    "가까운 약국의 의사·약사와 상담해 주세요. 본 안내는 임의의 약리 지식을 추측해 제공하지 않습니다."
)
DISCLAIMER = "본 가이드는 일반적인 건강 정보 제공이며, 의학적 진단·처방·치료를 대체하지 않습니다."


# 생성용 SYSTEM_PROMPT.
# 안전성 알림·면책은 별도 응답 필드로 표시되므로 본문 미포함 (스캐폴딩 누출·중복 차단).
GUIDE_SYSTEM_PROMPT = """당신은 식품의약품안전처 의약품개요정보(e약은요), 의약품 제품허가 상세정보(식약처 nedrug), 학회 임상진료지침을 참고하여 사용자에게 복약 안내 가이드를 제공하는 한국어 AI 어시스턴트이다.

## 핵심 원칙 (최우선)

### 1. 검색 결과 외 정보 절대 금지 (환각 차단)

제공된 RAG 컨텍스트(drug_info_per_med, drug_detail_per_med, guideline_general)에 명시된 내용만 사용한다. 다음과 같은 환각 사례를 엄격히 금지한다:

- [금지 예시 1] 검색 결과에 부작용 정보가 없는데 "일반적으로 항히스타민제는 졸림·입 마름·어지러움을 일으킬 수 있습니다" 같은 일반 약리학 지식을 추가
- [금지 예시 2] 검색 결과에 없는 약물 상호작용·금기·용량 정보를 사전 지식으로 보충
- [금지 예시 3] "메트포르민은 유산산증·소화장애·비타민 B12 결핍 부작용이 있습니다" 같은 검색 미인용 사실을 추가

사전 지식만으로 약물명·용량·금기·부작용·상호작용·이상반응 등 사실 정보를 추가하지 않는다. 검색 결과가 부족하면 부족함을 명시하고 의료기관·약국 상담을 권한다.

### 2. 출력 형식: 원본 발췌 + 짧은 자연어 보충 (혼합 인용)

각 사실 정보는 검색 결과의 원문을 발췌(직접 인용 부호 안에 표시)하고, 그 아래에 1~2문장의 짧은 일반 한국어 보충 설명을 덧붙인다. 보충 설명은 발췌 내용을 풀어 쓰는 수준으로만 작성하고 새 사실을 추가하지 않는다. 보충 설명(풀이)은 발췌의 적용 범위를 유지한다 — 특정 환자군·조건 한정 발췌는 풀이에서도 그 범위를 명시하고 약 전체로 일반화하지 않는다.

**풀이 범위·양태 보존**: 풀이는 쉽게 바꾸되, 원문보다 범위를 넓히거나 확신을 강하게 만들지 않는다.
- 원문이 구체적으로 나열한 대상(약물 계열·조건·환자군)을 "여러/다양한/모든/등"으로 뭉개지 않는다. 너무 길면 "원문에 나열된 특정 약물 계열"처럼 '일부 한정'임을 드러내되 '여러 약물'로 넓히지 않는다.
- 원문의 양태(확신 수준)를 유지한다. 연구·관찰 표현("~한 경우 안전하였다", "~로 보고되었다", "~할 수 있다")을 일반 단정("안전합니다", "~됩니다")으로 강화하지 않는다.
- 상호작용·병용 안전성은 "함께 써도 안전합니다" 식으로 단정하지 않는다. 원문의 구체 계열·연구 맥락을 유지하고 그 밖의 병용은 의사·약사 상의로 안내한다.

[나쁜 예] "…질산염 제제와 병용 시 안전하였다." → "이 약은 여러 다른 약물과 함께 사용해도 안전합니다." (일반화+단정 — 금지)
[좋은 예 — 결 예시일 뿐] → "연구에서 티아지드계 이뇨제·알파/베타차단제·ACE 저해제·질산염 제제와 함께 썼을 때 안전성이 확인되었습니다. 그 밖의 약과 같이 드실 때는 의사·약사와 상의하세요."

**발췌 시 띄어쓰기 복원**: 청크 원본은 식약처 문서를 텍스트 추출한 것이라 띄어쓰기가 빠진 경우가 많다(예: "이약에과민증환자", "혈장농도반감기", "4|000mg"). 발췌 인용할 때 **자연스러운 한국어 띄어쓰기로 복원**하고 명백한 표기 깨짐(`|` 등)도 정리한다("이 약에 과민증 환자", "혈장 농도 반감기", "4,000mg"). 단 **단어·숫자·내용은 절대 추가·변경하지 않는다**(환각 차단 원칙 유지).

**발췌 정합성 (인용 부호 안 문장은 청크에 실제 존재해야 함)**:
인용 부호 `"..."` 안의 문장은 **청크 본문에서 그대로 가져온 substring**(띄어쓰기·구두점·표기 깨짐 복원 외 단어 변경 없음)이어야 한다. 다음 변형은 **모두 금지**:

- ❌ **일반화·추상화**: 청크에 "신생아·소아·고령자·혈액투석환자에게 저혈당 유발" → 인용을 `"당뇨병 환자가 아닌 환자에게 저혈당 유발"` 로 변형 (취약군을 한 카테고리로 묶음 — 원본에 없는 표현)
- ❌ **재서술·압축**: 청크의 두 문장을 한 문장으로 합쳐 의역
- ❌ **의미는 같지만 다른 어휘**: "복용을 중단" → "복용을 멈춰" (단어 교체)
- ❌ **청크에 없는 가정·예시 추가**: 원본 "고령자 주의" → `"고령자(65세 이상) 주의"` (괄호 추가)

**발췌 선택 (청크 문장 그대로 + 적용 범위 보존)**:
- 발췌는 청크에 있는 문장 단위로, 청크 문장의 첫 글자와 일치하게 고른다. 단어/문장 중간에서 시작·종료하지 않는다(예: "권장용량"을 "장용량"으로 자르지 말 것).
- 인용 부호 안은 청크에 실제로 있는 문장 그대로다. 청크에 없는 주어·단어를 인용 안에 새로 붙이지 않는다(예: 그 문장에 "암로디핀은"이 없으면 인용 앞에 "암로디핀은"을 지어 넣지 말 것).
- 문장이 주어 없이 시작하면(앞 문장에 주어가 있는 경우 등), 그 주어·대상은 인용 밖 풀이(→)에서 밝힌다. 주어를 보이려고 인용을 변형하지 않는다.
- 주어가 그 문장 안에 이미 들어 있는 발췌가 있으면 그쪽을 우선 고른다.
- 인용 부호 안은 한 글자도 바꾸지 않는다. 같은 뜻의 다른 표현으로 바꾸지 말 것(예: "복용해야 할 경우"를 "복용할 때는"으로 바꾸지 말 것). 풀어 쓰고 싶으면 인용 밖 풀이(→)에서 한다.
- "이런 환자·이들 환자·이 경우·투여 중지 후" 등 지시어가 가리키는 환자군·상황을 같은 문장에 포함한다.
- 특정 환자군 한정 사실을 약 전체 사실처럼 쓰지 않는다("간기능부전 환자에 대한 권장용량은 확립되지 않았다"를 "이 약은 용량이 정해지지 않았다"로 풀지 말 것).
- 사용자가 해당 환자군인지 알 수 없는 소집단 주의는 핵심(최상단)에 올리지 않는다.

LLM 이 풀어 쓰고 싶은 내용은 **인용 부호 밖, 보충 화살표(→) 라인**에서 자유롭게 한다. 인용 부호 안은 청크 그대로(띄어쓰기·표기 깨짐 복원만 허용).

검증 가이드라인: 인용 부호 안 문장을 청크에서 단어 단위로 검색했을 때 거의 일치(공백·구두점 차이 정도)해야 한다. 일치하지 않으면 그 문장을 인용 부호 밖으로 옮겨 보충 형식으로 풀어 쓰거나, 청크의 실제 문장을 다시 인용한다.

[발췌 형식 예시]
> "이 약은 일시적 불면증의 완화에 사용합니다."

→ 일시적인 잠 못 드는 증상 완화에 사용하는 약품입니다.

## 식약처 의약품 안전사용 주의사항 (자연어 통합)

식약처·한국의약품안전관리원의 「의약품 안전사용 주의사항 십계명」에 근거하여, 다음 6가지 권고를 답변에 적절히 통합한다.

1. 의문점은 의사·약사에게 적극적으로 질문할 것을 권유한다.
2. 정해진 용량·용법을 엄격히 준수하도록 안내한다.
3. 보관법과 유통기한 확인을 함께 안내한다 (해당 정보가 검색 결과에 있을 때만).
4. 이상징후 발생 시 신속한 의료기관·약국 상담을 권한다.
5. 증세 호전 시에도 임의로 약 사용을 중단하지 않도록 안내한다.
6. 처방 외 약물 추가 사용은 의사·약사 상의가 필요함을 명시한다.

## 안전성 알림·면책 표시 규칙 (시스템 별도 필드)

안전성 알림(BLOCK/WARN/INFO — 동일성분 중복·회수약·1일 최대량 초과·효능군 중복·노인주의)과 면책 문구는 **시스템이 별도 응답 필드(`safety_block` / `safety_warn` / `safety_info` / `disclaimer`)로 화면에 표시한다.** 본문 답변에 안전성 알림 라인이나 면책 문구를 **포함하지 않는다**(중복·스캐폴딩 누출 방지). `[안전성 알림]`, `🚫`, `⚠️`, `ⓘ 본 가이드는 …` 같은 라벨·텍스트를 응답 본문에 쓰지 말 것.

## 검색 결과 부족 시 응답 패턴

- **drug_info·drug_detail·guideline 모두 0건**:
  - "공식 출처에서 해당 약품의 상세 정보를 확보하지 못했습니다." 명시
  - 식약처 십계명 중 관련 권고만 자연어로 안내
  - 일반 약리학 지식·일반 부작용·일반 상호작용 정보 추측 금지
  - 의료기관·약국 상담 권고로 마무리

- **drug_info·drug_detail 둘 다 0건이고 guideline 만 있을 때**:
  - "해당 약품의 상세 정보가 검색 결과에 포함되지 않았습니다." 명시
  - guideline 발췌만 인용

- **drug_info=0 이지만 drug_detail 이 있을 때** (전문의약품 등 e약은요 미수록 약품에서 매우 흔함 — 노바스크정·인데놀정 등):
  - **반드시 drug_detail 청크에서 발췌·인용**한다. "정보 없음", "확보하지 못했습니다", "검색 결과에 포함되어 있지 않습니다" 같은 회피 오프닝은 **절대 사용 금지**.
  - drug_detail 청크가 사용자 질문(예: 부작용)과 정확히 일치하지 않더라도(예: 검색 결과가 "주의사항"·"용법용량" 필드 위주여도) **그 청크에서 관련 부분을 발췌**하여 답한다. 임상 문헌체 표현이 어려우면 짧은 자연어 보충으로 풀어 쓴다. 단, 물은 주제(예: 부작용) 내용이 청크에 **전혀 없으면** 억지로 만들지 말고 아래 "물은 주제가 검색 결과에 없을 때" 규칙을 따른다.
  - drug_info 부재는 별도로 언급하지 않는다(사용자 입장에서 자연스러운 흐름).

- **청크는 있으나 사용자가 물은 주제가 검색 결과에 없을 때** (예: "부작용"을 물었는데 검색된 청크가 효능·용법뿐):
  - 물은 주제(예: 부작용)가 **검색된 식약처 자료에 없음을 그대로 명시**한다. (예: "검색된 식약처 자료에는 이 약의 부작용 정보가 포함되어 있지 않습니다.")
  - **검색 결과에 없는 사실을 일반 지식으로 절대 메우지 않는다.** "일반적으로 ○○ 계열 약물은 …" 같은 일반화·추정·외부지식 서술은 금지 — 이는 환각이다.
  - 검색에 있는 다른 주제(효능·용법 등)는 발췌·인용해 보조로 안내할 수 있으나, **물은 주제 자체를 지어내지 않는다.**
  - 의료기관·약국 상담 권고로 마무리한다.

## 의학적 단정 회피

- 금지: "약을 OO으로 바꾸세요" → 권장: "약 변경은 의사·약사 상담이 필요합니다"
- 금지: "이 약은 OO병을 치료합니다" → 권장: "OO 증상 관리에 사용됩니다 (검색 결과에 명시된 경우)"
- 금지: "당신의 병명은 OO입니다" → 권장: "수치가 OO 진단 기준 범위에 있습니다. 의료기관 진단이 필요합니다"
- 금지: "다른 약과 함께 써도 안전합니다" → 권장: "연구에서 (원문에 명시된 특정 약물 계열)과 함께 썼을 때 안전성이 확인되었습니다. 그 밖의 병용은 의사·약사와 상의가 필요합니다"

## 출력 구조

본문은 발췌 + 보충 형식으로 **곧장 시작**한다. 헤더 라인이나 스캐폴딩 라벨(`[본문 — …]`, `[안전성 알림]` 등)은 출력하지 않는다. 안전성 알림·면책·출처 목록은 시스템이 검색 결과에서 별도 필드로 표시하므로 본문에 포함하지 않는다.

```
> "원본 발췌"

→ 짧은 자연어 보충 (1~2문장, 새 사실 추가 금지)

> "다음 발췌"

→ 보충 ...

💡 안전사용 안내 (해당 시)
  · 의사·약사 상담 권유
  · 용량·용법 준수 / 보관·유통기한 / 이상징후 대응 등 적절한 권고
```

## 출처 표시 규칙

- 출처·근거 목록은 **본문에 쓰지 않는다.** 시스템이 실제 검색된 청크의 출처를 별도 필드로 표시한다.
- 발췌 인용 부호 `"..."` 안은 청크 원문 그대로 유지하되, 그 뒤에 `— 출처` 같은 출처 꼬리표를 붙이지 않는다.
- `📚 근거` 같은 출처 목록 블록도 본문에 출력하지 않는다.

## 응답 길이·발췌 개수

**발췌 인용은 사용자 질문에 가장 직접 답하는 핵심 2~3개로 제한**한다. 청크에 관련 내용이 더 많더라도 가장 중요한 것부터 골라 2~3개만 인용한다. **발췌 문장 자체는 청크 원문 그대로 유지한다** — 개수를 줄이는 것이지 문장을 자르거나 요약하는 게 아니다(앞의 인용 충실성 규칙 유지).

발췌 선택 우선순위:
1. 사용자 질문 유형(부작용·효능·주의사항·복용법·보관법 등)에 **가장 직접 답하는** 발췌
2. 그 질문과 관련된 안전 정보(금기·중증 위험)
3. 부수 정보(상호작용·일반 권고)는 우선순위 떨어지면 **생략**한다

각 보충 설명(→ 라인)은 **한두 문장**으로 유지한다 — 발췌를 풀어 쓰는 수준, 새 사실 추가 금지.

전체 응답은 **300~500자** 한국어 분량을 목표로 한다(발췌 인용·안전사용 안내 포함). 800자를 넘기지 않는다.

## 자체 검증 (응답 생성 전 점검)

- 답변의 모든 사실 정보가 발췌 인용으로 뒷받침되는가?
- 검색 결과 외 일반 약리학 지식·일반 부작용·일반 상호작용을 추가하지 않았는가?
- 회피 표현을 사용하지 않았는가?
- **안전성 알림·면책 문구를 본문에 포함하지 않았는가?** (시스템 별도 필드로 표시)
- **`[본문 — …]`, `[안전성 알림]` 같은 스캐폴딩 라벨이 응답에 들어가지 않았는가?**
- **인용 부호 `"..."` 안의 모든 문장이 청크 본문의 substring 인가?** (띄어쓰기·표기 깨짐 복원 외 단어·표현 변경 금지. 일반화·추상화·재서술 금지)
- **발췌가 청크 문장의 시작과 일치하는 완전한 문장(들)인가?** 문장 중간 시작 금지(예: "권장용량"→"장용량").
- **특정 환자군 한정 내용을 약 전체로 일반화하지 않고, 지시어가 가리키는 조건을 발췌·풀이에 포함했는가?**
- 인용 안에 청크에 없는 주어·단어를 새로 붙이지 않았는가? (주어가 필요하면 인용 밖 풀이에서 밝힌다)
- 원문이 구체적으로 나열한 것(약물 계열 등)을 "여러/다양한/모든"으로 일반화하지 않았는가?
- 연구·관찰 표현을 일반 단정으로 바꾸거나, 병용·상호작용을 "안전합니다"로 단정하지 않았는가?
- **발췌 개수가 2~3개 이내인가?** (사용자 질문에 가장 직접 답하는 것 우선, 부수 정보 생략)
- **본문에 출처 꼬리표(`— 출처`)나 `📚 근거` 블록을 넣지 않았는가?** (출처는 시스템이 별도 필드로 표시)

점검 결과 미흡한 부분이 있으면 응답을 수정한 후 출력한다.
"""


def format_safety_alerts(safety: dict[str, Any] | None) -> str:
    """safety dict → 알림 텍스트 (BLOCK·WARN·INFO 우선순위 순)."""
    if not safety:
        return ""
    parts: list[str] = []

    if safety.get("duplicates_ingredient"):
        for a in safety["duplicates_ingredient"]:
            parts.append(f"🚫 동일 성분 중복: {a.get('message', '')}")
    if safety.get("recall_warnings"):
        for a in safety["recall_warnings"]:
            parts.append(f"🚫 회수약 알림: {a.get('message', '')}")
    if safety.get("dose_exceeded"):
        for a in safety["dose_exceeded"]:
            parts.append(f"⚠️ 1일 최대량 초과: {a.get('message', '')}")
    if safety.get("duplicates_efficacy"):
        for a in safety["duplicates_efficacy"]:
            parts.append(f"⚠️ 효능군 중복: {a.get('message', '')}")
    if safety.get("elderly_cautions"):
        for a in safety["elderly_cautions"]:
            parts.append(f"ⓘ 노인주의: {a.get('message', '')}")

    return "\n".join(parts)


def _collect_references(ctx: dict[str, Any]) -> list[str]:
    """검색 hit 의 metadata['source'] 만 모아 순서 보존 dedupe → 출처 목록.

    LLM 본문 출력이 아니라 RAG 검색 결과에서 직접 조립한다(창작·병합 없음).
    drug_info(e약은요)·drug_detail(nedrug)는 컬렉션 공통 source 라 각 1건으로 모이고,
    guideline 은 지침별 source 가 구분된다. 검색 0건이면 빈 리스트.
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
    """RAG context dict → LLM user 메시지 텍스트.

    섹션 순서: 환자·약품·쿼리 → 안전성 → drug_info → drug_detail → guideline.
    약품 단위 정보(drug_info + drug_detail)는 인접 배치 — e약은요 없고 nedrug 만 있는
    약품에서 LLM 이 "정보 없음" 으로 회피하는 패턴을 줄이기 위함.
    """
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

    safety = ctx.get("safety") or {}
    summary = safety.get("summary", {})
    lines.append(
        f"\n[안전성 검증 결과] total={summary.get('total_alerts', 0)}, "
        f"block={summary.get('block_count', 0)}, "
        f"warn={summary.get('warn_count', 0)}, "
        f"info={summary.get('info_count', 0)}"
    )
    alert_text = format_safety_alerts(safety)
    if alert_text:
        lines.append(alert_text)

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
            sim = r["similarity"]
            content = r["content"]
            lines.append(f"  [{field} sim={sim}] {content}")

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
                sim = r["similarity"]
                content = r["content"]
                lines.append(f"  [{field} sim={sim}] {content}")

    lines.append("\n[guideline 검색 결과 (학회 진료지침)]")
    guideline = ctx.get("guideline_general") or []
    if not guideline:
        lines.append("(검색 결과 0건)")
    for r in guideline:
        pub = r["metadata"].get("publisher", "?")
        idx = r["metadata"].get("chunk_idx", "?")
        sim = r["similarity"]
        content = r["content"]
        lines.append(f"  [{pub} chunk {idx} sim={sim}] {content}")

    return "\n".join(lines)


def generate_markdown(ctx: dict[str, Any]) -> str:
    """RAG ctx → OpenAI Chat Completions → 마크다운 응답 (모델·온도는 settings)."""
    client = _get_openai_client()
    resp = client.chat.completions.create(
        model=settings.GENERATION_MODEL,
        temperature=settings.GENERATION_TEMPERATURE,
        messages=[
            {"role": "system", "content": GUIDE_SYSTEM_PROMPT},
            {"role": "user", "content": format_rag_context(ctx)},
        ],
    )
    return resp.choices[0].message.content


def _lookup_recall_warning(item_seq: str) -> str | None:
    """drug_info.is_recalled 기반 회수약 메시지 (🚫 포맷). 회수약 아니면 None.

    추후 03 safety_check_all 통합 슬라이스에서 흡수 예정 (DUR 5종 alert 의 일부).
    """
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


def generate_guide_for_drug(
    item_seq: str,
    drug_name: str = "",
    user_query: str | None = None,
    patient: dict[str, Any] | None = None,
    safety: dict[str, Any] | None = None,
    top_k: int = 3,
) -> dict[str, Any]:
    """item_seq 한 건의 가이드 페이로드 생성 오케스트레이션.

    검색 0건이면 LLM 미호출 (FALLBACK_TEXT). 회수약은 DB lookup → safety_block 자동 채움.
    references 는 검색 hit 의 출처(metadata.source)에서 조립. safety_warn/info/recommendations 는 DUR 연결 슬라이스에서 채워짐.
    """
    # 단계별 timing 측정 (로그만, 동작·응답 무관)
    t0 = time.perf_counter()
    ctx = prepare_rag_context(
        [{"item_seq": str(item_seq), "drug_name": drug_name}],
        patient=patient,
        user_query=user_query,
        safety=safety,
        top_k=top_k,
    )
    t_retrieve = time.perf_counter() - t0

    t1 = time.perf_counter()
    gate_empty = is_retrieval_empty(ctx)
    t_gate = time.perf_counter() - t1

    t2 = time.perf_counter()
    if gate_empty:
        main_content, is_fallback = FALLBACK_TEXT, True  # LLM 미호출
    else:
        main_content, is_fallback = generate_markdown(ctx), False
    t_llm = time.perf_counter() - t2

    # 회수약 alert — DB lookup. 프론트가 빨강 BLOCK 카드로 표시 (본문 중복 방지)
    safety_block = _lookup_recall_warning(str(item_seq)) if item_seq else None

    t_total = time.perf_counter() - t0
    print(
        f"[TIMING] item_seq={item_seq} drug_name={drug_name[:30]} "
        f"retrieve={t_retrieve:.2f}s gate={t_gate:.3f}s "
        f"llm={t_llm:.2f}s total={t_total:.2f}s "
        f"(fallback={is_fallback})",
        flush=True,
    )

    return {
        "drug_name": drug_name,
        "main_content": main_content,
        "is_fallback": is_fallback,
        "disclaimer": DISCLAIMER,
        "references": _collect_references(ctx),
        "safety_block": safety_block,
        "safety_warn": None,
        "safety_info": None,
        "safety_recommendations": None,
    }


# stream 변종 — /preview-stream 핸들러의 인프라.
# generate_markdown_stream: chat.completions stream=True. 토큰 청크 yield.
# generate_guide_for_drug_stream: meta → token (반복) → done 의 dict 이벤트 시퀀스 yield.
#                                 게이트 발동 시 단발 (FALLBACK_TEXT 한 번에 yield, LLM 미호출).
# sync/async 변종 모두 보존. is_retrieval_empty 와 _lookup_recall_warning 호출 위치·결과 동일.
async def generate_markdown_stream(ctx: dict[str, Any]):
    """generate_markdown_async 의 stream 변종 — 토큰 청크를 비동기 yield."""
    client = _get_async_openai_client()
    stream = await client.chat.completions.create(
        model=settings.GENERATION_MODEL,
        temperature=settings.GENERATION_TEMPERATURE,
        messages=[
            {"role": "system", "content": GUIDE_SYSTEM_PROMPT},
            {"role": "user", "content": format_rag_context(ctx)},
        ],
        stream=True,
    )
    async for chunk in stream:
        try:
            delta = chunk.choices[0].delta.content
        except (IndexError, AttributeError):
            continue
        if delta:
            yield delta


async def generate_guide_for_drug_stream(
    item_seq: str,
    drug_name: str = "",
    user_query: str | None = None,
    patient: dict[str, Any] | None = None,
    safety: dict[str, Any] | None = None,
    top_k: int = 3,
):
    """generate_guide_for_drug_async 의 stream 변종.

    yield 순서:
        1. meta  — drug_name, is_fallback, safety_block, disclaimer, references, safety_*.
                   safety_block 빨강 BLOCK 카드를 토큰 도착 전에 즉시 표시할 수 있도록 첫 이벤트로 전송.
        2. token — 본문 청크. 정상 케이스는 generate_markdown_stream 의 청크 반복.
                   거절 케이스(게이트 발동)는 FALLBACK_TEXT 한 번에 (LLM 미호출).
        3. done  — 종료 신호.

    is_retrieval_empty 게이트와 _lookup_recall_warning 은 sync/async 변종과 동일하게 호출 — 판단 로직 보존.
    """
    t0 = time.perf_counter()
    ctx = await prepare_rag_context_async(
        [{"item_seq": str(item_seq), "drug_name": drug_name}],
        patient=patient,
        user_query=user_query,
        safety=safety,
        top_k=top_k,
    )
    t_retrieve = time.perf_counter() - t0

    gate_empty = is_retrieval_empty(ctx)
    safety_block = _lookup_recall_warning(str(item_seq)) if item_seq else None

    yield {
        "type": "meta",
        "drug_name": drug_name,
        "is_fallback": gate_empty,
        "disclaimer": DISCLAIMER,
        "references": _collect_references(ctx),
        "safety_block": safety_block,
        "safety_warn": None,
        "safety_info": None,
        "safety_recommendations": None,
    }

    t2 = time.perf_counter()
    token_count = 0
    if gate_empty:
        yield {"type": "token", "text": FALLBACK_TEXT}
        token_count = 1
    else:
        async for delta in generate_markdown_stream(ctx):
            yield {"type": "token", "text": delta}
            token_count += 1
    t_llm = time.perf_counter() - t2

    yield {"type": "done"}

    t_total = time.perf_counter() - t0
    print(
        f"[TIMING-STREAM] item_seq={item_seq} drug_name={drug_name[:30]} "
        f"retrieve={t_retrieve:.2f}s llm={t_llm:.2f}s total={t_total:.2f}s "
        f"tokens={token_count} (fallback={gate_empty})",
        flush=True,
    )


# async 변종 — /preview 핸들러 async 전환 슬라이스의 인프라
# sync 함수는 모두 보존. is_retrieval_empty 게이트와 _lookup_recall_warning 은
# sync 그대로 호출(판단 로직 보존). 호출 방식만 await 로 바뀜.
_async_openai_client: AsyncOpenAI | None = None


def _get_async_openai_client() -> AsyncOpenAI:
    global _async_openai_client
    if _async_openai_client is None:
        _async_openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _async_openai_client


async def generate_markdown_async(ctx: dict[str, Any]) -> str:
    """generate_markdown 의 async 변종. stream 미사용(별도 슬라이스)."""
    client = _get_async_openai_client()
    resp = await client.chat.completions.create(
        model=settings.GENERATION_MODEL,
        temperature=settings.GENERATION_TEMPERATURE,
        messages=[
            {"role": "system", "content": GUIDE_SYSTEM_PROMPT},
            {"role": "user", "content": format_rag_context(ctx)},
        ],
    )
    return resp.choices[0].message.content


async def generate_guide_for_drug_async(
    item_seq: str,
    drug_name: str = "",
    user_query: str | None = None,
    patient: dict[str, Any] | None = None,
    safety: dict[str, Any] | None = None,
    top_k: int = 3,
) -> dict[str, Any]:
    """generate_guide_for_drug 의 async 변종.

    sync 변종과 동일한 dict 를 반환. 차이는 호출 방식뿐:
        - prepare_rag_context_async (임베딩 3회 동시)
        - generate_markdown_async (chat completions await, stream 미사용)
    is_retrieval_empty 게이트와 _lookup_recall_warning 은 sync 그대로 호출.
    """
    t0 = time.perf_counter()
    ctx = await prepare_rag_context_async(
        [{"item_seq": str(item_seq), "drug_name": drug_name}],
        patient=patient,
        user_query=user_query,
        safety=safety,
        top_k=top_k,
    )
    t_retrieve = time.perf_counter() - t0

    t1 = time.perf_counter()
    gate_empty = is_retrieval_empty(ctx)
    t_gate = time.perf_counter() - t1

    t2 = time.perf_counter()
    if gate_empty:
        main_content, is_fallback = FALLBACK_TEXT, True
    else:
        main_content, is_fallback = await generate_markdown_async(ctx), False
    t_llm = time.perf_counter() - t2

    safety_block = _lookup_recall_warning(str(item_seq)) if item_seq else None

    t_total = time.perf_counter() - t0
    print(
        f"[TIMING-ASYNC] item_seq={item_seq} drug_name={drug_name[:30]} "
        f"retrieve={t_retrieve:.2f}s gate={t_gate:.3f}s "
        f"llm={t_llm:.2f}s total={t_total:.2f}s "
        f"(fallback={is_fallback})",
        flush=True,
    )

    return {
        "drug_name": drug_name,
        "main_content": main_content,
        "is_fallback": is_fallback,
        "disclaimer": DISCLAIMER,
        "references": _collect_references(ctx),
        "safety_block": safety_block,
        "safety_warn": None,
        "safety_info": None,
        "safety_recommendations": None,
    }
