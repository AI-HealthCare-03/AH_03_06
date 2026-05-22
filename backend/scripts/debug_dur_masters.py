# backend/scripts/debug_dur_masters.py
# DUR 마스터 등록 상태 확인 — alert 안 뜨는 원인 진단용.
# 읽기만 함, DB·마스터 변경 없음.
#
# 주의: `from dur_service import DRUG_TO_INGREDIENTS` 같이 직접 import 하면
# build_masters() 가 모듈 글로벌을 재할당하는 순간 이쪽 바인딩이 끊겨서
# 빈 dict 만 보이는 거짓 음성이 발생함. 모듈을 통째로 import 해서 attribute
# 로 접근하면 항상 최신 상태가 보임.

import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.services import dur_service


dur_service.build_masters()

print(f"DRUG_TO_INGREDIENTS 총 약품 수: {len(dur_service.DRUG_TO_INGREDIENTS):,}")
print(f"INGREDIENT_CODE_TO_NAME 총 성분 수: {len(dur_service.INGREDIENT_CODE_TO_NAME):,}")
print(f"DRUG_TO_CLASS 총 분류 매핑 수: {len(dur_service.DRUG_TO_CLASS):,}")
print(f"INGREDIENT_TO_MAX_DOSE 총 한계 등록 수: {len(dur_service.INGREDIENT_TO_MAX_DOSE):,}")
print(f"RECALLED_ITEM_SEQS 총 회수약 수: {len(dur_service.RECALLED_ITEM_SEQS):,}")
print()
print(f"ELDERLY_CAUTION_CODES ({len(dur_service.ELDERLY_CAUTION_CODES)}개):")
for c in sorted(dur_service.ELDERLY_CAUTION_CODES):
    print(f"  {c}: {dur_service.INGREDIENT_CODE_TO_NAME.get(c, '(이름 미등록)')}")
print()

# 테스트한 약품들 (사용자 시나리오)
test_seqs = [
    (199303108, "타이레놀정500밀리그람"),
    (200811222, "펜잘큐정"),
    (198401243, "부루펜정(이부프로펜)"),
    (200703877, "탁센연질캡슐(나프록센)"),
    (195900035, "디아제팜정"),
    (200401321, "암로디핀정5mg"),
    (200808876, "아토르바스타틴정10mg"),
    # 대조군 (smoke test 통과한 약품)
    (195500005, "중외5%포도당생리식염액 (smoke test 통과)"),
    (195500006, "중외5%포도당주사액 (smoke test 통과)"),
]

print("=" * 70)
print("개별 약품 마스터 등록 확인")
print("=" * 70)
for seq, name in test_seqs:
    codes = dur_service.DRUG_TO_INGREDIENTS.get(seq)
    cls = dur_service.DRUG_TO_CLASS.get(seq)
    print(f"\n[{seq}] {name}")
    if codes:
        print(f"  O 등록됨 | 분류: [{cls}]")
        for c in sorted(codes):
            kr_name = dur_service.INGREDIENT_CODE_TO_NAME.get(c, "(?)")
            max_dose_info = dur_service.INGREDIENT_TO_MAX_DOSE.get(c)
            if max_dose_info:
                limit_str = f"1일 한계 {max_dose_info['max_dose']}{max_dose_info['unit']}"
            else:
                limit_str = "1일 한계 미등록"
            elderly_flag = " [노인주의]" if c in dur_service.ELDERLY_CAUTION_CODES else ""
            print(f"    - {c} ({kr_name}) — {limit_str}{elderly_flag}")
    else:
        print(f"  X 미등록 — DRUG_TO_INGREDIENTS에 없음")

print()
print("=" * 70)
print("진단 끝.")
