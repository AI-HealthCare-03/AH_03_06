# app/services/sleep_guide_service.py
# 수면 가이드 비즈니스 로직 (생성/조회/목록/삭제)
#
# 생성 흐름: survey 저장 → 카페인 정션 → 분류 → user_info 조회 → LLM → guide 저장 → 가이드라인 정션

from datetime import datetime, time

from fastapi import HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models.user import UserProfile, SmokingInfo, AlcoholInfo, CaffeineDrinkType
from app.models.sleep_survey import SleepSurveyResponse, SleepSurveyCaffeine
from app.models.sleep_guide import SleepGuide, SleepGuideGuideline
from app.models.clinical_guideline import ClinicalGuideline
from app.schemas.sleep_guide import (
    SleepGenerateRequest,
    SleepGenerateResponse,
    SleepGuideSchema,
    SleepGuideListItem,
    SleepGuideListResponse,
    DeleteSleepGuideResponse,
)
from app.services import sleep_classifier as sc
from app.services import sleep_llm_service as llm
from app.services import point_service


DISCLAIMER = "본 가이드는 일반적인 건강 정보 제공이며, 의학적 진단·처방·치료를 대체하지 않습니다."


def _parse_time(s: str) -> time:
    """'HH:MM' → datetime.time."""
    parts = s.strip().split(":")
    return time(int(parts[0]), int(parts[1]))


def _build_user_info(db: Session, user_id: int) -> dict:
    """USER_PROFILE / SMOKING_INFO / ALCOHOL_INFO 에서 LLM·회귀용 사용자 정보 조립."""
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    smoking = db.query(SmokingInfo).filter(SmokingInfo.user_id == user_id).first()
    alcohol = db.query(AlcoholInfo).filter(AlcoholInfo.user_id == user_id).first()

    age = None
    gender_label = "미입력"
    if profile:
        today = datetime.now().date()
        exact = today.year - profile.birthday.year - (
            (today.month, today.day) < (profile.birthday.month, profile.birthday.day)
        )
        age = (exact // 10) * 10
        gender_label = "남" if str(profile.gender).upper().startswith("M") else "여"

    smoking_status = smoking.smoking_status if smoking else 0
    alcohol_status = alcohol.alcohol_status if alcohol else 0
    smoking_label = {
        0: "비흡연",
        1: f"흡연 (하루 {smoking.daily_amount or '?'}개비)" if smoking else "흡연",
        2: "금연",
    }.get(smoking_status, "미입력")
    alcohol_label = {0: "비음주", 1: "음주"}.get(alcohol_status, "미입력")

    return {
        "age": age,
        "gender_label": gender_label,
        "smoking_status": smoking_status,
        "alcohol_status": alcohol_status,
        "smoking_status_label": smoking_label,
        "alcohol_status_label": alcohol_label,
    }


_SOURCE_KEYWORDS = ["CBT-I", "일주기", "약물", "한국판"]


def _match_clinical_guideline(db: Session, source_label: str) -> ClinicalGuideline | None:
    """RAG source label 의 키워드로 CLINICAL_GUIDELINE 행 매칭."""
    guidelines = db.query(ClinicalGuideline).filter(ClinicalGuideline.guide_category == 0).all()
    for kw in _SOURCE_KEYWORDS:
        if kw in source_label:
            for cg in guidelines:
                if kw in cg.title:
                    return cg
    return None


# ===== 0. 카페인 음료 마스터 (입력 폼용) =====

def list_caffeine_types(db: Session) -> list[dict]:
    """카페인 음료 5종 마스터 (입력 폼에서 id·name 매칭용)."""
    types = db.query(CaffeineDrinkType).order_by(CaffeineDrinkType.id).all()
    return [
        {"id": t.id, "name": t.name, "caffeine_mg_per_cup": t.caffeine_mg_per_cup}
        for t in types
    ]


# ===== 1. 생성 (POST) — async, sync 처리 =====

async def generate_sleep_guide(
    request: SleepGenerateRequest,
    user_id: int,
    db: Session,
) -> SleepGenerateResponse:
    """수면 가이드 생성 — survey 저장 → 분류 → LLM → guide 저장.

    동기 처리 (5~10초 블로킹). 생성된 guide_id 반환 (바로 GET 조회 가능).
    """
    # 1. SLEEP_SURVEY_RESPONSE 저장
    survey = SleepSurveyResponse(
        user_id=user_id,
        weekday_bedtime=_parse_time(request.weekday_bedtime),
        weekday_wakeup=_parse_time(request.weekday_wakeup),
        weekend_bedtime=_parse_time(request.weekend_bedtime),
        weekend_wakeup=_parse_time(request.weekend_wakeup),
        brief_survey_q1=request.brief_survey_q1,
        brief_survey_q2=request.brief_survey_q2,
        brief_survey_q3=request.brief_survey_q3,
        brief_survey_q4=request.brief_survey_q4,
        brief_survey_q5=request.brief_survey_q5,
        ess_q1=request.ess_q1, ess_q2=request.ess_q2, ess_q3=request.ess_q3, ess_q4=request.ess_q4,
        ess_q5=request.ess_q5, ess_q6=request.ess_q6, ess_q7=request.ess_q7, ess_q8=request.ess_q8,
    )
    db.add(survey)
    db.flush()

    # 2. 카페인 정션 저장 + mg 환산용 tuple/label
    caffeine_tuples: list[tuple[int, int]] = []
    caffeine_labels: list[str] = []
    for entry in request.caffeine_entries:
        if entry.cups <= 0:
            continue
        drink = db.query(CaffeineDrinkType).filter(CaffeineDrinkType.id == entry.caffeine_drink_type_id).first()
        if not drink:
            continue
        db.add(SleepSurveyCaffeine(
            survey_response_id=survey.id,
            caffeine_drink_type_id=drink.id,
            cups=entry.cups,
        ))
        caffeine_tuples.append((drink.caffeine_mg_per_cup, entry.cups))
        caffeine_labels.append(f"{drink.name} {entry.cups}잔")

    # 3. 분류
    classification = sc.classify_all(
        weekday_bedtime=survey.weekday_bedtime,
        weekday_wakeup=survey.weekday_wakeup,
        weekend_bedtime=survey.weekend_bedtime,
        weekend_wakeup=survey.weekend_wakeup,
        brief_q1=survey.brief_survey_q1, brief_q2=survey.brief_survey_q2,
        brief_q3=survey.brief_survey_q3, brief_q4=survey.brief_survey_q4,
        brief_q5=survey.brief_survey_q5,
        caffeine_entries=caffeine_tuples,
        ess_q1=survey.ess_q1, ess_q2=survey.ess_q2, ess_q3=survey.ess_q3, ess_q4=survey.ess_q4,
        ess_q5=survey.ess_q5, ess_q6=survey.ess_q6, ess_q7=survey.ess_q7, ess_q8=survey.ess_q8,
    )

    # 4. user_info
    user_info = _build_user_info(db, user_id)

    # 5. LLM 생성
    sections, sources = await llm.generate_sleep_guide_async(
        classification=classification,
        user_info=user_info,
        caffeine_entries_label=caffeine_labels,
        disturbance_causes=request.disturbance_causes,
    )

    # 6. SLEEP_GUIDE 저장
    guide = SleepGuide(
        user_id=user_id,
        survey_response_id=survey.id,
        key_point=sections.get("key_point"),
        today_actions=sections.get("today_actions"),
        weekly_goal=sections.get("weekly_goal"),
        coping_strategy=sections.get("coping_strategy"),
        lifestyle_adjustment=sections.get("lifestyle_adjustment"),
        consultation_recommendation=sections.get("consultation_recommendation"),
        next_checkup_guide=sections.get("next_checkup_guide"),
        sleep_hours_avg=classification.sleep_hours_avg,
        rhythm_diff_hours=classification.rhythm_diff_hours,
        caffeine_mg_daily=classification.caffeine_mg_daily,
        brief_survey_total=classification.brief_survey_total_score,
        ess_score=classification.ess_score,
        sleep_hours_class=classification.sleep_hours_class,
        rhythm_diff_class=classification.rhythm_diff_class,
        brief_survey_class=classification.brief_survey_class,
        ess_class=classification.ess_class,
        overall_status=classification.overall_status,
        expected_improvements=llm.build_improvement_hints(user_info),
        consultation_required=classification.consultation_required,
        consultation_reasons=classification.consultation_reasons or None,
        is_fallback=sections.get("is_fallback", False),
    )
    db.add(guide)
    db.flush()

    # 7. SLEEP_GUIDE_GUIDELINE 정션 (best-effort 매칭)
    linked_ids: set[int] = set()
    for source_label in sources:
        cg = _match_clinical_guideline(db, source_label)
        if cg and cg.id not in linked_ids:
            db.add(SleepGuideGuideline(sleep_guide_id=guide.id, clinical_guideline_id=cg.id))
            linked_ids.add(cg.id)

    db.commit()
    db.refresh(guide)

    # 포인트 적립
    point_service.earn(user_id, "sleep_guide", db)
    db.commit()

    return SleepGenerateResponse(detail="sleep_guide_created", guide_id=guide.id)


# ===== 공통 직렬화 =====

def _references(db: Session, guide_id: int) -> list[str]:
    links = db.query(SleepGuideGuideline).filter(SleepGuideGuideline.sleep_guide_id == guide_id).all()
    titles: list[str] = []
    for link in links:
        cg = db.query(ClinicalGuideline).filter(ClinicalGuideline.id == link.clinical_guideline_id).first()
        if cg:
            titles.append(cg.title)
    return titles


def _to_schema(guide: SleepGuide, db: Session) -> SleepGuideSchema:
    return SleepGuideSchema(
        guide_id=guide.id,
        key_point=guide.key_point,
        today_actions=guide.today_actions,
        weekly_goal=guide.weekly_goal,
        coping_strategy=guide.coping_strategy,
        lifestyle_adjustment=guide.lifestyle_adjustment,
        consultation_recommendation=guide.consultation_recommendation,
        next_checkup_guide=guide.next_checkup_guide,
        sleep_hours_avg=float(guide.sleep_hours_avg) if guide.sleep_hours_avg is not None else None,
        rhythm_diff_hours=float(guide.rhythm_diff_hours) if guide.rhythm_diff_hours is not None else None,
        caffeine_mg_daily=guide.caffeine_mg_daily,
        brief_survey_total=guide.brief_survey_total,
        ess_score=guide.ess_score,
        sleep_hours_class=guide.sleep_hours_class,
        rhythm_diff_class=guide.rhythm_diff_class,
        brief_survey_class=guide.brief_survey_class,
        ess_class=guide.ess_class,
        overall_status=guide.overall_status,
        expected_improvements=guide.expected_improvements,
        consultation_required=guide.consultation_required,
        consultation_reasons=guide.consultation_reasons,
        is_fallback=guide.is_fallback,
        created_at=guide.created_at.isoformat(timespec="seconds") + "Z",
        disclaimer=DISCLAIMER,
        references=_references(db, guide.id),
    )


# ===== 2. 단건 조회 (GET /{id}) =====

def get_sleep_guide(guide_id: int, user_id: int, db: Session) -> SleepGuideSchema:
    guide = db.query(SleepGuide).filter(
        SleepGuide.id == guide_id, SleepGuide.user_id == user_id
    ).first()
    if not guide:
        raise HTTPException(status_code=404, detail="sleep_guide_not_found")
    return _to_schema(guide, db)


# ===== 3. 목록 조회 (GET) =====

def list_sleep_guides(user_id: int, db: Session) -> SleepGuideListResponse:
    guides = (
        db.query(SleepGuide)
        .filter(SleepGuide.user_id == user_id)
        .order_by(desc(SleepGuide.created_at))
        .all()
    )
    items = [
        SleepGuideListItem(
            guide_id=g.id,
            overall_status=g.overall_status,
            sleep_hours_avg=float(g.sleep_hours_avg) if g.sleep_hours_avg is not None else None,
            key_point=g.key_point,
            is_fallback=g.is_fallback,
            created_at=g.created_at.isoformat(timespec="seconds") + "Z",
        )
        for g in guides
    ]
    return SleepGuideListResponse(guides=items, total=len(items))


# ===== 4. 삭제 (DELETE /{id}) =====

def delete_sleep_guide(guide_id: int, user_id: int, db: Session) -> DeleteSleepGuideResponse:
    guide = db.query(SleepGuide).filter(
        SleepGuide.id == guide_id, SleepGuide.user_id == user_id
    ).first()
    if not guide:
        raise HTTPException(status_code=404, detail="sleep_guide_not_found")
    db.delete(guide)
    db.commit()
    return DeleteSleepGuideResponse(detail="sleep_guide_deleted")