import os
from datetime import date
from sqlalchemy.orm import Session
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_openai import ChatOpenAI

from app.models.health_checkup import HealthCheckup
from app.models.user import UserProfile
from app.models.exercise_guide import ExerciseGuide


# ──────────────────────────────────────────────
# CVD 점수 계산
# ──────────────────────────────────────────────

def calculate_cvd_score(sbp: float, glucose: float, cholesterol: float,
                         age: int, bmi: float, waist: float) -> float:
    score = (
        (sbp         / 200) * 0.25 +
        (glucose     / 300) * 0.20 +
        (cholesterol / 300) * 0.15 +
        (age         /  80) * 0.15 +
        (bmi         /  40) * 0.15 +
        (waist       / 120) * 0.10
    )
    return round(min(score, 1.0), 4)


def get_cvd_range(score: float) -> str:
    if score < 0.45:  return "low"
    elif score < 0.60: return "moderate"
    elif score < 0.75: return "high"
    else:              return "very_high"


def get_intensity_label(cvd_range: str) -> str:
    return {
        "low":       "고강도",
        "moderate":  "중강도",
        "high":      "저강도",
        "very_high": "운동 제한",
    }[cvd_range]


def get_age_group(age: int) -> str:
    if age < 19:   return "child"
    elif age < 65: return "adult"
    else:          return "elderly"


def get_conditions(sbp: float, glucose: float, bmi: float) -> list[str]:
    conditions = []
    if sbp >= 120:     conditions.append("hypertension")
    if glucose >= 100: conditions.append("diabetes")
    if bmi >= 23:      conditions.append("obesity")
    if not conditions: conditions.append("general")
    return conditions


# ──────────────────────────────────────────────
# RAG 검색 키워드 (CVD 구간별)
# ──────────────────────────────────────────────

CVD_SEARCH_KEYWORDS = {
    "low":       "고강도 유산소운동 근력운동 주 75분 건강한 성인 운동 권장",
    "moderate":  "중강도 유산소운동 주 150분 근력운동 만성질환 예방 운동",
    "high":      "저강도 운동 고혈압 비만 심혈관 위험 운동 전 의사 상담 준비운동",
    "very_high": "운동 제한 심혈관 위험 의료진 처방 운동 금기 주의사항",
}


class ExerciseService:

    def __init__(self):
        self.embeddings = HuggingFaceEmbeddings(
            model_name="jhgan/ko-sroberta-multitask"
        )
        self.vectordb = Chroma(
            collection_name    = "exercise_guidelines",
            persist_directory  = os.getenv("CHROMA_DB_PATH", "./data/chroma_db"),
            embedding_function = self.embeddings,
        )
        self.llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3)

    # ── DB 조회 ──────────────────────────────────

    def get_checkup_by_id(self, db: Session, checkup_id: int, user_id: int) -> dict | None:
        checkup = db.query(HealthCheckup).filter(
            HealthCheckup.id      == checkup_id,
            HealthCheckup.user_id == user_id,
        ).first()
        if not checkup:
            return None

        profile = db.query(UserProfile).filter(
            UserProfile.user_id == user_id
        ).first()

        age = None
        if profile and profile.birthday:
            from datetime import date as d
            today = d.today()
            age   = today.year - profile.birthday.year - (
                (today.month, today.day) < (profile.birthday.month, profile.birthday.day)
            )

        gender = None
        if profile and profile.gender:
            gender = "남성" if profile.gender == "M" else "여성"

        bmi = round(
            float(checkup.weight) / ((float(checkup.height) / 100) ** 2), 1
        ) if checkup.height and checkup.weight else None

        return {
            "sbp":         float(checkup.bp_systolic)      if checkup.bp_systolic      else None,
            "glucose":     float(checkup.fasting_glucose)  if checkup.fasting_glucose  else None,
            "cholesterol": float(checkup.total_cholesterol) if checkup.total_cholesterol else None,
            "bmi":         bmi,
            "waist":       float(checkup.waist)            if checkup.waist            else None,
            "height":      float(checkup.height)           if checkup.height           else None,
            "weight":      float(checkup.weight)           if checkup.weight           else None,
            "age":         age,
            "gender":      gender,
        }

    def get_latest_checkup_by_user(self, db: Session, user_id: int) -> dict | None:
        """user_id로 가장 최근 검진 데이터 조회"""
        checkup = db.query(HealthCheckup).filter(
            HealthCheckup.user_id == user_id
        ).order_by(HealthCheckup.checkup_year.desc()).first()
        if not checkup:
            return None
        return self.get_checkup_by_id(db, checkup.id, user_id)

    # ── 가이드 저장/조회 ─────────────────────────

    def get_guide_by_date(self, db: Session, user_id: int, guide_date: date) -> dict | None:
        """날짜로 저장된 운동 가이드 조회"""
        guide = db.query(ExerciseGuide).filter(
            ExerciseGuide.user_id    == user_id,
            ExerciseGuide.guide_date == guide_date,
        ).first()
        if not guide:
            return None
        return {
            "guide_date":      guide.guide_date,
            "cvd_score":       guide.cvd_score,
            "cvd_range":       guide.cvd_range,
            "intensity_label": guide.intensity_label,
            "conditions":      guide.conditions.split(",") if guide.conditions else [],
            "exercise_guide":  guide.exercise_guide,
        }

    def save_guide(self, db: Session, user_id: int, guide_date: date, result: dict):
        """운동 가이드 DB 저장 (날짜 중복 시 덮어쓰기)"""
        existing = db.query(ExerciseGuide).filter(
            ExerciseGuide.user_id    == user_id,
            ExerciseGuide.guide_date == guide_date,
        ).first()

        conditions_str = ",".join(result["conditions"]) if result["conditions"] else ""

        if existing:
            existing.cvd_score       = result["cvd_score"]
            existing.cvd_range       = result["cvd_range"]
            existing.intensity_label = result["intensity_label"]
            existing.conditions      = conditions_str
            existing.exercise_guide  = result["exercise_guide"]
        else:
            db.add(ExerciseGuide(
                user_id         = user_id,
                guide_date      = guide_date,
                cvd_score       = result["cvd_score"],
                cvd_range       = result["cvd_range"],
                intensity_label = result["intensity_label"],
                conditions      = conditions_str,
                exercise_guide  = result["exercise_guide"],
            ))
        db.commit()

    # ── 가이드 생성 ──────────────────────────────

    def generate_exercise_guide(self, db: Session, user_id: int, checkup: dict,
                                 target_date: date | None = None) -> dict:
        if target_date is None:
            target_date = date.today()

        sbp         = checkup.get("sbp")         or 120.0
        glucose     = checkup.get("glucose")     or 100.0
        cholesterol = checkup.get("cholesterol") or 200.0
        bmi         = checkup.get("bmi")         or 22.0
        waist       = checkup.get("waist")       or 80.0
        age         = checkup.get("age")         or 40
        gender      = checkup.get("gender")      or "남성"

        cvd_score       = calculate_cvd_score(sbp, glucose, cholesterol, age, bmi, waist)
        cvd_range       = get_cvd_range(cvd_score)
        intensity_label = get_intensity_label(cvd_range)
        age_group       = get_age_group(age)
        conditions      = get_conditions(sbp, glucose, bmi)

        keyword  = CVD_SEARCH_KEYWORDS[cvd_range]
        rag_docs = self.vectordb.similarity_search(keyword, k=5)
        rag_text = "\n".join([
            f"- ({doc.metadata.get('source', '가이드라인')}) {doc.page_content[:200]}"
            for doc in rag_docs
        ])

        prompt = f"""당신은 개인 맞춤형 운동 상담 AI입니다.
반드시 아래 [운동 가이드 근거 문헌]만을 근거로 답변하세요.
모든 답변은 한국어로 작성하세요.
의학적 진단이나 처방은 하지 않으며 반드시 의사·운동전문가 상담을 권고하세요.

[사용자 건강 정보]
나이: {age}세 / 성별: {gender}
BMI: {bmi} kg/m² / 허리둘레: {waist} cm
수축기혈압: {sbp} mmHg / 공복혈당: {glucose} mg/dL / 총콜레스테롤: {cholesterol} mg/dL

[CVD 위험도 평가]
CVD 점수: {cvd_score} (0~1 범위)
위험 구간: {cvd_range} ({'저위험' if cvd_range=='low' else '중위험' if cvd_range=='moderate' else '고위험' if cvd_range=='high' else '초고위험'})
권장 운동강도: {intensity_label}
동반 상태: {', '.join(conditions)}
연령 그룹: {age_group}

[CVD 구간별 운동 강도 기준]
- CVD 0.0~0.3 (저위험):   고강도 가능, 주 75~150분 고강도 또는 주 150~300분 중강도
- CVD 0.3~0.6 (중위험):   중강도 권장, 주 150분 이상 중강도 유산소
- CVD 0.6~0.8 (고위험):   저강도 권장, 주 90~150분, 운동 전 의사 상담 권고
- CVD 0.8 이상 (초고위험): 운동 제한, 반드시 의료진 평가 후 개인 맞춤 처방 필요

[운동 가이드 근거 문헌]
{rag_text}

위 정보를 바탕으로 다음 형식으로 개인 맞춤형 운동 가이드를 작성해주세요.

[운동 강도]
권장 강도와 그 이유를 CVD 점수와 연결하여 설명하세요.

[권장 운동 종류]
유산소운동:
근력운동:
{'평형성운동:' if age_group == 'elderly' else ''}

[운동 시간 및 빈도]
주간 목표 시간과 빈도를 안내하세요.

[주의사항]
건강 상태별 주의사항과 즉시 중단해야 하는 증상을 안내하세요.
"""

        response = self.llm.invoke(prompt)

        result = {
            "guide_date":      target_date,
            "cvd_score":       cvd_score,
            "cvd_range":       cvd_range,
            "intensity_label": intensity_label,
            "conditions":      conditions,
            "exercise_guide":  response.content,
        }

        # DB 저장
        self.save_guide(db, user_id, target_date, result)

        return result