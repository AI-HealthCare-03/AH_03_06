# app/services/drug_matching_service.py
# 약품명 → item_seq 매칭 부품 (02_drug_matching 노트북 이식)
# 1차 조각: 순수 함수·상수만. DB 접근/인덱스 빌드/match_drug 본체는 후속 조각에서 추가.
# 출처: ml/notebooks/medication/02_drug_matching.ipynb

from __future__ import annotations

import re
import time
from dataclasses import dataclass
from typing import TYPE_CHECKING

from jamo import h2j, j2hcj
from rapidfuzz import fuzz, process

if TYPE_CHECKING:
    from sqlalchemy.orm import Session


# ============================================================
# 임계값 (노트북 cell 14)
# ============================================================
# 짧은 query를 부분 입력으로 판정하는 길이 임계값 (정규화 후 글자 수)
SHORT_QUERY_THRESHOLD = 5
# fuzzy 점수가 이 미만이면 자모 분해 fuzzy 추가 시도 (오타 의심)
JAMO_TRIGGER_THRESHOLD = 85
# 자모 fuzzy 결과는 최소 이 점수 이상이어야 채택 (낮은 점수 채택 시 거짓 매칭 위험)
JAMO_MIN_ACCEPT_SCORE = 70
# fuzzy_match가 fetch하는 후보 풀 크기 — 본형이 변종 뒤에 묻혀 누락되는 케이스 회수용
FETCH_TOP_N = 15


# ============================================================
# tiebreak 정렬용 키워드 (노트북 cell 12)
# ============================================================
# 한정어 prefix — 사용자가 일반 제품을 의도할 가능성 높을 때 후순위로
QUALIFIER_PREFIXES = ('어린이', '소아용', '소아', '노인용')

# 변종 식별 키워드 — 약명 어디에든 들어가면 본형보다 후순위
# (콜드/쿨다운/릴랙스 등 동일 브랜드의 변종 제품. 사용자가 단순 입력 시 본형 우선)
VARIANT_KEYWORDS = (
    '콜드', '쿨다운', '릴랙스', '에스', '이알', '서방',
    '츄어블', '구강붕해', '액', '시럽', '연질', '플러스',
    '듀오', '포르테', '맥스', '나이트', '데이', '키즈',
    '브이', '알파', '골드', '슈퍼', '액티브', '울트라', '프리미엄',
)


# ============================================================
# 제형 suffix & 염/수화물 패턴 (노트북 cell 10)
# ============================================================
# 성분명+제형 패턴 인식용 (예: '메트포르민정500mg' → '메트포르민' 추출)
_DOSAGE_FORM_SUFFIXES = ('정', '캡슐', '시럽', '주사', '주', '액', '연질캡슐', '경질캡슐', '서방정')

# 염/산/수화물 suffix — INN base 추출용
_SALT_SUFFIX_PATTERN = re.compile(
    r'(염산염|베실산염|말레산염|메탄설폰산염|시트르산염|구연산염|'
    r'인산염|황산염|타르타르산염|푸마르산염|글루콘산염|아세트산염|'
    r'칼륨|나트륨|칼슘|마그네슘|수화물|일수화물|이수화물|삼수화물)+$'
)


# ============================================================
# 정규화 함수 (노트북 cell 8)
# ============================================================
def normalize_drug_name(name) -> str:
    """약품명에서 공백, 괄호 내용, 특수문자를 제거하고 소문자화한다.

    노트북 cell 8 로직 그대로. NaN 처리는 노트북의 pd.isna() 의존 대신
    None/빈문자 체크로 대체 (백엔드 호출 경로에서는 NaN 입력이 발생하지 않음).
    """
    if name is None:
        return ''
    name = str(name)
    if not name:
        return ''

    # 1) 괄호 안 내용 제거: (수출명:...), (아세트아미노펜) 등
    name = re.sub(r'\([^)]*\)', '', name)
    # 2) 대괄호도 제거
    name = re.sub(r'\[[^\]]*\]', '', name)
    # 3) 단위 표기 통일 (밀리그람·그램 등 -> 영문 단위)
    for ko, en in [
        ('밀리그람', 'mg'), ('밀리그램', 'mg'), ('미리그람', 'mg'),
        ('마이크로그람', 'ug'), ('마이크로그램', 'ug'),
        ('밀리리터', 'ml'),
        ('그람', 'g'), ('그램', 'g'),
    ]:
        name = name.replace(ko, en)
    # 4) 공백 제거
    name = name.replace(' ', '').replace('\t', '')
    # 5) 한글·영문·숫자만 남기기
    name = re.sub(r'[^\w가-힣]', '', name)
    # 6) 영문 소문자화
    return name.lower()


# ============================================================
# 자모 분해 (노트북 cell 10)
# ============================================================
def jamo_decompose(text: str) -> str:
    """한글 텍스트를 호환 자모로 분해 (한국어 1~2글자 오타 보정용).

    노트북 cell 10 로직 그대로.
    예: '게보린' -> 'ㄱㅔㅂㅗㄹㅣㄴ' / '게부린' -> 'ㄱㅔㅂㅜㄹㅣㄴ' (모음 1자 차이)
    한글이 아닌 문자(영문, 숫자, 특수문자)는 그대로 유지.
    """
    if not text:
        return ''
    try:
        return j2hcj(h2j(text))
    except Exception:
        return text


# ============================================================
# 신뢰도 분류 (노트북 cell 12)
# ============================================================
def _classify_confidence(score: float) -> str:
    """rapidfuzz 점수를 신뢰도 등급으로 분류한다."""
    if score >= 90:
        return 'high'
    if score >= 70:
        return 'medium'
    return 'low'


# ============================================================
# tiebreak 보조 함수 (노트북 cell 14)
# ============================================================
def _common_chunk_score(query_normalized: str, candidate_normalized: str) -> float:
    """쿼리 음절이 candidate에 등장하는 비율을 0~10점으로 환산.

    ATC tiebreak에서 brand 일치도 측정용. 음절 set 기반이라 순서 무관 —
    변형(접두/접미 추가)에 강함.
    """
    if not query_normalized:
        return 0.0
    matches = sum(1 for ch in query_normalized if ch in candidate_normalized)
    return (matches / len(query_normalized)) * 10.0


def _common_prefix_len(s1: str, s2: str) -> int:
    """두 정규화 문자열의 공통 prefix 음절 길이 (brand 식별력 보완용)."""
    n = 0
    for a, b in zip(s1, s2):
        if a == b:
            n += 1
        else:
            break
    return n


# ============================================================
# 용량 패턴 (노트북 cell 10)
# ============================================================
# 약명 끝부분의 용량 표기 — is_likely_ingredient_query 의 trailing 제거에 사용.
_DOSE_PATTERN = re.compile(r'\d+(\.\d+)?(mg|g|ml|%|밀리그램|밀리그람)?$')


# ============================================================
# 성분명 처리 (노트북 cell 10)
# ============================================================
def _extract_ingredient_base(s: str) -> str:
    """염/산/수화물 suffix 반복 제거해 INN base 추출 (노트북 cell 10).

    예: '암로디핀베실산염'         → '암로디핀'
        '시타글립틴인산염수화물'    → '시타글립틴'
    """
    if not isinstance(s, str):
        return ''
    return _SALT_SUFFIX_PATTERN.sub('', s).strip()


def is_likely_ingredient_query(query: str, ingredient_set: set[str] | frozenset[str]) -> bool:
    """query 가 (제품명이 아니라) 성분명 입력인지 판별 (노트북 cell 10).

    노트북 v8 (PR11) 정책: 단독 성분명 입력 시 임의 회사 제품을 1순위로
    제안하는 의학적 위험을 막기 위해 best_match=None 으로 차단한다.

    노트북 원본은 모듈 전역 INGREDIENT_SET 을 참조했지만, 본 이식본은
    set 을 인자로 받는 순수 함수 — INGREDIENT_SET 실제 빌드(DB 접근)는
    후속 조각(인덱스 빌드)으로 분리한다.

    인식 패턴:
        1. 정규화 query 자체가 성분명 (예: '아세트아미노펜')
        2. 정규화 query 에서 trailing 용량 제거 후 성분명
        3. 정규화 query 에서 trailing 제형(+용량) 제거 후 성분명
           (예: '메트포르민정500mg' → '메트포르민')
    """
    if not query:
        return False
    nq = normalize_drug_name(query)
    if not nq:
        return False

    # 패턴 1: 정규화 query 자체
    if nq in ingredient_set:
        return True

    # 패턴 2: trailing 용량 제거 후
    nq_no_dose = _DOSE_PATTERN.sub('', nq).strip()
    if nq_no_dose and nq_no_dose != nq and nq_no_dose in ingredient_set:
        return True

    # 패턴 3: trailing 제형(+용량) 제거 후
    for candidate in (nq, nq_no_dose):
        if not candidate:
            continue
        for suf in _DOSAGE_FORM_SUFFIXES:
            if candidate.endswith(suf):
                base = candidate[:-len(suf)].strip()
                if base and base in ingredient_set:
                    return True

    return False


# ============================================================
# 인덱스 데이터 구조 (노트북 cell 10/14 in-memory 컬럼 + ATC_MAP + INGREDIENT_SET)
# ============================================================
@dataclass(frozen=True)
class DrugMatchIndex:
    """약품명 매칭 인덱스 — 부팅 시 1회 빌드 후 in-memory 캐시.

    노트북 cell 10/14 의 in-memory 컬럼·매핑·셋에 해당:
        - rows           : drug_info 행 dict 리스트 (원본 lookup 용).
        - by_normalized  : 정확 매칭용 dict (정규화 이름 → rows index list).
                           동명이품 위해 list (1 이상).
        - normalized_list: rapidfuzz process.extract 용 (rows 와 동일 순서).
        - jamo_list      : jamo 분해 매칭용 (rows 와 동일 순서).
        - atc_map        : drug_code → atc_code (atc_code 채워진 행만).
        - ingredient_set : 성분명 차단용 frozenset (원형 + INN base 모두).
    """
    rows: list[dict]
    by_normalized: dict[str, list[int]]
    normalized_list: list[str]
    jamo_list: list[str]
    atc_map: dict[str, str]
    ingredient_set: frozenset[str]


def _build_index_from_data(
    drug_rows: list[dict],
    ingredient_names: list,
) -> DrugMatchIndex:
    """순수 함수 — DB 의존 없는 인덱스 빌드 (노트북 cell 10 in-memory 컬럼 생성 등가).

    Args:
        drug_rows: drug_info 행 dict 리스트. 각 dict 는 drug_name 키 필수.
                   drug_code / atc_code 는 None 허용.
        ingredient_names: DrugIngredientMap.ingredient_name 값 리스트
                          (None / 빈문자 / 중복 허용 — 내부에서 정제).
    """
    normalized_list: list[str] = []
    jamo_list: list[str] = []
    by_normalized: dict[str, list[int]] = {}
    atc_map: dict[str, str] = {}

    for i, row in enumerate(drug_rows):
        name = row.get('drug_name') or ''
        norm = normalize_drug_name(name)
        jamo = jamo_decompose(norm) if norm else ''
        normalized_list.append(norm)
        jamo_list.append(jamo)
        if norm:
            by_normalized.setdefault(norm, []).append(i)

        code = row.get('drug_code')
        atc = row.get('atc_code')
        if code and atc:
            atc_map[str(code)] = str(atc)

    # INGREDIENT_SET: 원형 + INN base 모두 포함 (is_likely_ingredient_query 패턴 1·3 호환).
    ingredient_set: set[str] = set()
    for name in ingredient_names:
        if not name:
            continue
        name_str = str(name).strip()
        if not name_str:
            continue
        ingredient_set.add(name_str)
        base = _extract_ingredient_base(name_str)
        if base and base != name_str:
            ingredient_set.add(base)

    return DrugMatchIndex(
        rows=drug_rows,
        by_normalized=by_normalized,
        normalized_list=normalized_list,
        jamo_list=jamo_list,
        atc_map=atc_map,
        ingredient_set=frozenset(ingredient_set),
    )


def build_index(db: Session) -> DrugMatchIndex:
    """DB 에서 DrugInfo + DrugIngredientMap 을 읽어 인덱스 빌드 (부팅 시 1회).

    ATC tiebreak 는 DrugInfo.atc_code 컬럼을 직접 사용 (atc_map.csv 백필
    이후 41,079건 채워져 있음). INGREDIENT_SET 은 DrugIngredientMap 의
    ingredient_name distinct 를 정제·base 추출해 구성.
    """
    # SQLAlchemy / 모델 의존은 함수 내부에서 lazy import — 모듈 로딩 시 끌어오지 않음.
    from app.models.drug_info import DrugInfo
    from app.models.drug_ingredient_map import DrugIngredientMap

    t0 = time.perf_counter()
    drug_rows = [
        {
            'drug_id': r.drug_id,
            'drug_code': r.drug_code,
            'drug_name': r.drug_name,
            'generic_name': r.generic_name,
            'manufacturer': r.manufacturer,
            'drug_type': r.drug_type,
            'atc_code': r.atc_code,
            'is_recalled': r.is_recalled,
        }
        for r in db.query(DrugInfo).all()
    ]
    ingredient_names = [
        name for (name,) in db.query(DrugIngredientMap.ingredient_name).distinct().all()
    ]
    t_query = time.perf_counter()

    idx = _build_index_from_data(drug_rows, ingredient_names)
    t_build = time.perf_counter()

    print(
        f"[drug_matching_service] index built: "
        f"rows={len(idx.rows):,} / "
        f"by_normalized keys={len(idx.by_normalized):,} / "
        f"atc_map={len(idx.atc_map):,} / "
        f"ingredient_set={len(idx.ingredient_set):,} / "
        f"query={t_query - t0:.2f}s, build={t_build - t_query:.2f}s"
    )
    return idx


# ============================================================
# 모듈 전역 캐시 — 부팅 후 단일 빌드, 매칭 본체가 lazy 로 접근
# ============================================================
_index: DrugMatchIndex | None = None


def get_index(db: Session) -> DrugMatchIndex:
    """현재 빌드된 인덱스 반환. 없으면 즉시 빌드 후 캐시."""
    global _index
    if _index is None:
        _index = build_index(db)
    return _index


def reset_index() -> None:
    """캐시 초기화 — 테스트·재적재 후 재빌드 시나리오용. 운영 코드 호출 X."""
    global _index
    _index = None


# ============================================================
# rapidfuzz 매칭 (노트북 cell 12 / 14)
# ============================================================
def _prefix_match(
    normalized_query: str,
    index: DrugMatchIndex,
    top_n: int = 5,
) -> list[dict]:
    """정규화 query 로 시작하는 후보를 추출하고 본형 우선 정렬 (노트북 cell 14).

    짧은 부분 입력(SHORT_QUERY_THRESHOLD 이하) 케이스 전용. WRatio 후보 풀에서
    누락되는 본형(예: '타이레놀' → '타이레놀정500mg')을 회수하고, 변종(콜드·
    쿨다운 등)보다 본형(브랜드명+제형)을 1순위로 끌어올린다.
    """
    if not normalized_query:
        return []

    candidates: list[dict] = []
    for i, norm in enumerate(index.normalized_list):
        if not norm.startswith(normalized_query):
            continue
        drug_row = index.rows[i]
        name = drug_row.get('drug_name') or ''
        has_qualifier = any(name.startswith(q) for q in QUALIFIER_PREFIXES)
        is_export_only = '(수출용)' in name
        variant_count = sum(1 for kw in VARIANT_KEYWORDS if kw in name)
        candidates.append({
            'score': 95.0,
            'confidence_level': 'high',
            'drug_info': drug_row,
            '_tiebreak': (has_qualifier, is_export_only, variant_count, len(name)),
        })

    candidates.sort(key=lambda c: c['_tiebreak'])
    for c in candidates:
        del c['_tiebreak']
    return candidates[:top_n]


def fuzzy_match(
    query: str,
    index: DrugMatchIndex,
    top_n: int = 5,
) -> list[dict]:
    """정규화 query 와 normalized_list 의 WRatio 유사도 상위 N 반환 (노트북 cell 12).

    동점 점수일 때 다음 우선순위로 1순위 결정:
        1. 정규화 매칭 텍스트가 query 로 시작하는 후보
        2. 한정어 prefix(어린이/소아용 등) 없는 후보
        3. 수출용 전용('(수출용)') 아닌 후보  ※ '(수출명:...)' 표기는 본형 별칭이라 후순위 X
        4. 변종 키워드(콜드/쿨다운/브이 등) 수가 적은 후보 (본형 우선)
        5. 짧은 품목명
    """
    normalized_query = normalize_drug_name(query)
    if not normalized_query:
        return []

    fetch_n = max(top_n * 3, 15)
    results = process.extract(
        normalized_query,
        index.normalized_list,
        scorer=fuzz.WRatio,
        limit=fetch_n,
    )

    candidates: list[dict] = []
    for matched_text, score, idx in results:
        drug_row = index.rows[idx]
        name = drug_row.get('drug_name') or ''
        not_starts_with_query = not matched_text.startswith(normalized_query)
        has_qualifier = any(name.startswith(q) for q in QUALIFIER_PREFIXES)
        is_export_only = '(수출용)' in name
        variant_count = sum(1 for kw in VARIANT_KEYWORDS if kw in name)
        candidates.append({
            'score': round(score, 1),
            'confidence_level': _classify_confidence(score),
            'drug_info': drug_row,
            '_tiebreak': (
                not_starts_with_query,
                has_qualifier,
                is_export_only,
                variant_count,
                len(name),
            ),
        })

    candidates.sort(key=lambda c: (-c['score'], c['_tiebreak']))
    for c in candidates:
        del c['_tiebreak']
    return candidates[:top_n]


# ============================================================
# 정확 매칭 (노트북 cell 10)
# ============================================================
def exact_match(query: str, index: DrugMatchIndex) -> dict | None:
    """정규화 query 를 by_normalized 로 정확 매칭 (노트북 cell 10).

    노트북은 df[df['_normalized'] == nq] 로 풀스캔 후 len 분기.
    백엔드는 빌드 시 만들어둔 by_normalized dict 로 O(1) lookup.

    Returns:
        단일 매칭: {'status': 'exact_one',      'confidence': 100, 'drug_info': dict}
        동명이품:  {'status': 'exact_multiple', 'confidence': 100, 'candidates': list[dict]}  # 최대 5개
        실패:      None
    """
    normalized_query = normalize_drug_name(query)
    if not normalized_query:
        return None

    indices = index.by_normalized.get(normalized_query)
    if not indices:
        return None

    if len(indices) == 1:
        return {
            'status': 'exact_one',
            'confidence': 100,
            'drug_info': index.rows[indices[0]],
        }

    return {
        'status': 'exact_multiple',
        'confidence': 100,
        'candidates': [index.rows[i] for i in indices[:5]],
    }


def fuzzy_match_jamo(
    query: str,
    index: DrugMatchIndex,
    top_n: int = 5,
) -> list[dict]:
    """자모 분해 후 fuzzy 매칭 — 한국어 1~2글자 오타 보정 (노트북 cell 12).

    fuzzy_match 가 character level 에서 잡지 못하는 한국어 오타를 잡아내는 보조.
    예: '게부린' → 'ㄱㅔㅂㅜㄹㅣㄴ' vs '게보린' → 'ㄱㅔㅂㅗㄹㅣㄴ' (자모 1자 차이).
    """
    normalized_query = normalize_drug_name(query)
    if not normalized_query:
        return []

    jamo_query = jamo_decompose(normalized_query)
    if not jamo_query:
        return []

    fetch_n = max(top_n * 3, 15)
    results = process.extract(
        jamo_query,
        index.jamo_list,
        scorer=fuzz.WRatio,
        limit=fetch_n,
    )

    candidates: list[dict] = []
    for matched_text, score, idx in results:
        drug_row = index.rows[idx]
        name = drug_row.get('drug_name') or ''
        not_starts_with_query = not matched_text.startswith(jamo_query)
        has_qualifier = any(name.startswith(q) for q in QUALIFIER_PREFIXES)
        is_export_only = '(수출용)' in name
        variant_count = sum(1 for kw in VARIANT_KEYWORDS if kw in name)
        candidates.append({
            'score': round(score, 1),
            'confidence_level': _classify_confidence(score),
            'drug_info': drug_row,
            '_tiebreak': (
                not_starts_with_query,
                has_qualifier,
                is_export_only,
                variant_count,
                len(name),
            ),
        })

    candidates.sort(key=lambda c: (-c['score'], c['_tiebreak']))
    for c in candidates:
        del c['_tiebreak']
    return candidates[:top_n]


# ============================================================
# ATC tiebreak (노트북 cell 14, v9/v11/v12)
# ============================================================
def _atc_tiebreak(
    results: list[dict],
    atc_map: dict[str, str],
    query_normalized: str,
    top_n: int = 5,
) -> list[dict]:
    """동일 ATC 후보군에 brand chunk + prefix bonus 가산 후 재정렬 (노트북 cell 14).

    1순위 후보의 ATC 를 anchor 로 삼아, 동일 ATC 후보들의 chunk 일치도 + prefix
    길이×20 만큼 bonus 가산. 원본 score 는 _rerank_score 키로 분리해 보존.
    anchor ATC 없으면 원본 그대로 반환.

    노트북과의 차이 — 노트북은 atc_map 키가 품목일련번호(int) 라 int(top_item_no)
    변환을 시도. 본 이식본은 빌드 시 atc_map 키를 str(drug_code) 로 통일했으므로
    변환 없이 직접 lookup.
    """
    if len(results) <= 1 or not query_normalized:
        return results

    top_drug_code = results[0]['drug_info'].get('drug_code')
    if not top_drug_code:
        return results
    anchor_atc = atc_map.get(str(top_drug_code))
    if not anchor_atc:
        return results

    rescored: list[dict] = []
    for r in results:
        cand_code = r['drug_info'].get('drug_code')
        cand_atc = atc_map.get(str(cand_code)) if cand_code else None

        bonus = 0.0
        if cand_atc == anchor_atc:
            cand_name = r['drug_info'].get('drug_name') or ''
            cand_norm = normalize_drug_name(cand_name) if cand_name else ''
            chunk = _common_chunk_score(query_normalized, cand_norm)
            prefix_len = _common_prefix_len(query_normalized, cand_norm)
            bonus = chunk + prefix_len * 20

        new_r = dict(r)
        new_r['_atc_bonus'] = bonus
        new_r['_rerank_score'] = r['score'] + bonus
        rescored.append(new_r)

    rescored.sort(key=lambda x: -x['_rerank_score'])
    return rescored[:top_n]


# ============================================================
# 통합 매칭 (노트북 cell 14, v12 PR13)
# ============================================================
def match_drug(
    query: str,
    index: DrugMatchIndex,
    fuzzy_top_n: int = 5,
) -> dict:
    """약품명 → drug_info 통합 매칭 (노트북 cell 14 그대로).

    5단계 폴백:
        1. exact_match              — by_normalized O(1) lookup
        1.5. prefix (짧은 query)    — _prefix_match (정규화 길이 ≤ SHORT_QUERY_THRESHOLD)
        1.7. ingredient_blocked     — 성분명 입력 차단 (PR11)
        2.  fuzzy + ATC tiebreak    — WRatio character level
        2.5. fuzzy_jamo + ATC tiebreak — 자모 분해 (jamo trigger: 원본 fuzzy < 85)

    노트북 v9 의 jamo trigger 규칙: ATC tiebreak 적용 전의 원본 fuzzy 점수 기준.
    노트북 v12 의 fetch 풀 규칙: 내부 fuzzy_match/fuzzy_match_jamo 는 FETCH_TOP_N(15)
    으로 풀을 넓혀 본형 누락을 줄인 뒤, _atc_tiebreak 에서 fuzzy_top_n(=5) 으로 절단.

    Returns:
        dict:
            - query: 원본 입력
            - match_type: 'exact_one'|'exact_multiple'|'prefix'|
                          'ingredient_blocked'|'fuzzy'|'fuzzy_jamo'
            - confidence: 100 | 95 | 0 | fuzzy score | jamo score
            - best_match: 1순위 drug_info dict 또는 None
            - all_candidates: drug_info dict 리스트
    """
    # 1단계: 정확 매칭
    exact = exact_match(query, index)
    if exact is not None and exact['status'] == 'exact_one':
        return {
            'query': query,
            'match_type': 'exact_one',
            'confidence': 100,
            'best_match': exact['drug_info'],
            'all_candidates': [exact['drug_info']],
        }
    if exact is not None and exact['status'] == 'exact_multiple':
        return {
            'query': query,
            'match_type': 'exact_multiple',
            'confidence': 100,
            'best_match': exact['candidates'][0],
            'all_candidates': exact['candidates'],
        }

    # 1.5단계: 짧은 query 는 prefix 매칭을 fuzzy 보다 먼저
    normalized_query = normalize_drug_name(query)
    if 0 < len(normalized_query) <= SHORT_QUERY_THRESHOLD:
        prefix_results = _prefix_match(normalized_query, index, top_n=fuzzy_top_n)
        if prefix_results:
            return {
                'query': query,
                'match_type': 'prefix',
                'confidence': prefix_results[0]['score'],
                'best_match': prefix_results[0]['drug_info'],
                'all_candidates': [c['drug_info'] for c in prefix_results],
            }

    # 1.7단계: 성분명 입력 차단 (의학적 위험 방지)
    if is_likely_ingredient_query(query, index.ingredient_set):
        return {
            'query': query,
            'match_type': 'ingredient_blocked',
            'confidence': 0,
            'best_match': None,
            'all_candidates': [],
        }

    # 2단계: fuzzy (character level) — 풀 확장 fetch
    fuzzy_results = fuzzy_match(query, index, top_n=FETCH_TOP_N)
    orig_top_fuzzy_score = fuzzy_results[0]['score'] if fuzzy_results else 0

    # 2.2단계: ATC tiebreak (fuzzy)
    fuzzy_results = _atc_tiebreak(fuzzy_results, index.atc_map, normalized_query, fuzzy_top_n)
    top_fuzzy_score = fuzzy_results[0]['score'] if fuzzy_results else 0

    # 2.5단계: 원본 fuzzy 가 낮으면 jamo 분해 fuzzy 추가
    if orig_top_fuzzy_score < JAMO_TRIGGER_THRESHOLD:
        jamo_results = fuzzy_match_jamo(query, index, top_n=FETCH_TOP_N)
        jamo_results = _atc_tiebreak(jamo_results, index.atc_map, normalized_query, fuzzy_top_n)
        if jamo_results:
            top_jamo_score = jamo_results[0]['score']
            if top_jamo_score > top_fuzzy_score and top_jamo_score >= JAMO_MIN_ACCEPT_SCORE:
                return {
                    'query': query,
                    'match_type': 'fuzzy_jamo',
                    'confidence': top_jamo_score,
                    'best_match': jamo_results[0]['drug_info'],
                    'all_candidates': [c['drug_info'] for c in jamo_results],
                }

    # 2단계 결과 사용
    if not fuzzy_results:
        return {
            'query': query,
            'match_type': 'fuzzy',
            'confidence': 0,
            'best_match': None,
            'all_candidates': [],
        }

    top_score = fuzzy_results[0]['score']
    return {
        'query': query,
        'match_type': 'fuzzy',
        'confidence': top_score,
        'best_match': fuzzy_results[0]['drug_info'] if top_score >= 70 else None,
        'all_candidates': [c['drug_info'] for c in fuzzy_results],
    }
