"""수면 가이드 LLM 생성 서비스.

흐름:
  1. SleepSurveyResponse 입력 → sleep_classifier.classify_all → ClassificationResult
  2. 분류 결과별 RAG 쿼리 선택 (한국어 + 영문 병행, cross-lingual 약함 보강)
  3. sleep_guidelines collection 검색 + 중복 제거
  4. LLM 프롬프트 구성 (시스템 + 사용자 정보 + RAG + 회귀 기대 개선치 + 방해 원인)
  5. OpenAI Chat Completion (gpt-4o-mini, JSON mode) → 7섹션 dict
  6. 응답 검증 + consultation_recommendation 정규화
  7. fallback (RAG 0건 or LLM 실패) — 차분한 거절 응답

반환: (sections_dict, used_sources_set)
  - sections_dict: SleepGuide 컬럼 매핑용 (key_point ~ next_checkup_guide + is_fallback)
  - used_sources_set: SLEEP_GUIDE_GUIDELINE 정션 트레이스용
"""
from __future__ import annotations

import json
from typing import Any, Iterable, Optional

from openai import AsyncOpenAI

from app.config import settings
from app.services import sleep_classifier as sc
from app.utils.rag import retrieve


COLLECTION_NAME = "sleep_guidelines"


# ──────────────────────────── 시스템 프롬프트 ────────────────────────────
# 명세 §5 (수면가이드파이프라인_0508최종.md) 의 작성 규칙을 그대로 반영.
# JSON mode 사용 — content 가 반드시 JSON object.

SYSTEM_PROMPT = """당신은 한국어 수면 건강 코칭 AI 입니다.
임상진료지침(RAG 검색 결과)을 근거로 사용자에게 친근한 수면 가이드를 제공합니다.

## 출력 형식

반드시 다음 7개 키의 JSON 객체로 응답. **모든 값은 단일 문자열(string)** — 배열·중첩 객체 금지:
{
  "key_point": "지금 가장 중요한 포인트 (2~3문장, 단일 문자열)",
  "today_actions": "오늘부터 할 일 3가지를 한 문자열로 — '1. ...\\n2. ...\\n3. ...' 형식. 배열 금지",
  "weekly_goal": "이번 주 수면 목표 — 목표 취침/기상 시각을 HH:MM 으로 명시 (단일 문자열)",
  "coping_strategy": "잠 안 올 때 대처 (2~3문장, 단일 문자열)",
  "lifestyle_adjustment": "생활습관 조정 (흡연·음주·운동·카페인 — 사용자 입력값 직접 인용, 단일 문자열)",
  "consultation_recommendation": "조건부 — 사용자 정보의 consultation_required 가 false 이면 반드시 null. true 일 때만 단일 문자열.",
  "next_checkup_guide": "1주일 뒤 단축 설문 재작성 권유 (한 줄, 단일 문자열)"
}

## 작성 규칙

- 쉬운 한국어를 사용. 전문 용어는 사용자 친화 표현으로 바꿈
- 사용자를 탓하거나 겁주는 표현을 쓰지 않음
- 사용자가 지금 잘 하고 있는 부분 한 가지를 짧게 인정 (예: "규칙적인 기상 시간을 잘 지키고 계세요")
- 사용자가 입력한 카페인 잔수·흡연 여부·음주량·기상 차이·방해 원인 등을 본문에 직접 인용
- 데이터 기반 기대 효과는 분·시간·개비 단위로 (예: "잠드는 시간이 약 5분 단축될 수 있어요")
- "수면효율 X%p" 같은 학술 표현은 본문에 쓰지 않음
- 학회명·DOI·논문 제목은 본문에 쓰지 않음 (자연스러운 코칭 어조)
- RAG 컨텍스트에 명시된 내용만 사용 — 약 이름·용량 등 사실 정보를 추가하지 않음
- 전체 길이는 약 1,200~1,600자

## consultation_recommendation 규칙 (절대 준수)

- 사용자 정보의 `consultation_required` 가 false → 반드시 null
- true → "최근 수면 상태가 평소보다 흐트러져 있는 것으로 보입니다. 다음 증상이 4주 이상 지속되면 수면 전문의 진료를 권합니다 …" 형태
"""


# ──────────────────────────── RAG 쿼리 매핑 ────────────────────────────
# 분류별 검색 쿼리 (한국어 + 영문 병행).
# 영문은 AASM 가이드라인 cross-lingual 매칭 보강용 (한국어 청크가 한국판 임상지침 1종이라
# 한국어 쿼리만 쓰면 AASM 3종 청크가 거의 활용 안 됨 — verify_sleep_rag 결과 근거).

SEARCH_QUERIES_BY_CONDITION = {
    "sleep_hours": [
        "수면 부족 권장 수면시간 성인 수면 위생",
        "short sleep duration health risks recommended sleep adult",
    ],
    "rhythm_diff": [
        "사회적 시차 주말 늦잠 일주기 리듬 조정",
        "social jet lag circadian rhythm sleep wake schedule",
    ],
    "brief_survey": [
        "만성 불면증 인지행동치료 자극통제 수면제한",
        "chronic insomnia CBT-I stimulus control sleep restriction",
    ],
    "ess": [
        "주간 졸림 ESS 평가 수면 호흡 장애",
        "excessive daytime sleepiness Epworth evaluation",
    ],
    "general_hygiene": [
        "수면 위생 카페인 알코올 운동 침실 환경",
        "sleep hygiene caffeine alcohol exercise bedroom environment",
    ],
}


def select_queries(result: sc.ClassificationResult) -> list[str]:
    """분류 결과 → 검색할 쿼리 리스트. 위험·주의 항목별 + 일반 위생 항상 포함."""
    queries: list[str] = []
    if result.sleep_hours_class > 0:
        queries.extend(SEARCH_QUERIES_BY_CONDITION["sleep_hours"])
    if result.rhythm_diff_class > 0:
        queries.extend(SEARCH_QUERIES_BY_CONDITION["rhythm_diff"])
    if result.brief_survey_class > 0:
        queries.extend(SEARCH_QUERIES_BY_CONDITION["brief_survey"])
    if result.ess_class is not None and result.ess_class > 0:
        queries.extend(SEARCH_QUERIES_BY_CONDITION["ess"])
    queries.extend(SEARCH_QUERIES_BY_CONDITION["general_hygiene"])
    return queries


# ──────────────────────────── RAG 검색 ────────────────────────────

def retrieve_sleep_context(
    queries: list[str],
    top_k_per_query: int = 3,
    threshold: float = 0.25,  # 0.3 → 0.25 (한↔영 cross-lingual 약함 보완)
) -> tuple[list[dict[str, Any]], set[str]]:
    """여러 쿼리 결과 합치고 중복 제거. (chunks, sources) 반환."""
    all_chunks: list[dict[str, Any]] = []
    seen_content: set[str] = set()
    sources: set[str] = set()

    for q in queries:
        results = retrieve(
            q, collection_name=COLLECTION_NAME, top_k=top_k_per_query, threshold=threshold
        )
        for r in results:
            key = r["content"][:80]
            if key in seen_content:
                continue
            seen_content.add(key)
            all_chunks.append(r)
            sources.add(r["metadata"].get("source", "?"))

    return all_chunks, sources


def is_retrieval_empty(chunks: list[dict[str, Any]]) -> bool:
    return len(chunks) == 0


# ──────────────────────────── 회귀 기대 개선치 ────────────────────────────
# guide_score_formula.GUIDE_RECOMMENDATIONS 를 사용자 친화 텍스트로 변환.

def build_improvement_hints(user_info: dict[str, Any]) -> list[str]:
    """유의한 변수(smoking·alcohol·exercise) 중 사용자 상태에 따라 권고 텍스트."""
    hints: list[str] = []
    if user_info.get("smoking_status") == 1:
        hints.append("금연 시 잠드는 시간이 약 5분 단축되는 데 도움이 될 수 있어요 (수면 효율 +약 8%p)")
    if user_info.get("alcohol_status") == 1:
        hints.append("음주 1잔 줄이기 시 새벽 각성이 줄어들 수 있어요 (수면 효율 +약 3%p)")
    hints.append("운동 1회/주 늘리기 시 깊은 수면이 늘어나는 데 도움이 됩니다 (수면 효율 +약 2%p)")
    return hints


# ──────────────────────────── 사용자 프롬프트 ────────────────────────────

def build_user_prompt(
    *,
    classification: sc.ClassificationResult,
    user_info: dict[str, Any],
    caffeine_entries_label: list[str],
    disturbance_causes: list[str],
    rag_chunks: list[dict[str, Any]],
) -> str:
    """LLM 호출 시 user role 본문."""
    cause_text = ", ".join(disturbance_causes) if disturbance_causes else "특별히 호소하지 않음"
    caffeine_label = ", ".join(caffeine_entries_label) if caffeine_entries_label else "없음"
    improvements = build_improvement_hints(user_info)

    # RAG 청크 — 상위 10개만 (토큰 절약)
    rag_text = "\n\n".join(
        f"[근거 {i+1}] {ch['metadata'].get('source', '?')}:\n{ch['content']}"
        for i, ch in enumerate(rag_chunks[:10])
    )

    class_label = {0: "정상", 1: "주의", 2: "위험"}
    ess_class_str = class_label.get(classification.ess_class, "미입력") if classification.ess_class is not None else "미입력"

    return f"""[사용자 정보]
나이: {user_info.get('age', '미입력')}대 / 성별: {user_info.get('gender_label', '미입력')}
수면시간 가중평균: {classification.sleep_hours_avg}h ({class_label[classification.sleep_hours_class]})
사회적 시차: {classification.rhythm_diff_hours}h ({class_label[classification.rhythm_diff_class]})
단축 설문 합계: {classification.brief_survey_total_score}/15 ({class_label[classification.brief_survey_class]})
ESS 합계: {classification.ess_score}/24 ({ess_class_str})
종합 위험 단계: {class_label[classification.overall_status]}
카페인 섭취: {classification.caffeine_mg_daily} mg/일 ({caffeine_label})
흡연: {user_info.get('smoking_status_label', '미입력')}
음주: {user_info.get('alcohol_status_label', '미입력')}
사용자가 호소한 방해 원인: {cause_text}
상담 권장 여부: {classification.consultation_required} (사유: {classification.consultation_reasons})

[데이터 기반 기대 개선치 — 본문에 자연스럽게 녹여 작성]
{chr(10).join(f'- {h}' for h in improvements)}

[RAG 근거 청크]
{rag_text}

[지시]
위 정보를 바탕으로 사용자 맞춤 수면 가이드를 작성해주세요.
출력은 반드시 7개 키의 JSON 객체로. consultation_recommendation 은 상담 권장 여부가 true 일 때만 텍스트, false 면 null.
"""


# ──────────────────────────── Fallback ────────────────────────────

def _make_fallback_response(classification: sc.ClassificationResult) -> dict[str, Any]:
    """RAG 0건 or LLM 실패 시 차분한 거절 응답.

    명세상 fallback 은 일반 수면 위생 안내 + 상담 권장 (조건 충족 시).
    """
    return {
        "key_point": (
            "공식 임상지침에서 이번 입력에 정확히 맞는 자료를 찾지 못해, "
            "일반적인 수면 위생 안내만 드릴 수 있어요. 정확한 평가는 의료기관 상담을 권합니다."
        ),
        "today_actions": (
            "1. 매일 같은 시각에 잠자리에 들고 같은 시각에 일어나기\n"
            "2. 취침 1시간 전에는 휴대폰·TV 멀리하기\n"
            "3. 카페인 음료는 오후 2시 이전까지만"
        ),
        "weekly_goal": "일주일간 일정한 취침·기상 시각 유지하기",
        "coping_strategy": (
            "잠자리에 누워 20분 이상 잠이 오지 않으면 일어나 조용한 활동을 하다가 "
            "졸리면 다시 침대로 돌아가세요."
        ),
        "lifestyle_adjustment": "수면 위생의 기본은 일정한 리듬·적절한 환경·카페인·알코올 절제예요.",
        "consultation_recommendation": (
            "최근 수면 상태가 평소보다 많이 흐트러져 있는 것으로 보입니다. "
            "4주 이상 지속되면 수면 전문의 진료를 권합니다."
            if classification.consultation_required else None
        ),
        "next_checkup_guide": "1주일 뒤 다시 단축 설문을 작성해 변화를 확인해보세요.",
        "is_fallback": True,
    }


# ──────────────────────────── OpenAI 호출 ────────────────────────────

_async_openai_client: Optional[AsyncOpenAI] = None


def _get_async_openai_client() -> AsyncOpenAI:
    global _async_openai_client
    if _async_openai_client is None:
        _async_openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _async_openai_client


async def _call_llm(system_prompt: str, user_prompt: str) -> dict[str, Any]:
    """OpenAI Chat Completion (gpt-4o-mini, JSON mode)."""
    client = _get_async_openai_client()
    resp = await client.chat.completions.create(
        model=settings.GENERATION_MODEL,
        temperature=settings.GENERATION_TEMPERATURE,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )
    content = resp.choices[0].message.content or "{}"
    return json.loads(content)


# ──────────────────────────── 메인 진입점 ────────────────────────────

REQUIRED_KEYS = (
    "key_point", "today_actions", "weekly_goal", "coping_strategy",
    "lifestyle_adjustment", "next_checkup_guide",
)

# 모든 본문 키 (consultation_recommendation 포함)
TEXT_KEYS = REQUIRED_KEYS + ("consultation_recommendation",)


def _normalize_to_string(val: Any) -> Optional[str]:
    """LLM 응답 값을 string 으로 정규화.

    DB 컬럼이 TEXT 라 list/dict 가 오면 직렬화 필요.
    list: '1. X\n2. Y' 형태 numbered string (today_actions 등).
    None: 그대로 None.
    str: 그대로.
    """
    if val is None:
        return None
    if isinstance(val, str):
        return val
    if isinstance(val, list):
        # 이미 번호 있으면 그대로, 없으면 1. 2. 3. 부여
        items = [str(item).strip() for item in val if str(item).strip()]
        if not items:
            return None
        if any(item.startswith(("1.", "1)", "①", "-", "•")) for item in items):
            return "\n".join(items)
        return "\n".join(f"{i+1}. {item}" for i, item in enumerate(items))
    # dict 등 기타는 str() 변환
    return str(val)


async def generate_sleep_guide_async(
    *,
    classification: sc.ClassificationResult,
    user_info: dict[str, Any],
    caffeine_entries_label: Iterable[str] = (),
    disturbance_causes: Iterable[str] = (),
) -> tuple[dict[str, Any], set[str]]:
    """수면 가이드 생성 — 분류 결과 + 사용자 정보 → 7섹션 + 참고 sources.

    user_info 예시:
        {"age": 30, "gender_label": "남", "smoking_status": 0, "alcohol_status": 1,
         "smoking_status_label": "비흡연", "alcohol_status_label": "음주"}
    """
    caffeine_labels = list(caffeine_entries_label)
    causes = list(disturbance_causes)

    # 1. RAG 쿼리 선택 + 검색
    queries = select_queries(classification)
    rag_chunks, sources = retrieve_sleep_context(queries)

    # 2. 게이트 — RAG 0건 시 fallback (LLM 호출 회피, 환각 차단)
    if is_retrieval_empty(rag_chunks):
        return _make_fallback_response(classification), set()

    # 3. 프롬프트 구성
    user_prompt = build_user_prompt(
        classification=classification,
        user_info=user_info,
        caffeine_entries_label=caffeine_labels,
        disturbance_causes=causes,
        rag_chunks=rag_chunks,
    )

    # 4. LLM 호출 (실패 시 fallback)
    try:
        response = await _call_llm(SYSTEM_PROMPT, user_prompt)
    except Exception as e:
        print(f"[sleep_llm] LLM 호출 실패 → fallback: {e}")
        return _make_fallback_response(classification), set()

    # 5. 필수 키 검증
    if not all(k in response for k in REQUIRED_KEYS):
        print(f"[sleep_llm] 응답 필수 키 누락 → fallback. 받은 키: {list(response.keys())}")
        return _make_fallback_response(classification), set()

    # 6. 모든 텍스트 필드 string 정규화 (LLM 이 list 로 보내는 경우 대응)
    for k in TEXT_KEYS:
        if k in response:
            response[k] = _normalize_to_string(response[k])

    # 7. consultation_recommendation 정규화 (조건 안 맞으면 null)
    if not classification.consultation_required:
        response["consultation_recommendation"] = None
    elif not response.get("consultation_recommendation"):
        # 조건 맞는데 LLM 이 빠뜨린 경우 기본 텍스트 보강
        response["consultation_recommendation"] = (
            "최근 수면 상태가 평소보다 많이 흐트러져 있는 것으로 보입니다. "
            "4주 이상 지속되면 수면 전문의 진료를 권합니다."
        )

    response["is_fallback"] = False
    return response, sources
