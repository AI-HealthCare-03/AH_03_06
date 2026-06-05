import requests
import os

TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMCIsImV4cCI6MTc4MDM5MDY1MH0.3cDfczVhv6LHDH3_Plw0oZZGLQUjFhPsLnHt9MnLwgc"
BASE = "http://localhost:8000/api/v1"
HEADERS = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

session = requests.post(f"{BASE}/chat/sessions", json={"context_type": "PRESCRIPTION", "context_id": None}, headers=HEADERS).json()
session_id = session["id"]
print(f"세션 ID: {session_id}\n")

questions = [
    # 복용 방법
    ("언제 복용하는 게 좋나요?",            "복용 방법이 궁금해요"),
    ("음식과 함께 먹어도 되나요?",          "복용 방법이 궁금해요"),
    ("복용을 빠뜨리면 어떻게 해야 하나요?", "복용 방법이 궁금해요"),

    # 부작용
    ("이 약들 부작용이 있나요?",            "부작용이 궁금해요"),
    ("부작용이 생기면 어떻게 해야 하나요?", "부작용이 궁금해요"),
    ("장기 복용해도 괜찮나요?",             "부작용이 궁금해요"),

    # 약 조합
    ("이 약들 함께 먹어도 되나요?",   "약 조합이 궁금해요"),
    ("주의해야 할 음식이 있나요?",     "약 조합이 궁금해요"),
    ("다른 약과 함께 먹어도 되나요?", "약 조합이 궁금해요"),
]

output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_result_prescription.txt")

with open(output_path, "w", encoding="utf-8") as f:
    for q, category in questions:
        res = requests.post(
            f"{BASE}/chat/sessions/{session_id}/messages",
            json={"message": q, "category": category},
            headers=HEADERS
        ).json()
        line = f"[{category}]\nQ: {q}\nA: {res.get('message', res)}\n{'='*80}\n"
        print(line)
        f.write(line)

print(f"결과가 저장됐습니다: {output_path}")