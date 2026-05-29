import os
import re
from datetime import date
from sqlalchemy.orm import Session
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings, ChatOpenAI

from app.repositories.diet import NutrientStandardRepository, DietGuideRepository
from app.models.diet import NutrientStandard, DietGuide
from app.models.health_checkup import HealthCheckup
from app.models.user import UserProfile


GROUP_TO_MEAL_PLAN = {
    '정상군':           'Balanced Diet',
    '고혈압군':          'Low-Sodium Diet',
    '혈당이상군':         'Low-Carb Diet',
    '비만군':            'Low-Calorie Diet',
    '고혈압+혈당이상군':   'Low-Carb Low-Sodium Diet',
    '고혈압+비만군':      'Low-Calorie Low-Sodium Diet',
    '혈당이상+비만군':    'Low-Carb Low-Calorie Diet',
    '복합위험군':         'Therapeutic Diet',
}

GROUP_COEFFICIENTS = {
    '정상군':           {'kcal_per_kg': 30, 'protein_per_kg': 0.9, 'carb_ratio': 0.55, 'fat_ratio': 0.25},
    '고혈압군':          {'kcal_per_kg': 30, 'protein_per_kg': 0.9, 'carb_ratio': 0.55, 'fat_ratio': 0.25},
    '혈당이상군':         {'kcal_per_kg': 28, 'protein_per_kg': 1.0, 'carb_ratio': 0.45, 'fat_ratio': 0.25},
    '비만군':            {'kcal_per_kg': 25, 'protein_per_kg': 1.0, 'carb_ratio': 0.50, 'fat_ratio': 0.25},
    '고혈압+혈당이상군':   {'kcal_per_kg': 28, 'protein_per_kg': 1.0, 'carb_ratio': 0.45, 'fat_ratio': 0.25},
    '고혈압+비만군':      {'kcal_per_kg': 25, 'protein_per_kg': 1.0, 'carb_ratio': 0.50, 'fat_ratio': 0.20},
    '혈당이상+비만군':    {'kcal_per_kg': 25, 'protein_per_kg': 1.1, 'carb_ratio': 0.45, 'fat_ratio': 0.20},
    '복합위험군':         {'kcal_per_kg': 25, 'protein_per_kg': 1.1, 'carb_ratio': 0.45, 'fat_ratio': 0.20},
}

GROUP_SEARCH_KEYWORDS = {
    '정상군':           '성인 균형 식단 탄수화물 단백질 지방 적정 섭취 비율',
    '고혈압군':          '고혈압 환자 나트륨 제한 DASH 식단 생활습관 교정',
    '혈당이상군':         '당뇨 전단계 탄수화물 섭취 비율 제한 혈당 조절 식사요법',
    '비만군':            '비만 체중 감량 칼로리 제한 식이요법 목표',
    '고혈압+혈당이상군':   '고혈압 당뇨 나트륨 탄수화물 동시 제한 식사요법',
    '고혈압+비만군':      '고혈압 비만 체중 감량 나트륨 제한 칼로리 식단',
    '혈당이상+비만군':    '당뇨 비만 저탄수화물 저칼로리 체중 감량 혈당 개선',
    '복합위험군':         '고혈압 당뇨 비만 복합 만성질환 식이요법 생활습관 교정',
}


def assign_group(sbp: float, dbp: float, fbs: float, bmi: float,
                 waist: float | None = None, gender: int = 1) -> str:
    sbp_c   = 0 if sbp < 120 else (1 if sbp < 140 else 2)
    dbp_c   = 0 if dbp < 80  else (1 if dbp < 90  else 2)
    fbs_c   = 0 if fbs < 100 else (1 if fbs < 126 else 2)
    bmi_c   = 0 if bmi < 23  else (1 if bmi < 25  else 2)
    waist_c = 0 if waist is None else (
        2 if (waist >= 85 if gender == 2 else waist >= 90) else 0
    )

    hypertension = (sbp_c >= 1) or (dbp_c >= 1)
    glucose      = (fbs_c >= 1)
    obesity      = (bmi_c >= 1) or (waist_c >= 1)
    count        = sum([hypertension, glucose, obesity])

    if count == 0:                       return '정상군'
    elif count == 3:                     return '복합위험군'
    elif hypertension and glucose:       return '고혈압+혈당이상군'
    elif hypertension and obesity:       return '고혈압+비만군'
    elif glucose and obesity:            return '혈당이상+비만군'
    elif hypertension:                   return '고혈압군'
    elif glucose:                        return '혈당이상군'
    else:                                return '비만군'


def calculate_nutrient(age: int, gender: int, height: float,
                        weight: float, group: str) -> dict:
    coef     = GROUP_COEFFICIENTS.get(group, GROUP_COEFFICIENTS['정상군'])
    calories = round(weight * coef['kcal_per_kg'])
    if age >= 65:   calories = round(calories * 0.9)
    if gender == 2: calories = round(calories * 0.9)
    protein  = round(weight * coef['protein_per_kg'], 2)
    carbs    = round(calories * coef['carb_ratio'] / 4, 2)
    fat      = round(calories * coef['fat_ratio'] / 9, 2)
    return {
        'meal_plan_type':        GROUP_TO_MEAL_PLAN.get(group, 'Balanced Diet'),
        'recommended_calories':  calories,
        'recommended_protein':   protein,
        'recommended_carbs':     carbs,
        'recommended_fat':       fat,
    }


def _parse_diet_guide(content: str) -> dict:
    def extract(pattern):
        match = re.search(pattern, content, re.DOTALL)
        return match.group(1).strip() if match else None

    breakfast         = extract(r'아침[:\s]*(.*?)(?=점심|$)')
    lunch             = extract(r'점심[:\s]*(.*?)(?=저녁|$)')
    dinner            = extract(r'저녁[:\s]*(.*?)(?=\[권장|$)')
    recommended_foods = extract(r'\[권장 식품\](.*?)(?=\[제한|$)')
    restricted_foods  = extract(r'\[제한 식품\](.*?)(?=\[영양소|$)')
    nutrient_summary  = extract(r'\[영양소 요약\](.*?)$')

    actual_calories = actual_protein = actual_carbs = actual_fat = None
    if nutrient_summary:
        cal  = re.search(r'칼로리[^\d]*(\d+)', nutrient_summary)
        prot = re.search(r'단백질[^\d]*(\d+\.?\d*)', nutrient_summary)
        carb = re.search(r'탄수화물[^\d]*(\d+\.?\d*)', nutrient_summary)
        fat  = re.search(r'지방[^\d]*(\d+\.?\d*)', nutrient_summary)
        if cal:  actual_calories = int(cal.group(1))
        if prot: actual_protein  = float(prot.group(1))
        if carb: actual_carbs    = float(carb.group(1))
        if fat:  actual_fat      = float(fat.group(1))

    return {
        'breakfast':         breakfast,
        'lunch':             lunch,
        'dinner':            dinner,
        'recommended_foods': recommended_foods,
        'restricted_foods':  restricted_foods,
        'actual_calories':   actual_calories,
        'actual_protein':    actual_protein,
        'actual_carbs':      actual_carbs,
        'actual_fat':        actual_fat,
    }


class DietService:

    def __init__(self):
        self.embeddings = OpenAIEmbeddings(model='text-embedding-3-small')
        self.vectordb   = Chroma(
            persist_directory=os.getenv('CHROMA_DB_PATH', './data/chroma_db'),
            embedding_function=self.embeddings,
        )
        self.llm = ChatOpenAI(model='gpt-4o-mini', temperature=0.3)

    def get_checkup_by_id(self, db: Session, checkup_id: int, user_id: int):
        checkup = db.query(HealthCheckup).filter(
            HealthCheckup.id == checkup_id,
            HealthCheckup.user_id == user_id,
        ).first()

        if not checkup:
            return None

        profile = db.query(UserProfile).filter(
            UserProfile.user_id == user_id
        ).first()

        age = None
        if profile and profile.birthday:
            today = date.today()
            age   = today.year - profile.birthday.year - (
                (today.month, today.day) < (profile.birthday.month, profile.birthday.day)
            )

        gender = None
        if profile and profile.gender:
            gender = 1 if profile.gender == 'M' else 2

        bmi = round(
            float(checkup.weight) / ((float(checkup.height) / 100) ** 2), 1
        ) if checkup.height and checkup.weight else None

        return {
            'sbp':    checkup.bp_systolic,
            'dbp':    checkup.bp_diastolic,
            'fbs':    checkup.fasting_glucose,
            'bmi':    bmi,
            'waist':  float(checkup.waist) if checkup.waist else None,
            'height': float(checkup.height) if checkup.height else None,
            'weight': float(checkup.weight) if checkup.weight else None,
            'age':    age,
            'gender': gender,
        }

    def get_diet_guide(self, db: Session, diet_guide_id: int, user_id: int):
        diet_guide = DietGuideRepository.get_by_id(db, diet_guide_id, user_id)
        if not diet_guide:
            return None

        nutrient_standard = NutrientStandardRepository.get_by_user_id(db, user_id)

        return {
            'id':               diet_guide.id,
            'meal_plan_type':   nutrient_standard.meal_plan_type,
            'nutrient_standard': {
                'recommended_calories': nutrient_standard.recommended_calories,
                'recommended_protein':  float(nutrient_standard.recommended_protein),
                'recommended_carbs':    float(nutrient_standard.recommended_carbs),
                'recommended_fat':      float(nutrient_standard.recommended_fat),
            },
            'breakfast':         diet_guide.breakfast,
            'lunch':             diet_guide.lunch,
            'dinner':            diet_guide.dinner,
            'recommended_foods': diet_guide.recommended_foods,
            'restricted_foods':  diet_guide.restricted_foods,
            'nutrient_achievement': {
                'calories': round(diet_guide.actual_calories / nutrient_standard.recommended_calories * 100) if diet_guide.actual_calories else None,
                'protein':  round(float(diet_guide.actual_protein) / float(nutrient_standard.recommended_protein) * 100) if diet_guide.actual_protein else None,
                'carbs':    round(float(diet_guide.actual_carbs) / float(nutrient_standard.recommended_carbs) * 100) if diet_guide.actual_carbs else None,
                'fat':      round(float(diet_guide.actual_fat) / float(nutrient_standard.recommended_fat) * 100) if diet_guide.actual_fat else None,
            },
            'is_verified': diet_guide.is_verified,
            'created_at':  diet_guide.created_at,
        }

    def get_diet_guide_list(self, db: Session, user_id: int):
        guides = DietGuideRepository.get_list_by_user_id(db, user_id)
        nutrient_standards = {
            ns.id: ns for ns in [
                NutrientStandardRepository.get_by_user_id(db, user_id)
            ] if ns
        }
        return [
            {
                'id':             g.id,
                'meal_plan_type': nutrient_standards.get(g.nutrient_standard_id, NutrientStandard()).meal_plan_type if g.nutrient_standard_id in nutrient_standards else '',
                'is_verified':    g.is_verified,
                'created_at':     g.created_at,
            }
            for g in guides
        ]

    def generate_diet_guide(self, db: Session, user_id: int, checkup: dict):
        bmi   = checkup.get('bmi') or round(
            checkup['weight'] / ((checkup['height'] / 100) ** 2), 1
        )
        group = assign_group(
            sbp    = checkup['sbp'],
            dbp    = checkup['dbp'],
            fbs    = checkup['fbs'],
            bmi    = bmi,
            waist  = checkup.get('waist'),
            gender = checkup.get('gender', 1),
        )

        nutrient = calculate_nutrient(
            age    = checkup['age'],
            gender = checkup.get('gender', 1),
            height = checkup['height'],
            weight = checkup['weight'],
            group  = group,
        )

        nutrient_standard = NutrientStandardRepository.create(
            db                   = db,
            user_id              = user_id,
            meal_plan_type       = nutrient['meal_plan_type'],
            recommended_calories = nutrient['recommended_calories'],
            recommended_protein  = nutrient['recommended_protein'],
            recommended_carbs    = nutrient['recommended_carbs'],
            recommended_fat      = nutrient['recommended_fat'],
        )

        keyword  = GROUP_SEARCH_KEYWORDS.get(group, '균형 식단')
        rag_docs = self.vectordb.similarity_search(keyword, k=2)
        rag_text = '\n'.join([
            f'- ({doc.metadata["source"]}) {doc.page_content[:150]}'
            for doc in rag_docs
        ])

        prompt = f"""당신은 한국인 영양사입니다. 아래 정보를 바탕으로 개인 맞춤형 식단 가이드를 작성해주세요.

반드시 한국인이 일상적으로 먹는 식재료와 음식으로만 구성하세요.
예: 현미밥, 된장국, 나물, 생선구이, 두부조림, 잡곡밥, 김치, 미역국 등
퀴노아, 아보카도, 연어 스테이크 등 비일상적인 서양식 식재료는 절대 사용하지 마세요.

[사용자 정보]
나이: {checkup['age']}세 / 성별: {'남성' if checkup.get('gender', 1) == 1 else '여성'}
신장: {checkup['height']}cm / 체중: {checkup['weight']}kg / BMI: {bmi}
건강 그룹: {group}

[영양소 기준]
식단 플랜: {nutrient['meal_plan_type']}
권장 칼로리: {nutrient['recommended_calories']} kcal
권장 단백질: {nutrient['recommended_protein']} g
권장 탄수화물: {nutrient['recommended_carbs']} g
권장 지방: {nutrient['recommended_fat']} g

[의학 근거]
{rag_text}

위 정보를 바탕으로 다음 형식으로 작성해주세요.

[식단 가이드]
아침:
점심:
저녁:

[권장 식품]

[제한 식품]

[영양소 요약]
칼로리 / 탄수화물 / 단백질 / 지방
"""

        response = self.llm.invoke(prompt)
        parsed   = _parse_diet_guide(response.content)

        is_verified = all([
            parsed['actual_calories'] is not None,
            parsed['actual_protein']  is not None,
            parsed['actual_carbs']    is not None,
            parsed['actual_fat']      is not None,
        ])

        diet_guide = DietGuideRepository.create(
            db                   = db,
            user_id              = user_id,
            nutrient_standard_id = nutrient_standard.id,
            breakfast            = parsed['breakfast'],
            lunch                = parsed['lunch'],
            dinner               = parsed['dinner'],
            recommended_foods    = parsed['recommended_foods'],
            restricted_foods     = parsed['restricted_foods'],
            actual_calories      = parsed['actual_calories'],
            actual_protein       = parsed['actual_protein'],
            actual_carbs         = parsed['actual_carbs'],
            actual_fat           = parsed['actual_fat'],
            is_verified          = is_verified,
        )

        db.commit()
        return diet_guide