import requests
import os

TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMCIsImV4cCI6MTc4MDM4NzcxOH0.yPFQx7_tH-OWDYVFVlDSSYzzVJcBIG6Zrj35Knd18ak"
BASE = "http://localhost:8000/api/v1"
HEADERS = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

session = requests.post(f"{BASE}/chat/sessions", json={"context_type": "HEALTH_CHECKUP", "context_id": None}, headers=HEADERS).json()
session_id = session["id"]
print(f"세션 ID: {session_id}\n")

questions = [
    # 혈압
    ("내 혈압 수치가 정상인가요?",          "혈압이 궁금해요"),
    ("혈압을 낮추려면 어떻게 해야 하나요?", "혈압이 궁금해요"),
    ("고혈압 위험이 있나요?",               "혈압이 궁금해요"),

    # 혈당
    ("혈당 수치가 위험한가요?",      "혈당이 궁금해요"),
    ("혈당을 낮추는 방법이 있나요?", "혈당이 궁금해요"),
    ("당뇨 전단계인가요?",           "혈당이 궁금해요"),

    # 전반적인 건강 상태
    ("어떤 부분을 개선해야 하나요?",    "전반적인 건강 상태가 궁금해요"),
    ("다음 검진은 언제 받아야 하나요?", "전반적인 건강 상태가 궁금해요"),
    ("가장 주의해야 할 수치가 뭔가요?", "전반적인 건강 상태가 궁금해요"),
]

output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_result_health.txt")

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