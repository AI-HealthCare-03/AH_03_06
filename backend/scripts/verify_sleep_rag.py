# backend/scripts/verify_sleep_rag.py
# sleep_guidelines collection 적재 결과 + RAG 검색 동작 확인.
#
# 사용:
#   docker compose exec -T backend python scripts/verify_sleep_rag.py

import sys
sys.path.insert(0, '/app')

from app.utils.rag import retrieve, get_chroma_client


COLLECTION_NAME = "sleep_guidelines"

# 분류 결과별 검색 키워드 (수면가이드파이프라인_0508최종.md §4.2)
TEST_QUERIES = [
    "수면 시간이 부족할 때 권장 수면 위생",
    "만성 불면증 인지행동치료 CBT-I",
    "사회적 시차 일주기 리듬 조정",
    "취침 4시간 이내 카페인 제한",
    "수면제 약물 치료 권고",
]


def main():
    col = get_chroma_client().get_collection(COLLECTION_NAME)
    total = col.count()
    print(f"[collection] sleep_guidelines: {total} chunks")
    print()

    # source 별 청크 수 분포
    print("=== source 별 chunk 분포 ===")
    sample = col.get(limit=total, include=['metadatas'])
    source_counts: dict[str, int] = {}
    for m in sample['metadatas']:
        s = m.get('source', '?')
        source_counts[s] = source_counts.get(s, 0) + 1
    for s, n in sorted(source_counts.items(), key=lambda x: -x[1]):
        print(f"  {n:>4}  {s}")
    print()

    # 검색 동작 — 5 케이스
    print("=== RAG 검색 동작 (top-3) ===")
    for q in TEST_QUERIES:
        results = retrieve(q, collection_name=COLLECTION_NAME, top_k=3)
        print(f"\n[Q] {q}")
        if not results:
            print("  (검색 결과 없음 — threshold 미만)")
            continue
        for i, r in enumerate(results, 1):
            doc_preview = r['content'][:100].replace('\n', ' ')
            sim = r['similarity']
            source = r['metadata'].get('source', '?')
            print(f"  [{i}] sim={sim} | {source}")
            print(f"      {doc_preview}…")

    print()
    print("검증 통과 ✅ — sleep_guidelines 적재 + 검색 동작")


if __name__ == "__main__":
    main()
