# backend/scripts/download_avatars.py
# 실행: python backend/scripts/download_avatars.py

import os
import urllib.request

STYLE = "bottts-neutral"
VERSION = "9.x"

PROFILES = [
    {"filename": "profile_01", "seed": "alpha"},
    {"filename": "profile_02", "seed": "beta"},
    {"filename": "profile_03", "seed": "gamma"},
    {"filename": "profile_04", "seed": "delta"},
    {"filename": "profile_05", "seed": "epsilon"},
    {"filename": "profile_06", "seed": "zeta"},
    {"filename": "profile_07", "seed": "eta"},
    {"filename": "profile_08", "seed": "theta"},
    {"filename": "profile_09", "seed": "iota"},
    {"filename": "profile_10", "seed": "kappa"},
]

SAVE_DIR = os.path.join(
    os.path.dirname(__file__), "..", "app", "static", "avatars"
)


def main():
    os.makedirs(SAVE_DIR, exist_ok=True)

    for item in PROFILES:
        url = f"https://api.dicebear.com/{VERSION}/{STYLE}/svg?seed={item['seed']}"
        save_path = os.path.join(SAVE_DIR, f"{item['filename']}.svg")

        if os.path.exists(save_path):
            print(f"[SKIP] {item['filename']}.svg 이미 존재")
            continue

        try:
            urllib.request.urlretrieve(url, save_path)
            print(f"[OK] {item['filename']}.svg 저장 완료")
        except Exception as e:
            print(f"[FAIL] {item['filename']}.svg 실패: {e}")

    print(f"\n완료 — {SAVE_DIR}")


if __name__ == "__main__":
    main()