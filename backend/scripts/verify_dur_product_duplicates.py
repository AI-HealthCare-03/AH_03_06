# backend/scripts/verify_dur_product_duplicates.py
# CSV에서 (dur_seq, item_seq_a, item_seq_b) 동일 키 그룹의 실제 내용을 점검.
# - 모든 필드 동일 → 진짜 중복(폐기 OK)
# - 일부 필드만 다름 → 정보 손실 가능 (예: 같은 약품쌍에 대해 prohibition_reason이 두 가지)
# 읽기만 함 — DB는 안 건드림.

import csv
import os
import sys
from collections import defaultdict

csv.field_size_limit(sys.maxsize)
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

CSV_PATH = "/app/ml_data/OpenData_PotOpenDurItem_AC20260513.csv"

# 키와 함께 비교할 필드들
COMPARE_FIELDS = ("금기내용", "고시일자", "변경일자", "품목명", "병용금기품목명", "DUR유형명")


def clean(v):
    v = (v or "").strip().strip('"')
    return None if not v or v == "-" else v


def parse_int(v):
    v = clean(v)
    if v is None:
        return None
    try:
        return int(v)
    except ValueError:
        return None


def main():
    # 키별로 모든 행 모으기
    groups = defaultdict(list)
    with open(CSV_PATH, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f, quoting=csv.QUOTE_NONE)
        for r in reader:
            dur_seq = parse_int(r["DUR일련번호"])
            a = parse_int(r["품목일련번호"])
            b = parse_int(r["병용금기품목기준코드"])
            if dur_seq is None or a is None or b is None:
                continue
            key = (dur_seq, a, b)
            groups[key].append({f: clean(r[f]) for f in COMPARE_FIELDS})

    dup_groups = {k: v for k, v in groups.items() if len(v) > 1}
    total_extra = sum(len(v) - 1 for v in dup_groups.values())
    print(f"키 그룹 총 수: {len(groups)}")
    print(f"  그 중 중복 그룹(>=2행): {len(dup_groups)}개")
    print(f"  적재 시 스킵된 잉여 행 수(예상): {total_extra}건")
    print()

    # 중복 그룹 분석
    all_same_groups = 0  # 모든 필드 동일
    all_same_sample = []   # 케이스 A 샘플 보관
    differ_groups = []   # 일부 필드 다름
    differing_field_counter = defaultdict(int)

    for key, rows in dup_groups.items():
        first = rows[0]
        if all(r == first for r in rows[1:]):
            all_same_groups += 1
            if len(all_same_sample) < 2:
                all_same_sample.append((key, rows))
        else:
            differ_groups.append((key, rows))
            # 어느 필드가 다른지 카운트
            for f in COMPARE_FIELDS:
                values = {r[f] for r in rows}
                if len(values) > 1:
                    differing_field_counter[f] += 1

    print("=" * 70)
    print(f"중복 그룹 분석")
    print("=" * 70)
    print(f"  모든 필드 동일(케이스 A — 진짜 중복):   {all_same_groups}개")
    print(f"  일부 필드 다름(케이스 B — 정보 손실 가능): {len(differ_groups)}개")
    print()

    if all_same_sample:
        print("케이스 A 샘플 (모든 필드가 동일한 중복):")
        for key, rows in all_same_sample:
            print(f"  키 dur_seq={key[0]}, item_a={key[1]}, item_b={key[2]}  ({len(rows)}행 — 아래 행들 모두 동일):")
            for i, r in enumerate(rows, 1):
                pr = (r["금기내용"] or "")[:50]
                print(f"    [{i}] 유형={r['DUR유형명']!r}  품목A={r['품목명']!r}  품목B={r['병용금기품목명']!r}")
                print(f"        고시={r['고시일자']}  변경={r['변경일자']}  금기={pr!r}...")
            print()

    if differ_groups:
        print("케이스 B에서 어떤 필드가 자주 다른지:")
        for f, cnt in sorted(differing_field_counter.items(), key=lambda x: -x[1]):
            print(f"  {f}: {cnt}개 그룹에서 다름")
        print()
        print("샘플 (최대 3개):")
        for key, rows in differ_groups[:3]:
            print(f"  키 dur_seq={key[0]}, item_a={key[1]}, item_b={key[2]} ({len(rows)}행):")
            for i, r in enumerate(rows, 1):
                pr = (r["금기내용"] or "")[:60]
                print(f"    [{i}] 고시={r['고시일자']}, 변경={r['변경일자']}, 금기내용={pr!r}...")
            print()


if __name__ == "__main__":
    main()
