# backend/scripts/build_sleep_rag.py
# 수면 임상진료지침 PDF 5종을 ChromaDB sleep_guidelines collection 으로 적재.
#
# 사용:
#   1) backend/ml_data/raw/sleep_guidelines/ 에 PDF 5종 배치
#   2) docker compose exec -T backend python scripts/build_sleep_rag.py
#
# 임베딩: OpenAI text-embedding-3-small (backend/utils/rag.py 와 호환).
# 멱등성: 같은 source 청크는 upsert 가 아닌 add 이므로 두 번 실행 시 중복됨.
#   → 재실행 전 reset 옵션 사용 (스크립트 인자 --reset).

import sys
sys.path.insert(0, '/app')

import argparse
import re
import uuid
from pathlib import Path

import chromadb
from chromadb.config import Settings
from openai import OpenAI
from pypdf import PdfReader

from app.config import settings


# 고정 경로
ROOT = Path("/app")
DOC_DIR = ROOT / "ml_data" / "raw" / "sleep_guidelines"
COLLECTION_NAME = "sleep_guidelines"

# PDF 별 메타데이터 — guideline 식별을 위한 source label.
# 파일명 그대로 + publisher/year 매핑은 CLINICAL_GUIDELINE 마스터로 별도 관리됨.
# 청크 metadata 의 source 는 검색 결과 화면 표시 + 트레이싱 용도.
#
# 국립정신건강센터 매뉴얼은 공공누리 4유형(상업적 이용 금지)이라 본 RAG 에서 제외.
PDF_SOURCE_LABELS = {
    "불면증 임상진료지침- 불면증의 진단과 치료.pdf": "한국판 불면증 임상진료지침 (대한수면학회, 2020)",
    "성인 만성 불면증의 행동 및 심리 치료 (CBT-I 강력 권고)jcsm.8986.pdf": "AASM CBT-I 행동·심리 치료 (2021)",
    "성인 만성 불면증의 약물 치료jcsm.13.2.307.pdf": "AASM 만성 불면증 약물 치료 (2017)",
    "일주기 리듬 수면-각성 장애 치료jcsm.11.10.1199.pdf": "AASM 일주기 리듬 수면각성 장애 (2015)",
}


def _read_pdf_text(path: Path) -> str:
    reader = PdfReader(str(path))
    parts: list[str] = []
    for page in reader.pages:
        t = page.extract_text() or ""
        parts.append(t)
    return "\n".join(parts)


def _chunk_text(text: str, max_chars: int = 900) -> list[str]:
    """문단(빈 줄) 단위 분할 후 긴 문단은 문장 단위로 추가 분할."""
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n+", text) if p.strip()]
    chunks: list[str] = []
    buf: list[str] = []
    buf_len = 0

    def flush() -> None:
        nonlocal buf, buf_len
        if buf:
            chunks.append("\n\n".join(buf))
            buf = []
            buf_len = 0

    for para in paragraphs:
        if len(para) > max_chars:
            sentences = re.split(r"(?<=[.!?。])\s+", para)
            for s in sentences:
                s = s.strip()
                if not s:
                    continue
                if buf_len + len(s) + 2 > max_chars:
                    flush()
                buf.append(s)
                buf_len += len(s) + 2
        else:
            if buf_len + len(para) + 2 > max_chars:
                flush()
            buf.append(para)
            buf_len += len(para) + 2
    flush()
    return [c for c in chunks if c.strip()]


def _embed_batch(client: OpenAI, texts: list[str], batch_size: int = 64) -> list[list[float]]:
    """OpenAI text-embedding-3-small 배치 임베딩."""
    embeddings: list[list[float]] = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        resp = client.embeddings.create(model=settings.EMBEDDING_MODEL, input=batch)
        embeddings.extend([d.embedding for d in resp.data])
        print(f"  [embed] {min(i + batch_size, len(texts))}/{len(texts)}")
    return embeddings


def build(reset: bool = False) -> None:
    if not DOC_DIR.exists():
        raise FileNotFoundError(f"PDF 디렉토리 없음: {DOC_DIR} — 먼저 mkdir + PDF 5종 배치하세요.")

    pdf_paths = sorted(DOC_DIR.glob("*.pdf"))
    if not pdf_paths:
        raise FileNotFoundError(f"PDF 0건 in {DOC_DIR}")

    print(f"[scan] {len(pdf_paths)} PDF 발견")
    for p in pdf_paths:
        label = PDF_SOURCE_LABELS.get(p.name, p.name)
        print(f"  - {p.name}  →  {label}")
    print()

    # 청크 분할
    all_chunks: list[str] = []
    metadatas: list[dict] = []
    for pdf in pdf_paths:
        text = _read_pdf_text(pdf)
        source_label = PDF_SOURCE_LABELS.get(pdf.name, pdf.name)
        chunks = _chunk_text(text)
        print(f"[chunk] {pdf.name}: {len(chunks)} chunks")
        for i, ch in enumerate(chunks):
            all_chunks.append(ch)
            metadatas.append({
                "source": source_label,
                "filename": pdf.name,
                "chunk_index": i,
                "category": "sleep",
            })
    print(f"[chunk] 합계 {len(all_chunks)} chunks")
    print()

    # 임베딩
    print(f"[embed] model={settings.EMBEDDING_MODEL}")
    openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
    embeddings = _embed_batch(openai_client, all_chunks)
    print(f"[embed] {len(embeddings)} 벡터 생성")
    print()

    # Chroma 적재
    chroma_client = chromadb.PersistentClient(
        path=settings.CHROMA_DIR,
        settings=Settings(anonymized_telemetry=False),
    )

    if reset:
        try:
            chroma_client.delete_collection(name=COLLECTION_NAME)
            print(f"[reset] {COLLECTION_NAME} 삭제")
        except Exception as e:
            print(f"[reset] {COLLECTION_NAME} 없음 (skip): {e}")

    col = chroma_client.get_or_create_collection(
        name=COLLECTION_NAME, metadata={"hnsw:space": "cosine"}
    )
    before = col.count()
    ids = [str(uuid.uuid4()) for _ in all_chunks]
    col.add(ids=ids, documents=all_chunks, metadatas=metadatas, embeddings=embeddings)
    after = col.count()
    print(f"[chroma] {COLLECTION_NAME} chunks: {before} → {after} (+{after - before})")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true", help="기존 sleep_guidelines collection 삭제 후 재구축")
    args = parser.parse_args()
    build(reset=args.reset)


if __name__ == "__main__":
    main()
