from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException
from langchain_openai import ChatOpenAI
from openai import OpenAI

from app.models.chat import ChatSession, ChatMessage
from app.models.health_checkup import HealthCheckup
from app.models.prescription import Prescription
from app.models.diet import DietGuide, NutrientStandard
from app.models.medical_record import MedicalRecord
from app.prompts.diet_prompts import get_diet_prompt
from app.prompts.health_prompts import get_health_prompt
from app.prompts.prescription_prompts import get_prescription_prompt

llm    = ChatOpenAI(model='gpt-4o-mini', temperature=0.3)
client = OpenAI()

MEAL_PLAN_KO = {
    'Balanced Diet':               '균형 식단',
    'Low-Sodium Diet':             '저염 식단',
    'Low-Carb Diet':               '저탄수화물 식단',
    'Low-Calorie Diet':            '저칼로리 식단',
    'Low-Carb Low-Sodium Diet':    '저탄수화물·저염 식단',
    'Low-Calorie Low-Sodium Diet': '저칼로리·저염 식단',
    'Low-Carb Low-Calorie Diet':   '저탄수화물·저칼로리 식단',
    'Therapeutic Diet':            '치료 식단',
}

CONVENIENCE_STORE_KEYWORDS = ['편의점', 'gs25', 'cu', '세븐일레븐', '이마트24', 'GS25', 'CU', '세븐']


def _needs_web_search(message: str) -> bool:
    return any(keyword in message.lower() for keyword in [k.lower() for k in CONVENIENCE_STORE_KEYWORDS])


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
            guide = query.filter(DietGuide.id == context_id).first()
            if not guide:
                guide = query.order_by(DietGuide.guide_date.desc()).first()
        else:
            guide = query.order_by(DietGuide.guide_date.desc()).first()
        if not guide:
            raise HTTPException(status_code=404, detail='diet_guide_not_found')
        nutrient = db.query(NutrientStandard).filter(
            NutrientStandard.id == guide.nutrient_standard_id
        ).first()
        meal_plan_ko = MEAL_PLAN_KO.get(nutrient.meal_plan_type, nutrient.meal_plan_type) if nutrient else ''
        return f"""[식단 가이드]
식단 플랜: {meal_plan_ko}
권장 칼로리: {nutrient.recommended_calories if nutrient else ''} kcal
권장 단백질: {nutrient.recommended_protein if nutrient else ''} g
권장 탄수화물: {nutrient.recommended_carbs if nutrient else ''} g
권장 지방: {nutrient.recommended_fat if nutrient else ''} g
아침: {guide.breakfast}
점심: {guide.lunch}
저녁: {guide.dinner}
권장 식품: {guide.recommended_foods}
제한 식품: {guide.restricted_foods}"""

    return ''


def _build_and_invoke(session_id: int, session: ChatSession, user_id: int,
                       message: str, category: Optional[str], db: Session) -> str:
    context_data = _get_context_data(session.context_type, session.context_id, user_id, db)

    if session.context_type == 'DIET_GUIDE':
        system_prompt = get_diet_prompt(category or '', message, context_data)
    elif session.context_type == 'HEALTH_CHECKUP':
        system_prompt = get_health_prompt(category or '', context_data)
    elif session.context_type == 'PRESCRIPTION':
        system_prompt = get_prescription_prompt(category or '', context_data)
    else:
        system_prompt = context_data

    history = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.created_at.asc()).all()

    recent_history = history[-20:] if len(history) > 20 else history

    messages = [{"role": "system", "content": system_prompt}]
    for h in recent_history:
        messages.append({"role": h.role, "content": h.content})
    messages.append({"role": "user", "content": message})

    if _needs_web_search(message):
        tools = [{"type": "web_search_preview"}]
        response = client.responses.create(
            model='gpt-4o-mini',
            tools=tools,
            input=messages,
        )
        return response.output_text
    else:
        response = llm.invoke(messages)
        return response.content


def get_or_create_session(user_id: int, context_type: str,
                           context_id: Optional[int], db: Session) -> ChatSession:
    query = db.query(ChatSession).filter(
        ChatSession.user_id      == user_id,
        ChatSession.context_type == context_type,
    )
    if context_id:
        query = query.filter(ChatSession.context_id == context_id)
    session = query.order_by(ChatSession.created_at.desc()).first()
    if session:
        return session
    session = ChatSession(
        user_id=user_id,
        context_type=context_type,
        context_id=context_id,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def create_session(user_id: int, context_type: str,
                   context_id: Optional[int], db: Session) -> ChatSession:
    return get_or_create_session(user_id, context_type, context_id, db)


def get_session(session_id: int, user_id: int, db: Session) -> ChatSession:
    session = db.query(ChatSession).filter(
        ChatSession.id      == session_id,
        ChatSession.user_id == user_id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail='chat_session_not_found')
    return session


def delete_session(session_id: int, user_id: int, db: Session) -> None:
    session = db.query(ChatSession).filter(
        ChatSession.id      == session_id,
        ChatSession.user_id == user_id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail='chat_session_not_found')
    db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete()
    db.delete(session)
    db.commit()


def clear_messages(session_id: int, user_id: int, db: Session) -> dict:
    session = db.query(ChatSession).filter(
        ChatSession.id      == session_id,
        ChatSession.user_id == user_id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail='chat_session_not_found')
    db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete()
    db.commit()
    return {'session_id': session_id, 'messages': []}


def send_message(session_id: int, user_id: int, message: str,
                  category: Optional[str], db: Session) -> dict:
    session = db.query(ChatSession).filter(
        ChatSession.id      == session_id,
        ChatSession.user_id == user_id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail='chat_session_not_found')

    answer = _build_and_invoke(session_id, session, user_id, message, category, db)

    db.add(ChatMessage(session_id=session_id, role='user',      content=message))
    db.add(ChatMessage(session_id=session_id, role='assistant', content=answer))
    db.commit()

    all_history = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.created_at.asc()).all()

    return {'message': answer, 'history': all_history}


def delete_message(session_id: int, message_id: int, user_id: int, db: Session) -> dict:
    session = db.query(ChatSession).filter(
        ChatSession.id      == session_id,
        ChatSession.user_id == user_id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail='chat_session_not_found')

    message = db.query(ChatMessage).filter(
        ChatMessage.id         == message_id,
        ChatMessage.session_id == session_id,
    ).first()
    if not message:
        raise HTTPException(status_code=404, detail='message_not_found')

    db.delete(message)
    db.commit()

    all_history = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.created_at.asc()).all()

    return {'session_id': session_id, 'messages': all_history}


def edit_message(session_id: int, message_id: int, user_id: int,
                  message: str, category: Optional[str], db: Session) -> dict:
    session = db.query(ChatSession).filter(
        ChatSession.id      == session_id,
        ChatSession.user_id == user_id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail='chat_session_not_found')

    target = db.query(ChatMessage).filter(
        ChatMessage.id         == message_id,
        ChatMessage.session_id == session_id,
        ChatMessage.role       == 'user',
    ).first()
    if not target:
        raise HTTPException(status_code=404, detail='message_not_found')

    db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id,
        ChatMessage.id         >= message_id,
    ).delete()
    db.commit()

    answer = _build_and_invoke(session_id, session, user_id, message, category, db)

    db.add(ChatMessage(session_id=session_id, role='user',      content=message))
    db.add(ChatMessage(session_id=session_id, role='assistant', content=answer))
    db.commit()

    all_history = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.created_at.asc()).all()

    return {'message': answer, 'history': all_history}


def regenerate_message(session_id: int, message_id: int, user_id: int,
                        category: Optional[str], db: Session) -> dict:
    session = db.query(ChatSession).filter(
        ChatSession.id      == session_id,
        ChatSession.user_id == user_id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail='chat_session_not_found')

    target = db.query(ChatMessage).filter(
        ChatMessage.id         == message_id,
        ChatMessage.session_id == session_id,
        ChatMessage.role       == 'assistant',
    ).first()
    if not target:
        raise HTTPException(status_code=404, detail='message_not_found')

    user_message = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id,
        ChatMessage.id         <  message_id,
        ChatMessage.role       == 'user',
    ).order_by(ChatMessage.id.desc()).first()
    if not user_message:
        raise HTTPException(status_code=404, detail='user_message_not_found')

    db.delete(target)
    db.commit()

    answer = _build_and_invoke(session_id, session, user_id, user_message.content, category, db)

    db.add(ChatMessage(session_id=session_id, role='assistant', content=answer))
    db.commit()

    all_history = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.created_at.asc()).all()

    return {'message': answer, 'history': all_history}


def get_history(session_id: int, user_id: int, db: Session) -> dict:
    session = db.query(ChatSession).filter(
        ChatSession.id      == session_id,
        ChatSession.user_id == user_id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail='chat_session_not_found')

    messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.created_at.asc()).all()

    return {'session_id': session_id, 'messages': messages}