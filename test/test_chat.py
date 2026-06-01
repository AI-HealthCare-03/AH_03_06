import requests
import os

TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMCIsImV4cCI6MTc4MDMxODQwOH0.lYejuSI4-eX_PYufIZJFKGT8DAX2Tk3FHqa6O3NvUH8"
BASE = "http://localhost:8000/api/v1"
HEADERS = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

session = requests.post(f"{BASE}/chat/sessions", json={"context_type": "DIET_GUIDE", "context_id": None}, headers=HEADERS).json()
session_id = session["id"]
print(f"세션 ID: {session_id}\n")

questions = [
    ("왜 이 식단 플랜이 추천됐나요?", "식단 플랜이 궁금해요"),
    ("다른 식단 플랜은 어떤 게 있나요?", "식단 플랜이 궁금해요"),
    ("이 식단 플랜이 제 건강에 맞나요?", "식단 플랜이 궁금해요"),
    ("식단 플랜을 바꿀 수 있나요?", "식단 플랜이 궁금해요"),
    ("권장 칼로리는 어떻게 계산됐나요?", "영양소 계산이 궁금해요"),
    ("단백질을 더 먹어도 되나요?", "영양소 계산이 궁금해요"),
    ("탄수화물을 줄이면 어떤 효과가 있나요?", "영양소 계산이 궁금해요"),
    ("지방은 어떤 종류를 먹어야 하나요?", "영양소 계산이 궁금해요"),
    ("제한 식품을 꼭 지켜야 하나요?", "실천 방법이 궁금해요"),
    ("점심에 먹을 외식 메뉴가 궁금해요", "실천 방법이 궁금해요"),
    ("점심에 삼겹살 먹어도 되나요?", "실천 방법이 궁금해요"),
]

output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_result_v2.txt")

with open(output_path, "w", encoding="utf-8") as f:
    for q, category in questions:
        res = requests.post(f"{BASE}/chat/sessions/{session_id}/messages", json={"message": q, "category": category}, headers=HEADERS).json()
        line = f"[{category}]\nQ: {q}\nA: {res['message']}\n{'='*80}\n"
        print(line)
        f.write(line)

print(f"결과가 저장됐습니다: {output_path}")