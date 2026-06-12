# app/utils/rag.py
# RAG 검색 유틸
# - get_chroma_client(): 모듈 캐시된 PersistentClient
# - embed_query(text): OpenAI text-embedding-3-small 임베딩 (Chroma의 자동 임베딩 미사용)
# - retrieve(query, collection_name, top_k, where): 04 노트북과 동일한 정규화 결과

from __future__ import annotations

import asyncio
from typing import Any

import chromadb
from openai import AsyncOpenAI, OpenAI

from app.config import settings


_chroma_exercise_client: chromadb.api.ClientAPI | None = None
_chroma_diet_client: chromadb.api.ClientAPI | None = None
_chroma_medication_client: chromadb.api.ClientAPI | None = None
_openai_client: OpenAI | None = None

# EMBEDDING_MODEL 은 settings.EMBEDDING_MODEL 로 이동 (배포 전환 대비).
#   - 개발: text-embedding-3-small (현재 chroma_db 임베딩 기준 모델)
#   - 배포: text-embedding-3-large 로 전환 시 chroma_db 전체 재구축 필요

# 한국어 임베딩은 관련 매치도 유사도가 낮게 나옴(노트북 cell 18 근거).
# 소스별 튜닝 여지를 위해 호출 시 threshold 인자로 덮어쓸 수 있게 둔다.
SIMILARITY_THRESHOLD = 0.3


def get_chroma_exercise_client() -> chromadb.api.ClientAPI:
    global _chroma_exercise_client
    if _chroma_exercise_client is None:
        _chroma_exercise_client = chromadb.PersistentClient(
            path=settings.CHROMA_EXERCISE_DIR
        )
    return _chroma_exercise_client

def get_chroma_diet_client() -> chromadb.api.ClientAPI:
    global _chroma_diet_client
    if _chroma_diet_client is None:
        _chroma_diet_client = chromadb.PersistentClient(
            path=settings.CHROMA_DIET_DIR
        )
    return _chroma_diet_client

def get_chroma_medication_client() -> chromadb.api.ClientAPI:
    global _chroma_medication_client
    if _chroma_medication_client is None:
        _chroma_medication_client = chromadb.PersistentClient(
            path=settings.CHROMA_MEDICATION_DIR
        )
    return _chroma_medication_client


def _get_openai_client() -> OpenAI:
    global _openai_client
    if _openai_client is None:
        _openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _openai_client


def embed_query(text: str) -> list[float]:
    client = _get_openai_client()
    resp = client.embeddings.create(model=settings.EMBEDDING_MODEL, input=text)
    return resp.data[0].embedding


def retrieve(
    query: str,
    collection_name: str,
    top_k: int = 3,
    where: dict[str, Any] | None = None,
    threshold: float = SIMILARITY_THRESHOLD,
) -> list[dict[str, Any]]:
    # query_texts 는 의도적으로 사용하지 않음 — Chroma 기본 임베더와
    # text-embedding-3-small 의 차원이 달라 컬렉션과 불일치를 일으킴.
    collection = get_chroma_client().get_collection(name=collection_name)
    vec = embed_query(query)

    kwargs: dict[str, Any] = {"query_embeddings": [vec], "n_results": top_k}
    if where:
        kwargs["where"] = where
    raw = collection.query(**kwargs)

    docs = (raw.get("documents") or [[]])[0]
    metas = (raw.get("metadatas") or [[]])[0]
    dists = (raw.get("distances") or [[]])[0]

    results: list[dict[str, Any]] = []
    for content, metadata, distance in zip(docs, metas, dists):
        sim = 1.0 - float(distance)
        if sim < threshold:
            continue
        results.append(
            {
                "content": content,
                "metadata": metadata or {},
                "similarity": round(sim, 3),
            }
        )
    return results


def retrieve_drug_info(
    query: str,
    item_seq: Any,
    top_k: int = 3,
    threshold: float = 0.0,
) -> dict[str, Any]:
    # 04 노트북 prepare_rag_context 패턴: drug_info_rag 와 drug_detail_rag 를
    # 같은 item_seq 로 필터링해 한 약품 안에서만 검색한다.
    # 학회 진료지침(guideline_rag)은 약 단위가 아니라 주제 단위라 이 헬퍼에
    # 넣지 않는다. 필요 시 retrieve(query, 'guideline_rag', ...) 로 별도 호출.
    #
    # threshold 기본값을 0.0 으로 둠 — item_seq 필터로 약품이 이미 한정된 상태에선
    # 같은 약품 내 청크가 일반적으로 무관하지 않으므로 SIMILARITY_THRESHOLD(0.3) 게이트가
    # 과도하게 보수적이다(예: "주의사항이 있나요?" 쿼리는 노바스크 청크와 sim 0.26~0.28
    # 로 매칭되는데 0.3 게이트에 모두 차단됨). guideline_rag retrieve 의 0.3 게이트는
    # 그대로 유지(검색 범위가 약품 단위가 아니므로 무관 결과 발생 가능).
    if not item_seq:
        return {"item_seq": "", "drug_info": [], "drug_detail": []}

    # chroma 메타데이터의 item_seq 는 항상 문자열('202005623')로 저장됨.
    seq = str(item_seq)

    drug_info = retrieve(
        query, "drug_info_rag",
        top_k=top_k, where={"item_seq": seq}, threshold=threshold,
    )
    # drug_detail_rag 는 식약처 nedrug PDF 커버리지 한계로 해당 item_seq 가
    # 없을 수 있음 — 빈 결과여도 정상 동작.
    drug_detail = retrieve(
        query, "drug_detail_rag",
        top_k=top_k, where={"item_seq": seq}, threshold=threshold,
    )
    return {"item_seq": seq, "drug_info": drug_info, "drug_detail": drug_detail}


def prepare_rag_context(
    medications: list[dict[str, Any]],
    patient: dict[str, Any] | None = None,
    user_query: str | None = None,
    safety: dict[str, Any] | None = None,
    top_k: int = 3,
) -> dict[str, Any]:
    # 04 노트북 cell 20(v1) + cell 38(v2 drug_detail) 통합 이식 + 시연 폴리싱 적용.
    # 변경: item_seq 가 이미 약을 핀(where 필터)하므로 쿼리에 drug_name 을 함께 넣으면
    #       잡음(부작용 질문이 보관법·사용법 청크와 매칭되는 등 희석)이 됨. 따라서
    #       약품별 검색 쿼리 우선순위: user_query.strip() → drug_name.strip().
    #       둘 다 빈 경우엔 retrieve 자체 건너뛰고 빈 결과 반환(chroma 빈 임베딩 가드).
    drug_info_per_med: list[dict[str, Any]] = []
    drug_detail_per_med: list[dict[str, Any]] = []
    uq = (user_query or "").strip()
    for med in medications:
        item_seq = str(med.get("item_seq", ""))
        drug_name = str(med.get("drug_name", ""))
        # 약품별 쿼리 = user_query 우선, 없으면 drug_name 폴백. 둘 다 빈 경우 0건.
        query = uq if uq else drug_name.strip()

        if query:
            result = retrieve_drug_info(query, item_seq, top_k=top_k)
            drug_info_hits = result["drug_info"]
            drug_detail_hits = result["drug_detail"]
        else:
            drug_info_hits, drug_detail_hits = [], []

        drug_info_per_med.append({
            "item_seq": item_seq,
            "drug_name": drug_name,
            "retrieved": drug_info_hits,
        })
        drug_detail_per_med.append({
            "item_seq": item_seq,
            "drug_name": drug_name,
            "retrieved": drug_detail_hits,
        })

    # 학회 진료지침은 약 단위가 아니라 주제 단위 — 노트북 cell 20 동일 규칙.
    if user_query:
        guideline_query = user_query
    else:
        guideline_query = " ".join(str(m.get("drug_name", "")) for m in medications)

    guideline_general = (
        retrieve(guideline_query, "guideline_rag", top_k=top_k)
        if guideline_query.strip()
        else []
    )

    return {
        "safety": safety,
        "drug_info_per_med": drug_info_per_med,
        "drug_detail_per_med": drug_detail_per_med,
        "guideline_general": guideline_general,
        "user_query": user_query,
        "medications": medications,
        "patient": patient,
    }


# ============================================================
# async 변종 — /preview 핸들러 async 전환 슬라이스의 인프라
# sync 함수는 모두 보존. chromadb 1.5.9 는 native async 미지원이라
# OpenAI 임베딩만 await, collection.query() 는 sync 그대로 호출.
# ============================================================
_async_openai_client: AsyncOpenAI | None = None


def _get_async_openai_client() -> AsyncOpenAI:
    global _async_openai_client
    if _async_openai_client is None:
        _async_openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _async_openai_client


async def embed_query_async(text: str) -> list[float]:
    client = _get_async_openai_client()
    resp = await client.embeddings.create(model=settings.EMBEDDING_MODEL, input=text)
    return resp.data[0].embedding


async def retrieve_async(
    query: str,
    collection_name: str,
    top_k: int = 3,
    where: dict[str, Any] | None = None,
    threshold: float = SIMILARITY_THRESHOLD,
) -> list[dict[str, Any]]:
    """retrieve 의 async 변종. 임베딩만 await, chroma 호출은 sync 유지."""
    collection = get_chroma_client().get_collection(name=collection_name)
    vec = await embed_query_async(query)

    kwargs: dict[str, Any] = {"query_embeddings": [vec], "n_results": top_k}
    if where:
        kwargs["where"] = where
    raw = collection.query(**kwargs)

    docs = (raw.get("documents") or [[]])[0]
    metas = (raw.get("metadatas") or [[]])[0]
    dists = (raw.get("distances") or [[]])[0]

    results: list[dict[str, Any]] = []
    for content, metadata, distance in zip(docs, metas, dists):
        sim = 1.0 - float(distance)
        if sim < threshold:
            continue
        results.append(
            {
                "content": content,
                "metadata": metadata or {},
                "similarity": round(sim, 3),
            }
        )
    return results


async def retrieve_drug_info_async(
    query: str,
    item_seq: Any,
    top_k: int = 3,
    threshold: float = 0.0,
) -> dict[str, Any]:
    """retrieve_drug_info 의 async 변종 — drug_info_rag + drug_detail_rag 두 호출을 gather 로 동시.

    threshold 기본 0.0 / where item_seq 필터 등 sync 변종과 동일 정책 유지.
    """
    if not item_seq:
        return {"item_seq": "", "drug_info": [], "drug_detail": []}

    seq = str(item_seq)
    drug_info, drug_detail = await asyncio.gather(
        retrieve_async(
            query, "drug_info_rag",
            top_k=top_k, where={"item_seq": seq}, threshold=threshold,
        ),
        retrieve_async(
            query, "drug_detail_rag",
            top_k=top_k, where={"item_seq": seq}, threshold=threshold,
        ),
    )
    return {"item_seq": seq, "drug_info": drug_info, "drug_detail": drug_detail}


async def prepare_rag_context_async(
    medications: list[dict[str, Any]],
    patient: dict[str, Any] | None = None,
    user_query: str | None = None,
    safety: dict[str, Any] | None = None,
    top_k: int = 3,
) -> dict[str, Any]:
    """prepare_rag_context 의 async 변종 — 약품별 retrieve 와 guideline retrieve 를 한 번의 gather 로.

    1약품 1쿼리 케이스의 임베딩 3회(drug_info/drug_detail/guideline) 가 동시 호출됨.
    sync 변종의 쿼리 우선순위(user_query → drug_name) 와 dict 모양은 그대로 보존.
    """
    uq = (user_query or "").strip()

    async def _per_med(med: dict[str, Any]) -> dict[str, Any]:
        drug_name = str(med.get("drug_name", ""))
        query = uq if uq else drug_name.strip()
        if query:
            return await retrieve_drug_info_async(
                query, str(med.get("item_seq", "")), top_k=top_k
            )
        return {
            "item_seq": str(med.get("item_seq", "")),
            "drug_info": [],
            "drug_detail": [],
        }

    if user_query:
        guideline_query = user_query
    else:
        guideline_query = " ".join(str(m.get("drug_name", "")) for m in medications)

    async def _guideline() -> list[dict[str, Any]]:
        if guideline_query and guideline_query.strip():
            return await retrieve_async(guideline_query, "guideline_rag", top_k=top_k)
        return []

    med_tasks = [_per_med(m) for m in medications]
    gather_results = await asyncio.gather(*med_tasks, _guideline())
    med_results = list(gather_results[:-1])
    guideline_general = gather_results[-1]

    drug_info_per_med: list[dict[str, Any]] = []
    drug_detail_per_med: list[dict[str, Any]] = []
    for med, result in zip(medications, med_results):
        item_seq = str(med.get("item_seq", ""))
        drug_name = str(med.get("drug_name", ""))
        drug_info_per_med.append({
            "item_seq": item_seq,
            "drug_name": drug_name,
            "retrieved": result["drug_info"],
        })
        drug_detail_per_med.append({
            "item_seq": item_seq,
            "drug_name": drug_name,
            "retrieved": result["drug_detail"],
        })

    return {
        "safety": safety,
        "drug_info_per_med": drug_info_per_med,
        "drug_detail_per_med": drug_detail_per_med,
        "guideline_general": guideline_general,
        "user_query": user_query,
        "medications": medications,
        "patient": patient,
    }
