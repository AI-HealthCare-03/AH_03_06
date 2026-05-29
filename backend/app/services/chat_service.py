from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException
from langchain_openai import ChatOpenAI

from app.models.chat import ChatSession, ChatMessage
from app.models.health_checkup import HealthCheckup
from app.models.prescription import Prescription
from app.models.diet import DietGuide, NutrientStandard
from app.models.medical_record import MedicalRecord

llm = ChatOpenAI(model='gpt-4o-mini', temperature=0.3)

SYSTEM_PROMPTS = {
    'HEALTH_CHECKUP': """당신은 건강검진 결과를 설명해주는 헬스케어 AI 어시스턴트입니다.
아래 사용자의 건강검진 데이터를 바탕으로 질문에 답변하세요.
의학적 진단이나 처방은 하지 않으며, 반드시 의사 상담을 권고하세요.""",

    'PRESCRIPTION': """당신은 처방약 정보를 안내하는 헬스케어 AI 어시스턴트입니다.
아래 사용자의 처방약 데이터를 바탕으로 질문에 답변하세요.
의학적 진단이나 처방 변경은 하지 않으며, 반드시 의사·약사 상담을 권고하세요.""",

    'DIET_GUIDE': """당신은 식단 가이드를 설명해주는 헬스케어 AI 어시스턴트입니다.
아래 사용자의 식단 가이드와 그룹 결정 근거를 바탕으로 질문에 답변하세요.
의학적 진단이나 처방은 하지 않으며, 반드시 의사·영양사 상담을 권고하세요.""",
}

GROUP_RULE_PROMPT = """
[그룹 결정 규칙]
- 수축기혈압 120 미만, 이완기혈압 80 미만 → 정상
- 수축기혈압 120 이상 또는 이완기혈압 80 이상 → 고혈압 위험
- 공복혈당 100 미만 → 정상
- 공복혈당 100 이상 → 혈당이상
- BMI 23 미만 → 정상
- BMI 23 이상 → 비만 위험

[식단 플랜 매핑]
- 정상군 → 균형 식단
- 고혈압군 → 저염 식단
- 혈당이상군 → 저탄수화물 식단
- 비만군 → 저칼로리 식단
- 고혈압+혈당이상군 → 저탄수화물·저염 식단
- 고혈압+비만군 → 저칼로리·저염 식단
- 혈당이상+비만군 → 저탄수화물·저칼로리 식단
- 복합위험군 → 치료 식단
"""


def _get_context_data(context_type: str, context_id: Optional[int], user_id: int, db: Session) -> str:
    if context_type == 'HEALTH_CHECKUP':
        query = db.query(HealthCheckup).filter(HealthCheckup.user_id == user_id)
        if context_id:
            query = query.filter(HealthCheckup.id == context_id)
        else:
            query = query.order_by(HealthCheckup.created_at.desc())
        checkup = query.first()
        if not checkup:
            raise HTTPException(status_code=404, detail='health_checkup_not_found')
        return f"""[건강검진 데이터]
검진 연도: {checkup.checkup_year}
수축기혈압: {checkup.bp_systolic} mmHg
이완기혈압: {checkup.bp_diastolic} mmHg
공복혈당: {checkup.fasting_glucose} mg/dL
신장: {checkup.height} cm
체중: {checkup.weight} kg
허리둘레: {checkup.waist} cm
총콜레스테롤: {checkup.total_cholesterol}
HDL: {checkup.hdl}
LDL: {checkup.ldl}
중성지방: {checkup.triglyceride}"""

    elif context_type == 'PRESCRIPTION':
        prescriptions = (
            db.query(Prescription)
            .join(MedicalRecord)
            .filter(
                MedicalRecord.user_id == user_id,
                MedicalRecord.is_deleted == 0,
                Prescription.is_active == True,
            )
            .all()
        )
        if not prescriptions:
            raise HTTPException(status_code=404, detail='prescription_not_found')
        lines = ['[처방약 목록]']
        for p in prescriptions:
            lines.append(f'- {p.drug_name} / 용량: {p.dosage} / 횟수: {p.frequency} / 기간: {p.duration_days}일')
        return '\n'.join(lines)

    elif context_type == 'DIET_GUIDE':
        query = db.query(DietGuide).filter(DietGuide.user_id == user_id)
        if context_id:
            query = query.filter(DietGuide.id == context_id)
        else:
            query = query.order_by(DietGuide.created_at.desc())
        guide = query.first()
        if not guide:
            raise HTTPException(status_code=404, detail='diet_guide_not_found')
        nutrient = db.query(NutrientStandard).filter(
            NutrientStandard.id == guide.nutrient_standard_id
        ).first()
        return f"""[식단 가이드]
식단 플랜: {nutrient.meal_plan_type if nutrient else ''}
권장 칼로리: {nutrient.recommended_calories if nutrient else ''} kcal
권장 단백질: {nutrient.recommended_protein if nutrient else ''} g
권장 탄수화물: {nutrient.recommended_carbs if nutrient else ''} g
권장 지방: {nutrient.recommended_fat if nutrient else ''} g
아침: {guide.breakfast}
점심: {guide.lunch}
저녁: {guide.dinner}
권장 식품: {guide.recommended_foods}
제한 식품: {guide.restricted_foods}
{GROUP_RULE_PROMPT}"""

    return ''


def create_session(user_id: int, context_type: str, context_id: Optional[int], db: Session) -> ChatSession:
    session = ChatSession(
        user_id=user_id,
        context_type=context_type,
        context_id=context_id,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def send_message(session_id: int, user_id: int, message: str, db: Session) -> dict:
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == user_id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail='chat_session_not_found')

    context_data = _get_context_data(session.context_type, session.context_id, user_id, db)

    history = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.created_at.asc()).all()

    # 최근 10턴만 유지
    recent_history = history[-20:] if len(history) > 20 else history

    messages = [
        {"role": "system", "content": SYSTEM_PROMPTS[session.context_type] + '\n\n' + context_data}
    ]
    for h in recent_history:
        messages.append({"role": h.role, "content": h.content})
    messages.append({"role": "user", "content": message})

    response = llm.invoke(messages)
    answer = response.content

    db.add(ChatMessage(session_id=session_id, role='user', content=message))
    db.add(ChatMessage(session_id=session_id, role='assistant', content=answer))
    db.commit()

    all_history = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.created_at.asc()).all()

    return {
        'message': answer,
        'history': all_history,
    }


def get_history(session_id: int, user_id: int, db: Session) -> dict:
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == user_id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail='chat_session_not_found')

    messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.created_at.asc()).all()

    return {
        'session_id': session_id,
        'messages': messages,
    }