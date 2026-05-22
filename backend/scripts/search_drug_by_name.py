# backend/scripts/search_drug_by_name.py
# 약품명 일부로 item_seq 역검색 — DUR 테스트 시나리오 만들 때 진짜 일련번호 찾는 용도.
# 읽기만 함.
#
# 사용법:
#   docker exec viva_backend python scripts/search_drug_by_name.py
#       → 기본 키워드 7개 (타이레놀, 펜잘, 부루펜, 탁센, 디아제팜, 암로디핀, 아토르바스타틴)
#   docker exec viva_backend python scripts/search_drug_by_name.py 타이레놀 게보린
#       → 인자로 키워드 지정

import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.services import dur_service


DEFAULT_KEYWORDS = [
    "타이레놀",
    "펜잘",
    "부루펜",
    "탁센",
    "디아제팜",
    "암로디핀",
    "아토르바스타틴",
]

MAX_MATCHES_SHOWN = 5


def main() -> None:
    keywords = sys.argv[1:] or DEFAULT_KEYWORDS

    dur_service.build_masters()

    elderly = dur_service.ELDERLY_CAUTION_CODES

    for kw in keywords:
        matches = [
            (seq, name)
            for seq, name in dur_service._DRUG_NAME_BY_SEQ.items()
            if kw in str(name)
        ]
        print(f'\n=== "{kw}" 검색 ({len(matches)}건) ===')

        if not matches:
            print("  (검색 결과 없음 — 다른 표기 시도해보세요)")
            continue

        # 품목일련번호 오름차순 — 동일 약품의 변천 흐름 보기 쉬움
        matches.sort(key=lambda x: x[0])

        for seq, name in matches[:MAX_MATCHES_SHOWN]:
            codes = dur_service.DRUG_TO_INGREDIENTS.get(seq, set())
            ingr_names = sorted(
                dur_service.INGREDIENT_CODE_TO_NAME.get(c, c) for c in codes
            )
            recall_flag = " [회수약]" if seq in dur_service.RECALLED_ITEM_SEQS else ""
            elderly_flag = " [노인주의]" if codes & elderly else ""
            cls = dur_service.DRUG_TO_CLASS.get(seq, "")
            cls_str = f" | [{cls}]" if cls else ""

            display_name = name[:38] if len(str(name)) > 38 else name
            print(
                f"  {seq}  {display_name:<38}  성분={ingr_names}{cls_str}"
                f"{elderly_flag}{recall_flag}"
            )

        if len(matches) > MAX_MATCHES_SHOWN:
            print(f"  ... 외 {len(matches) - MAX_MATCHES_SHOWN}건")

    print()
    print("=" * 70)
    print("검색 끝.")


if __name__ == "__main__":
    main()
