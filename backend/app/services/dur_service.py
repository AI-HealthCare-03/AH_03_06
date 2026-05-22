# app/services/dur_service.py
# DUR 통합 안전성 검사 서비스 — 노트북 03_dur_safety_check 의 결정론적 함수를 그대로 이식.
#
# 5겹 검증:
#   1. 동일성분 중복     (BLOCK)
#   2. 효능군 중복       (WARN)
#   3. 노인주의          (INFO, patient.age 필요)
#   4. 1일 최대량 초과   (WARN)
#   5. 회수약            (BLOCK)
#
# 마스터 데이터(6개 dict/set + 헬퍼 lookup 2개)는 lazy-load — 첫 호출 시 1회
# pickle 7개를 settings.ML_DATA_DIR 에서 읽어 모듈 전역에 구축한 뒤 재사용.
# build_masters() 가 thread-safe (double-checked locking).
#
# RAG·LLM 통합 없음. 같은 입력 → 같은 출력.
#
# TODO (04 RAG 통합 시점): safety_check_all 반환 dict 를 04 의
#   prepare_rag_context(safety=...) 인자로 그대로 전달하면 됨. 그 자리에서만 호출.

import os
import re
import threading
from collections import defaultdict
from typing import Optional

import pandas as pd

from app.config import settings


# ===== 상수 (03 노트북 셀 14) =====================================

LEVEL_BLOCK = 'BLOCK'   # 강한 차단 경고 (회수약, 동일성분 중복)
LEVEL_WARN = 'WARN'     # 주의 경고 (효능군 중복, 1일 최대량 초과)
LEVEL_INFO = 'INFO'     # 참고용 정보 (노인주의)

ELDERLY_AGE_THRESHOLD = 65   # HIRA 노인주의 정의

# HIRA §7-1 다빈도 노인주의 약물 10종 (영문명) — 03 셀 10
HIRA_ELDERLY_NAMES_EN = [
    'amitriptyline', 'diazepam', 'clonazepam', 'nortriptyline', 'flunitrazepam',
    'flurazepam', 'imipramine', 'chlordiazepoxide', 'clobazam', 'clomipramine',
]

# 03 노트북 셀 6의 pickle 키 7개
_PKL_KEYS = [
    '1_item_permit',
    '2_item_permit_detail',
    '5_easy_excel',
    '6_day_max_dosg',
    '7_recall',
    '10_dur_ingr',
    '11_dur_item',
]

# 주성분명 파싱 정규식 — '[Mxxxxxx]한글성분명' 형식, '/' 또는 '|' 구분 (03 셀 8)
INGREDIENT_PATTERN = re.compile(r'\[(M\d+)\]([^/\[|]+)')


# ===== 마스터 6개 + 헬퍼 lookup 2개 (모듈 전역, lazy-load) =========

_MASTERS_BUILT: bool = False
_BUILD_LOCK = threading.Lock()

DRUG_TO_INGREDIENTS: dict = {}       # int -> set[str]   품목일련번호 → 성분코드 집합
INGREDIENT_CODE_TO_NAME: dict = {}   # str -> str         M코드 → 한글 성분명
DRUG_TO_CLASS: dict = {}             # int -> str         품목일련번호 → 분류명 (효능군)
ELDERLY_CAUTION_CODES: set = set()   # set[str]           HIRA §7-1 노인주의 M코드
INGREDIENT_TO_MAX_DOSE: dict = {}    # str -> dict        성분코드 → {max_dose, unit, name}
RECALLED_ITEM_SEQS: set = set()      # set[int]           회수 대상 품목일련번호
_DRUG_NAME_BY_SEQ: dict = {}         # int -> str         품목일련번호 → 품목명 (df_drug)
_RECALL_NAME_BY_SEQ: dict = {}       # int -> str         품목기준코드 → 품목명 (df_recall fallback)


# ===== 파싱 헬퍼 (03 셀 8) ========================================

def _parse_ingredient_string(s) -> list:
    """'[Mxxxxx]성분명' 형식 문자열에서 (성분코드, 한글성분명) 페어 추출.

    단일제 1개, 복합제는 '/' 또는 '|' 구분 여러 개. 빈/NaN 입력은 빈 리스트.
    """
    if pd.isna(s) or not s:
        return []
    return INGREDIENT_PATTERN.findall(str(s))


# ===== 마스터 빌드 (03 셀 6, 8, 10, 12, 14) =======================

def build_masters() -> None:
    """첫 호출 시 1회 pickle 7개 읽어 마스터 6개 + lookup 2개 구축.

    노트북 03_dur_safety_check 의 셀 6/8/10/12/14 로직 그대로 이식.
    Double-checked locking 으로 동시 호출 안전.
    """
    global _MASTERS_BUILT
    global DRUG_TO_INGREDIENTS, INGREDIENT_CODE_TO_NAME, DRUG_TO_CLASS
    global ELDERLY_CAUTION_CODES, INGREDIENT_TO_MAX_DOSE, RECALLED_ITEM_SEQS
    global _DRUG_NAME_BY_SEQ, _RECALL_NAME_BY_SEQ

    if _MASTERS_BUILT:
        return

    with _BUILD_LOCK:
        if _MASTERS_BUILT:
            return

        # ----- 셀 6: pickle 7개 로드 -----
        dfs = {}
        for key in _PKL_KEYS:
            pkl_path = os.path.join(settings.ML_DATA_DIR, f'{key}.pkl')
            if not os.path.exists(pkl_path):
                raise FileNotFoundError(
                    f'마스터 빌드 실패 — pickle 파일 없음: {pkl_path}\n'
                    f'ml/data/processed/medication/ 의 *.pkl 7개를 '
                    f'{settings.ML_DATA_DIR} 에 복사 필요.'
                )
            dfs[key] = pd.read_pickle(pkl_path)

        df_drug = dfs['1_item_permit']
        df_detail = dfs['2_item_permit_detail']
        df_dose = dfs['6_day_max_dosg']
        df_recall = dfs['7_recall']
        df_dur_ingr = dfs['10_dur_ingr']
        df_dur_item = dfs['11_dur_item']

        # ----- 셀 8 보조: BOM(﻿) 안전 컬럼 정규화 -----
        for _df in (df_dose, df_recall, df_dur_ingr):
            _df.columns = _df.columns.str.lstrip('﻿')

        # ----- 셀 8: DRUG_TO_INGREDIENTS, INGREDIENT_CODE_TO_NAME -----
        drug_to_ingredients_local: dict = {}
        ingredient_code_to_name_local: dict = {}

        # 1차: df_detail.주성분명 (43,203개 약품, 99.8% 커버)
        for _, row in (
            df_detail[['품목일련번호', '주성분명']]
            .dropna(subset=['주성분명'])
            .drop_duplicates()
            .iterrows()
        ):
            item_seq = int(row['품목일련번호'])
            pairs = _parse_ingredient_string(row['주성분명'])
            if not pairs:
                continue
            if item_seq not in drug_to_ingredients_local:
                drug_to_ingredients_local[item_seq] = set()
            for code, name in pairs:
                drug_to_ingredients_local[item_seq].add(code)
                if code not in ingredient_code_to_name_local:
                    ingredient_code_to_name_local[code] = name.strip()

        # 2차: df_dur_item.주성분 (DUR 전용 약품 보완)
        for _, row in (
            df_dur_item[['품목일련번호', '주성분']]
            .dropna(subset=['주성분'])
            .drop_duplicates()
            .iterrows()
        ):
            item_seq = int(row['품목일련번호'])
            pairs = _parse_ingredient_string(row['주성분'])
            if not pairs:
                continue
            if item_seq not in drug_to_ingredients_local:
                drug_to_ingredients_local[item_seq] = set()
            for code, name in pairs:
                drug_to_ingredients_local[item_seq].add(code)
                if code not in ingredient_code_to_name_local:
                    ingredient_code_to_name_local[code] = name.strip()

        DRUG_TO_INGREDIENTS = drug_to_ingredients_local
        INGREDIENT_CODE_TO_NAME = ingredient_code_to_name_local

        # ----- 셀 10: DRUG_TO_CLASS -----
        DRUG_TO_CLASS = (
            df_drug[['품목일련번호', '분류명']]
            .dropna(subset=['분류명'])
            .drop_duplicates(subset='품목일련번호')
            .set_index('품목일련번호')['분류명']
            .to_dict()
        )

        # ----- 셀 10: ELDERLY_CAUTION_CODES (HIRA §7-1 10종 매칭) -----
        elderly_codes_local: set = set()

        # 1차: df_dose.성분명(영문) 매칭 → 성분코드 직접 추출
        dose_en = df_dose['성분명(영문)'].astype(str).str.lower()
        for en in HIRA_ELDERLY_NAMES_EN:
            mask = dose_en.str.contains(en, na=False, regex=False)
            if mask.any():
                for code in df_dose.loc[mask, '성분코드'].astype(str):
                    elderly_codes_local.add(code)

        # 2차: df_detail.영문성분명 매칭 → 주성분명에서 [Mxxx] 추출
        detail_en = df_detail['영문성분명'].astype(str).str.lower()
        for en in HIRA_ELDERLY_NAMES_EN:
            mask = detail_en.str.contains(en, na=False, regex=False)
            if mask.any():
                for ingr_str in df_detail.loc[mask, '주성분명'].dropna():
                    for code, _ in INGREDIENT_PATTERN.findall(str(ingr_str)):
                        elderly_codes_local.add(code)

        ELDERLY_CAUTION_CODES = elderly_codes_local

        # ----- 셀 12: INGREDIENT_TO_MAX_DOSE -----
        dose_grouped = df_dose.groupby('성분코드').agg(
            max_dose=('1일최대투여량', 'max'),
            unit=('투여단위', 'first'),
            name=('성분명(한글)', 'first'),
        )
        INGREDIENT_TO_MAX_DOSE = {
            str(code): {
                'max_dose': float(row['max_dose']),
                'unit': str(row['unit']) if pd.notna(row['unit']) else '',
                'name': str(row['name']) if pd.notna(row['name']) else '',
            }
            for code, row in dose_grouped.iterrows()
        }

        # ----- 셀 12: RECALLED_ITEM_SEQS -----
        RECALLED_ITEM_SEQS = set(df_recall['품목기준코드'].astype(int))

        # ----- 셀 14: 헬퍼 lookup 2개 -----
        _DRUG_NAME_BY_SEQ = (
            df_drug[['품목일련번호', '품목명']]
            .drop_duplicates(subset='품목일련번호')
            .set_index('품목일련번호')['품목명']
            .to_dict()
        )

        _RECALL_NAME_BY_SEQ = (
            df_recall[['품목기준코드', '품목명']]
            .drop_duplicates(subset='품목기준코드')
            .set_index('품목기준코드')['품목명']
            .to_dict()
        )

        _MASTERS_BUILT = True


# ===== 헬퍼 (03 셀 14) ============================================

def _get_drug_name(item_seq) -> str:
    """품목일련번호로 약품명 조회. df_drug → df_recall fallback → unknown."""
    if item_seq is None:
        return '(미발견)'
    seq = int(item_seq)
    name = _DRUG_NAME_BY_SEQ.get(seq)
    if name is not None:
        return name
    return _RECALL_NAME_BY_SEQ.get(seq, f'unknown(seq={seq})')


def _format_ingredient_names(codes) -> str:
    """성분코드 iterable → 한글명 정렬 콤마 구분."""
    names = sorted({INGREDIENT_CODE_TO_NAME.get(c, c) for c in codes})
    return ', '.join(names)


# ===== 5겹 검증 함수 (03 셀 16, 18, 20) ===========================

def check_concurrent_use(
    medications: list,
    patient: Optional[dict] = None,
) -> list:
    """동일성분 중복 검증 (HIRA 1순위 → BLOCK).

    여러 약품이 같은 성분코드(M코드)를 공유하면 동일성분 중복.
    복합제는 성분 집합 교집합으로 검출.
    """
    alerts = []
    drug_codes = {}
    for med in medications:
        seq = int(med['item_seq'])
        codes = DRUG_TO_INGREDIENTS.get(seq)
        if codes:
            drug_codes[seq] = codes

    seqs = list(drug_codes.keys())
    for i, seq_a in enumerate(seqs):
        for seq_b in seqs[i+1:]:
            overlap = drug_codes[seq_a] & drug_codes[seq_b]
            if overlap:
                names_overlap = _format_ingredient_names(overlap)
                alerts.append({
                    'level': LEVEL_BLOCK,
                    'type': 'concurrent_ingredient',
                    'drugs': [seq_a, seq_b],
                    'ingredient_codes': sorted(overlap),
                    'ingredients': names_overlap,
                    'message': (
                        f'동일성분 중복: {_get_drug_name(seq_a)}와 '
                        f'{_get_drug_name(seq_b)}가 공통 성분 [{names_overlap}]을 포함'
                    ),
                })
    return alerts


def check_class_duplication(
    medications: list,
    patient: Optional[dict] = None,
) -> list:
    """효능군 중복 검증 (HIRA 2순위 → WARN).

    여러 약품이 같은 분류명(예: '해열.진통.소염제')을 공유하면 효능군 중복.
    """
    drug_class = {}
    for med in medications:
        seq = int(med['item_seq'])
        cls = DRUG_TO_CLASS.get(seq)
        if cls:
            drug_class[seq] = cls

    by_class = defaultdict(list)
    for seq, cls in drug_class.items():
        by_class[cls].append(seq)

    alerts = []
    for cls, seqs in by_class.items():
        if len(seqs) >= 2:
            names = [_get_drug_name(s) for s in seqs]
            alerts.append({
                'level': LEVEL_WARN,
                'type': 'class_duplicate',
                'drugs': seqs,
                'class_name': cls,
                'message': f'효능군 중복 ({cls}): {", ".join(names)}',
            })
    return alerts


def check_elderly_warning(
    medications: list,
    patient: Optional[dict] = None,
) -> list:
    """노인주의 검증 (HIRA 3순위 → INFO, patient.age ≥ 65 필요).

    환자 컨텍스트 없거나 65세 미만이면 빈 리스트.
    Alert fatigue 회피로 BLOCK 아닌 INFO 등급 사용
    (배성호 외 2021, HIRA 2019 §6-2 권고).
    """
    if patient is None or patient.get('age') is None:
        return []
    if patient['age'] < ELDERLY_AGE_THRESHOLD:
        return []

    alerts = []
    for med in medications:
        seq = int(med['item_seq'])
        codes = DRUG_TO_INGREDIENTS.get(seq, set())
        if not codes:
            continue
        hit = codes & ELDERLY_CAUTION_CODES
        if hit:
            names_hit = _format_ingredient_names(hit)
            alerts.append({
                'level': LEVEL_INFO,
                'type': 'elderly_caution',
                'drug': seq,
                'ingredient_codes': sorted(hit),
                'ingredients': names_hit,
                'message': (
                    f'노인주의 (참고): {_get_drug_name(seq)}에 노인주의 성분 '
                    f'[{names_hit}] 포함 (환자 {patient["age"]}세)'
                ),
            })
    return alerts


def check_dose_limit(
    medications: list,
    patient: Optional[dict] = None,
) -> list:
    """1일 최대 투여량 초과 검증 (HIRA 4순위 → WARN).

    각 약품의 성분별로 사용자 총 복용량(같은 성분 여러 약품 합산)을
    INGREDIENT_TO_MAX_DOSE.max_dose 와 비교.

    Graceful skip:
      - 1일 최대량 미등록 성분 (48% 커버 한계)
      - 단위 불일치 (mg vs 정 등 — 향후 PR에서 단위 변환)
    """
    ingredient_total: dict = defaultdict(lambda: {'total': 0.0, 'unit': '', 'drugs': []})

    for med in medications:
        seq = int(med['item_seq'])
        unit = med['dose_unit']
        amount = float(med['daily_amount'])
        codes = DRUG_TO_INGREDIENTS.get(seq, set())
        for code in codes:
            bucket = ingredient_total[code]
            if not bucket['unit']:
                bucket['unit'] = unit
                bucket['total'] += amount
                bucket['drugs'].append(seq)
            elif bucket['unit'] == unit:
                bucket['total'] += amount
                bucket['drugs'].append(seq)
            else:
                bucket['unit'] = '_MIXED'   # graceful skip 표시

    alerts = []
    for code, info in ingredient_total.items():
        if info['unit'] == '_MIXED':
            continue
        limit = INGREDIENT_TO_MAX_DOSE.get(code)
        if limit is None:
            continue
        if limit['unit'] != info['unit']:
            continue
        if info['total'] > limit['max_dose']:
            name = INGREDIENT_CODE_TO_NAME.get(code, code)
            drug_names = [_get_drug_name(s) for s in info['drugs']]
            actual_unit = info['unit'] if info['unit'] not in ('', '-', 'nan') else ''
            limit_unit = limit['unit'] if limit['unit'] not in ('', '-', 'nan') else ''
            alerts.append({
                'level': LEVEL_WARN,
                'type': 'dose_exceeded',
                'drugs': info['drugs'],
                'ingredient_code': code,
                'ingredient_name': name,
                'actual': info['total'],
                'limit': limit['max_dose'],
                'unit': info['unit'],
                'message': (
                    f'{name} 1일 최대량 초과: '
                    f'총 {info["total"]:.1f}{actual_unit} > 한계 {limit["max_dose"]:.1f}{limit_unit} '
                    f'({", ".join(drug_names)})'
                ),
            })
    return alerts


def check_recall(
    medications: list,
    patient: Optional[dict] = None,
) -> list:
    """회수약 검증 (DUR 외 안전 체크 → BLOCK).

    품목일련번호가 RECALLED_ITEM_SEQS 에 있으면 회수 대상.
    """
    alerts = []
    for med in medications:
        seq = int(med['item_seq'])
        if seq in RECALLED_ITEM_SEQS:
            alerts.append({
                'level': LEVEL_BLOCK,
                'type': 'recall',
                'drug': seq,
                'message': f'회수 대상 약품: {_get_drug_name(seq)} (품목일련번호 {seq})',
            })
    return alerts


# ===== 통합 함수 (03 셀 22) =======================================

def safety_check_all(
    medications: list,
    patient: Optional[dict] = None,
) -> dict:
    """5겹 DUR 안전 검증 통합 실행.

    Args:
        medications: [{'item_seq': int, 'daily_amount': float, 'dose_unit': str}, ...]
        patient: {'age': int} 또는 None (None이면 노인주의 자동 skip)

    Returns:
        04 RAG 입력 컨텍스트로 활용 가능한 dict.
        키: duplicates_ingredient, duplicates_efficacy, elderly_cautions,
            dose_exceeded, recall_warnings, summary

    TODO (다음 단계, 04 RAG 통합 시점):
        본 함수의 반환 dict 를 04 RAG 파이프라인의
        prepare_rag_context(safety=...) 인자로 그대로 전달.
    """
    # 마스터 lazy-load (첫 호출 시 1회 빌드, 이후 재사용)
    build_masters()

    dup_ingr = check_concurrent_use(medications, patient)
    dup_eff = check_class_duplication(medications, patient)
    elderly = check_elderly_warning(medications, patient)
    dose_exc = check_dose_limit(medications, patient)
    recall = check_recall(medications, patient)

    all_alerts = [*dup_ingr, *dup_eff, *elderly, *dose_exc, *recall]
    summary = {
        'total_alerts': len(all_alerts),
        'block_count': sum(1 for a in all_alerts if a['level'] == LEVEL_BLOCK),
        'warn_count': sum(1 for a in all_alerts if a['level'] == LEVEL_WARN),
        'info_count': sum(1 for a in all_alerts if a['level'] == LEVEL_INFO),
    }

    return {
        'duplicates_ingredient': dup_ingr,
        'duplicates_efficacy': dup_eff,
        'elderly_cautions': elderly,
        'dose_exceeded': dose_exc,
        'recall_warnings': recall,
        'summary': summary,
    }
