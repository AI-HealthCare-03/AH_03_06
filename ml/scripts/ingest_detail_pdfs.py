"""drug_detail_rag 보강 ingestion — 노인주의 약 + drug_info-only(PDF 누락) 약.

목적
  1) 노인주의(HIRA 다빈도, dur_service._ELDERLY_NAME_KEYWORDS 성분 10종) 약품이
     drug_detail_rag 에 없어 AI 가이드가 빈검색 fallback 으로 떨어지는 문제 해소.
  2) drug_info_rag(e약은요)에는 있는데 drug_detail_rag(PDF)에 없어 "보강" 형태가
     아닌 약품(info − detail 차집합)에 PDF 를 채워 짝을 맞춤.

두 그룹 모두 식약처 nedrug 허가사항 PDF(EE/UD/NB)를 받아 drug_detail_rag 에
append 한다. 청크/메타/ID 포맷은 04_rag_llm.ipynb 블록 F(셀 35·37)와 동일하게 맞춘다.
재실행 안전(idempotent): 이미 적재된 청크 ID 는 건너뛴다.

환경변수
  OPENAI_API_KEY   필수. 미설정 시 backend/.env 에서 읽어 폴백.
  CHROMA_DIR       기본: <repo>/backend/ml_data/chroma_db (앱이 읽는 영구 저장소와 동일해야 함)
  EMBEDDING_MODEL  기본: text-embedding-3-small (chroma_db 임베딩 기준 모델 — 바꾸면 전체 재구축 필요)
  ITEM_PERMIT_CSV  기본: <repo>/ml/data/raw/medication/OpenData_ItemPermitC20260513.csv
  PDF_CACHE_DIR    기본: <repo>/ml/data/processed/medication/pdf_cache

사용
  python ml/scripts/ingest_detail_pdfs.py --dry-run   # 대상만 출력(다운로드·임베딩 없음)
  python ml/scripts/ingest_detail_pdfs.py             # 다운로드 + 임베딩 + 적재

주의
  - 공유 chroma_db 에 쓰는 작업이다. 백엔드가 PersistentClient 를 캐시하므로,
    적재 후 새 벡터를 반영하려면 백엔드(uvicorn/컨테이너)를 재시작해야 한다.
  - 동시 쓰기 회피를 위해 백엔드를 내린 상태에서 실행하는 것을 권장.
"""

import csv
import os
import sqlite3
import ssl
import sys
import time
import urllib.request

# dur_service._ELDERLY_NAME_KEYWORDS 와 동일 (HIRA 다빈도 노인주의 성분)
ELDERLY_NAME_KEYWORDS = (
    "아미트리프틸린", "디아제팜", "클로나제팜", "노르트립틸린", "플루니트라제팜",
    "플루라제팜", "이미프라민", "클로르디아제폭시드", "클로바잠", "클로미프라민",
)

DOC_TYPES = ("EE", "UD", "NB")
DOC_LABELS = {
    "EE": ("efficacy", "효능효과"),
    "UD": ("usage", "용법용량"),
    "NB": ("caution", "주의사항"),
}
DETAIL_COLL_NAME = "drug_detail_rag"
INFO_COLL_NAME = "drug_info_rag"
NEDRUG_SOURCE = "식품의약품안전처 의약품안전나라 (nedrug)"

CHUNK_TOKENS = 800
OVERLAP_TOKENS = 100
EMBED_BATCH = 100
SLEEP_BETWEEN = 0.3
DOWNLOAD_RETRIES = 3
USER_AGENT = "Mozilla/5.0 (Educational/Research; AH_03_06 Bootcamp Project; Python urllib)"

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def _path(env_key, *default_parts):
    return os.environ.get(env_key) or os.path.join(REPO_ROOT, *default_parts)


CHROMA_DIR = _path("CHROMA_DIR", "backend", "ml_data", "chroma_db")
ITEM_PERMIT_CSV = _path(
    "ITEM_PERMIT_CSV", "ml", "data", "raw", "medication", "OpenData_ItemPermitC20260513.csv"
)
PDF_CACHE_DIR = _path("PDF_CACHE_DIR", "ml", "data", "processed", "medication", "pdf_cache")
EMBED_MODEL = os.environ.get("EMBEDDING_MODEL", "text-embedding-3-small")


def load_openai_key():
    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if key:
        return key
    # 컨테이너 env_file(.env.development) 우선, 그다음 흔한 위치들
    candidates = [
        os.path.join(REPO_ROOT, ".env.development"),
        os.path.join(REPO_ROOT, ".env.production"),
        os.path.join(REPO_ROOT, "backend", ".env"),
    ]
    for env_path in candidates:
        if not os.path.exists(env_path):
            continue
        with open(env_path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("OPENAI_API_KEY="):
                    val = line.split("=", 1)[1].strip().strip('"').strip("'")
                    if val:
                        return val
    return ""


def elderly_targets():
    """ItemPermit 에서 노인주의 성분 포함 & 활성(취하 아님) 품목 → {item_seq: name}."""
    out = {}
    with open(ITEM_PERMIT_CSV, encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        header = next(reader)
        i_seq = header.index("품목일련번호")
        i_name = header.index("품목명")
        i_ing = header.index("주성분")
        i_cxl = header.index("취소/취하구분")
        for row in reader:
            if len(row) <= i_cxl:
                continue
            name, ing, cxl = row[i_name], row[i_ing], row[i_cxl]
            if cxl.strip() not in ("", "정상"):
                continue
            if any(kw in name or kw in ing for kw in ELDERLY_NAME_KEYWORDS):
                out[row[i_seq]] = name
    return out


def item_permit_names():
    """ItemPermit 전체 item_seq → 품목명 매핑(활성 우선)."""
    out = {}
    with open(ITEM_PERMIT_CSV, encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        header = next(reader)
        i_seq = header.index("품목일련번호")
        i_name = header.index("품목명")
        i_cxl = header.index("취소/취하구분")
        for row in reader:
            if len(row) <= i_cxl:
                continue
            seq = row[i_seq]
            active = row[i_cxl].strip() in ("", "정상")
            if seq not in out or active:
                out[seq] = row[i_name]
    return out


def brand_targets():
    """--brands=콜대원,판콜 → 각 브랜드명이 품목명에 든 활성 품목 {item_seq: name}."""
    kws = []
    for arg in sys.argv:
        if arg.startswith("--brands="):
            kws += [k.strip() for k in arg.split("=", 1)[1].split(",") if k.strip()]
    if not kws:
        return {}
    out = {}
    with open(ITEM_PERMIT_CSV, encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        header = next(reader)
        i_seq = header.index("품목일련번호")
        i_name = header.index("품목명")
        i_cxl = header.index("취소/취하구분")
        for row in reader:
            if len(row) <= i_cxl:
                continue
            if row[i_cxl].strip() not in ("", "정상"):
                continue
            if any(kw in row[i_name] for kw in kws):
                out[row[i_seq]] = row[i_name]
    return out


# ItemPermit 주성분 컬럼은 영문 표기(Acetaminophen 등). 한글 입력을 영문으로 매핑.
INGREDIENT_KO_EN = {
    "아세트아미노펜": "acetaminophen", "이부프로펜": "ibuprofen",
    "덱시부프로펜": "dexibuprofen", "나프록센": "naproxen",
    "아세클로페낙": "aceclofenac", "록소프로펜": "loxoprofen",
    "디아제팜": "diazepam", "세티리진": "cetirizine", "로라타딘": "loratadine",
}


def ingredient_targets():
    """주성분 매칭 활성 품목 {item_seq: name}.

    --ingredients=아세트아미노펜       : 주성분에 포함(복합제까지) 또는 품목명 매칭
    --ingredients-single=아세트아미노펜 : 주성분이 그 성분 단일(복합제 제외) — 순수 해열진통제만
    """
    sub_kws, single_kws = [], []
    for arg in sys.argv:
        if arg.startswith("--ingredients="):
            sub_kws += [k.strip() for k in arg.split("=", 1)[1].split(",") if k.strip()]
        elif arg.startswith("--ingredients-single="):
            single_kws += [k.strip() for k in arg.split("=", 1)[1].split(",") if k.strip()]
    if not sub_kws and not single_kws:
        return {}
    sub_en = [INGREDIENT_KO_EN.get(k, k).lower() for k in sub_kws]
    single_en = {INGREDIENT_KO_EN.get(k, k).lower() for k in single_kws}
    out = {}
    with open(ITEM_PERMIT_CSV, encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        header = next(reader)
        i_seq = header.index("품목일련번호")
        i_name = header.index("품목명")
        i_ing = header.index("주성분")
        i_cxl = header.index("취소/취하구분")
        for row in reader:
            if len(row) <= i_cxl:
                continue
            if row[i_cxl].strip() not in ("", "정상"):
                continue
            ing = row[i_ing].lower().strip()
            hit = ing in single_en
            if not hit and sub_en:
                hit = any(k in ing for k in sub_en) or any(k in row[i_name] for k in sub_kws)
            if hit:
                out[row[i_seq]] = row[i_name]
    return out


def collection_item_seqs(coll_name):
    """컬렉션의 distinct item_seq → drug_name 매핑. chroma.sqlite3 직접 조회.

    chromadb 의 coll.get() 전체 로드는 대형 컬렉션에서 'too many SQL variables'
    로 실패하므로 sqlite 를 직접 읽는다(읽기 전용, 백엔드 정지 상태 권장).
    """
    db = os.path.join(CHROMA_DIR, "chroma.sqlite3")
    if not os.path.exists(db):
        return {}
    con = sqlite3.connect(db)
    q = """
    SELECT em.string_value AS seq, em2.string_value AS name
    FROM collections co
    JOIN segments s ON s.collection = co.id
    JOIN embeddings e ON e.segment_id = s.id
    JOIN embedding_metadata em ON em.id = e.id AND em.key = 'item_seq'
    LEFT JOIN embedding_metadata em2 ON em2.id = e.id AND em2.key = 'drug_name'
    WHERE co.name = ?
    """
    out = {}
    try:
        for seq, name in con.execute(q, (coll_name,)):
            if seq and seq not in out:
                out[seq] = name or seq
    finally:
        con.close()
    return out


def download_pdf(item_seq, doc_type, ssl_ctx):
    """nedrug PDF 1건 다운로드. 캐시 hit 시 재요청 안 함. Returns (path|None, cached)."""
    os.makedirs(PDF_CACHE_DIR, exist_ok=True)
    cache_path = os.path.join(PDF_CACHE_DIR, f"{item_seq}_{doc_type}.pdf")
    if os.path.exists(cache_path) and os.path.getsize(cache_path) > 0:
        return cache_path, True
    url = f"https://nedrug.mfds.go.kr/pbp/cmn/pdfDownload/{item_seq}/{doc_type}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(DOWNLOAD_RETRIES):
        try:
            with urllib.request.urlopen(req, context=ssl_ctx, timeout=30) as resp:
                if resp.status != 200:
                    return None, False
                data = resp.read()
                if not data.startswith(b"%PDF"):
                    return None, False
                with open(cache_path, "wb") as f:
                    f.write(data)
                return cache_path, False
        except Exception:
            if attempt < DOWNLOAD_RETRIES - 1:
                time.sleep(2)
    return None, False


def parse_extra_seqs(item_permit_names):
    """--extra-seqs=a,b,c 로 임의 item_seq 추가 지정. 이름은 ItemPermit 에서 보강."""
    out = {}
    for arg in sys.argv:
        if arg.startswith("--extra-seqs="):
            for s in arg.split("=", 1)[1].split(","):
                s = s.strip()
                if s:
                    out[s] = item_permit_names.get(s, s)
    return out


def main():
    dry_run = "--dry-run" in sys.argv

    detail_seqs = collection_item_seqs(DETAIL_COLL_NAME)
    info_seqs = collection_item_seqs(INFO_COLL_NAME)

    elderly = elderly_targets()
    permit_names = item_permit_names()
    # 그룹 1: 노인주의 중 아직 PDF 없는 약
    g1 = {s: n for s, n in elderly.items() if s not in detail_seqs}
    # 그룹 2: drug_info 는 있는데 PDF 없는 약(보강 미완)
    g2 = {s: info_seqs[s] for s in info_seqs if s not in detail_seqs}
    # 그룹 3: --extra-seqs 로 수동 지정한 약 중 아직 PDF 없는 약
    g3 = {s: n for s, n in parse_extra_seqs(permit_names).items() if s not in detail_seqs}
    # 그룹 4: --brands 로 지정한 브랜드 전 품목 중 아직 PDF 없는 약
    g4 = {s: n for s, n in brand_targets().items() if s not in detail_seqs}
    # 그룹 5: --ingredients 로 지정한 주성분 든 전 품목 중 아직 PDF 없는 약
    g5 = {s: n for s, n in ingredient_targets().items() if s not in detail_seqs}

    targets = {}
    targets.update(g2)
    targets.update(g1)
    targets.update(g5)
    targets.update(g4)
    targets.update(g3)  # 이름은 ItemPermit 기준 우선

    print(f"CHROMA_DIR     : {CHROMA_DIR}")
    print(f"EMBED_MODEL    : {EMBED_MODEL}")
    print(f"기존 drug_detail_rag item_seq: {len(detail_seqs):,} / drug_info_rag: {len(info_seqs):,}")
    print(f"[그룹1] 노인주의 PDF 신규 대상   : {len(g1)}")
    print(f"[그룹2] info-only PDF 보강 대상   : {len(g2)}")
    print(f"[그룹3] --extra-seqs 수동 추가    : {len(g3)}")
    print(f"[그룹4] --brands 브랜드 보강      : {len(g4)}")
    print(f"[그룹5] --ingredients 성분 보강   : {len(g5)}")
    print(f"=> 합계 다운로드 대상 item_seq   : {len(targets)} (×3 doc = {len(targets) * 3}건)\n")

    show_list = "--list" in sys.argv
    if show_list:
        for s, n in sorted(targets.items()):
            if s in g1:
                tag = "노인주의"
            elif s in g3:
                tag = "수동"
            elif s in g4:
                tag = "브랜드"
            elif s in g5:
                tag = "성분"
            else:
                tag = "보강"
            print(f"  [{tag}] {s}  {n}")

    if dry_run:
        print("\n--dry-run: 다운로드·임베딩 생략.")
        return
    if not targets:
        print("\n대상 없음 — 이미 모두 적재됨.")
        return

    api_key = load_openai_key()
    if not api_key:
        sys.exit("OPENAI_API_KEY 미설정 (환경변수 또는 backend/.env).")

    import chromadb
    import tiktoken
    import fitz  # PyMuPDF
    from openai import OpenAI

    client = chromadb.PersistentClient(path=CHROMA_DIR)
    tokenizer = tiktoken.encoding_for_model("text-embedding-3-small")
    openai_client = OpenAI(api_key=api_key)

    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False  # nedrug 자가서명 인증서 대응
    ssl_ctx.verify_mode = ssl.CERT_NONE

    # 1) 다운로드
    print("\n[1/3] PDF 다운로드")
    paths = []
    n_new = n_cached = n_failed = 0
    for i, (seq, _name) in enumerate(sorted(targets.items()), 1):
        for doc in DOC_TYPES:
            path, cached = download_pdf(seq, doc, ssl_ctx)
            paths.append((seq, doc, path))
            if path is None:
                n_failed += 1
            elif cached:
                n_cached += 1
            else:
                n_new += 1
                time.sleep(SLEEP_BETWEEN)
        if i % 10 == 0 or i == len(targets):
            print(f"  {i}/{len(targets)} 약품 — 신규:{n_new} 캐시:{n_cached} 실패:{n_failed}")
    print(f"  완료 — 신규:{n_new} 캐시:{n_cached} 실패:{n_failed}")

    # 2) 추출 + 청크
    print("\n[2/3] 텍스트 추출 + 청크")
    chunks = []
    for seq, doc, path in paths:
        if path is None:
            continue
        try:
            d = fitz.open(path)
            text = "\n\n".join(p.get_text() for p in d)
            d.close()
        except Exception:
            continue
        text = text.strip()
        if not text:
            continue
        en_key, kr_label = DOC_LABELS[doc]
        drug_name = targets.get(seq, seq)
        tokens = tokenizer.encode(text)
        if len(tokens) <= CHUNK_TOKENS:
            sub_chunks = [text]
        else:
            sub_chunks = []
            start = 0
            while start < len(tokens):
                end = min(start + CHUNK_TOKENS, len(tokens))
                sub_chunks.append(tokenizer.decode(tokens[start:end]))
                if end >= len(tokens):
                    break
                start += CHUNK_TOKENS - OVERLAP_TOKENS
        for idx, sub in enumerate(sub_chunks):
            chunks.append({
                "id": f"detail_{seq}_{en_key}_{idx:02d}",
                "content": sub,
                "metadata": {
                    "item_seq": seq,
                    "drug_name": drug_name,
                    "source": NEDRUG_SOURCE,
                    "field": en_key,
                    "field_label_kr": kr_label,
                    "doc_type": doc,
                    "chunk_idx": idx,
                },
            })
    print(f"  생성 청크: {len(chunks):,}개")

    # 3) drug_detail_rag 증분 적재
    print("\n[3/3] drug_detail_rag 적재")
    detail_coll = client.get_or_create_collection(
        name=DETAIL_COLL_NAME, metadata={"hnsw:space": "cosine"}
    )
    # 전체 로드(too many SQL variables) 회피 — 대상 item_seq 로만 기존 ID 조회
    target_seq_list = sorted(targets.keys())
    existing_ids = set(
        detail_coll.get(where={"item_seq": {"$in": target_seq_list}}, include=[])["ids"]
    )
    new_chunks = [c for c in chunks if c["id"] not in existing_ids]
    if not new_chunks:
        print(f"  [SKIP] 모두 이미 적재됨 (총 {detail_coll.count():,}청크)")
        return
    print(f"  기존 {len(existing_ids):,} / 신규 {len(new_chunks):,} 추가 예정")
    for i in range(0, len(new_chunks), EMBED_BATCH):
        batch = new_chunks[i:i + EMBED_BATCH]
        docs = [c["content"] for c in batch]
        res = openai_client.embeddings.create(model=EMBED_MODEL, input=docs)
        embeds = [d.embedding for d in res.data]
        detail_coll.add(
            ids=[c["id"] for c in batch],
            documents=docs,
            embeddings=embeds,
            metadatas=[c["metadata"] for c in batch],
        )
        print(f"  배치 {i // EMBED_BATCH + 1}: {min(i + EMBED_BATCH, len(new_chunks))}/{len(new_chunks)} 적재")
    print(f"\n[OK] drug_detail_rag 총 {detail_coll.count():,}청크 (신규 +{len(new_chunks):,})")
    print("백엔드가 새 벡터를 읽도록 uvicorn/컨테이너를 재시작하세요.")


if __name__ == "__main__":
    main()
