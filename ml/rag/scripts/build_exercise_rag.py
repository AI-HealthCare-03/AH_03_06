"""운동 가이드 PDF를 ChromaDB 컬렉션 ``exercise_guidelines``로 구축한다."""

from __future__ import annotations

import re
import uuid
from pathlib import Path

import chromadb
from chromadb.config import Settings
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer

ROOT = Path(__file__).resolve().parents[2]
DOC_DIR = ROOT / "rag" / "documents" / "exercise"
PERSIST_DIR = ROOT / "rag" / "embeddings" / "chroma_db"
COLLECTION_NAME = "exercise_guidelines"
EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"


def _read_pdf_text(path: Path) -> str:
    reader = PdfReader(str(path))
    parts: list[str] = []
    for page in reader.pages:
        t = page.extract_text() or ""
        parts.append(t)
    return "\n".join(parts)


def _chunk_text(text: str, max_chars: int = 900) -> list[str]:
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
            sentences = re.split(r"(?<=[.!?])\s+", para)
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


def build_exercise_vectorstore() -> None:
    """``rag/documents/exercise/`` 내 PDF를 로드해 임베딩 후 ChromaDB에 저장한다."""
    PERSIST_DIR.mkdir(parents=True, exist_ok=True)
    pdf_paths = sorted(DOC_DIR.glob("*.pdf"))
    if not pdf_paths:
        raise FileNotFoundError(f"No PDF files found under {DOC_DIR}")

    all_chunks: list[str] = []
    metadatas: list[dict] = []
    for pdf in pdf_paths:
        text = _read_pdf_text(pdf)
        for i, ch in enumerate(_chunk_text(text)):
            all_chunks.append(ch)
            metadatas.append({"source": pdf.name, "chunk_index": i})

    model = SentenceTransformer(EMBED_MODEL)
    embeddings = model.encode(all_chunks, show_progress_bar=True).tolist()

    client = chromadb.PersistentClient(
        path=str(PERSIST_DIR), settings=Settings(anonymized_telemetry=False)
    )
    col = client.get_or_create_collection(
        name=COLLECTION_NAME, metadata={"hnsw:space": "cosine"}
    )
    ids = [str(uuid.uuid4()) for _ in all_chunks]
    col.add(ids=ids, documents=all_chunks, metadatas=metadatas, embeddings=embeddings)


if __name__ == "__main__":
    build_exercise_vectorstore()
