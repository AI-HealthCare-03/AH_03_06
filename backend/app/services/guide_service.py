# app/services/guide_service.py
# 복약 가이드 비즈니스 로직 (생성/조회/목록/삭제)

from fastapi import HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models.drug_info import DrugInfo
from app.models.guide import MedicationGuide
from app.models.medical_record import MedicalRecord
from app.models.prescription import Prescription
from app.schemas.guide import (
    DeleteGuideResponse,
    GenerateGuideRequest,
    GenerateGuideResponse,
    GuideListResponse,
    MedicationGuideSchema,
)
from app.services.drug_matching_service import get_index, match_drug
from app.services.llm_service import (
    generate_guide_for_drug_async,
    generate_guide_for_drug_stream,
)
from app.services import point_service


DISCLAIMER = (
    "본 서비스는 일반적인 정보 제공 목적이며, 의학적 진단·처방·치료를 "
    "대체하지 않습니다. 실제 복약 결정은 반드시 의사·약사와 상담하시기 바랍니다."
)


def _to_schema(guide: MedicationGuide) -> MedicationGuideSchema:
    return MedicationGuideSchema(
        guide_id=guide.id,
        safety_block=guide.safety_block,
        safety_warn=guide.safety_warn,
        safety_info=guide.safety_info,
        main_content=guide.main_content,
        references=guide.references,
        safety_recommendations=guide.safety_recommendations,
        is_fallback=guide.is_fallback,
        created_at=guide.created_at.isoformat(timespec="seconds") + "Z",
        disclaimer=DISCLAIMER,
        medication_id=guide.medication_id,
        drug_name=guide.drug_name,
    )


def _resolve_prescription_item_seq(medication_id: int, user_id: int, db: Session):
    prescription = (
        db.query(Prescription)
        .join(MedicalRecord)
        .filter(
            Prescription.id == medication_id,
            MedicalRecord.user_id == user_id,
            MedicalRecord.is_deleted == 0,
        )
        .first()
    )
    if not prescription:
        raise HTTPException(status_code=404, detail="medication_not_found")

    item_seq = ""
    drug_name = prescription.drug_name
    if prescription.drug_id:
        drug_info = db.query(DrugInfo).filter(DrugInfo.drug_id == prescription.drug_id).first()
        if drug_info:
            item_seq = drug_info.drug_code or ""
            drug_name = drug_info.drug_name or prescription.drug_name

    if not item_seq:
        match = match_drug(prescription.drug_name, get_index(db))
        best = match.get("best_match")
        if best and match.get("confidence", 0) >= 90:
            item_seq = best.get("drug_code") or ""
            drug_name = best.get("drug_name") or drug_name

    return prescription, item_seq, drug_name


async def request_guide_generation(
    request: GenerateGuideRequest,
    user_id: int,
    db: Session,
) -> GenerateGuideResponse:
    _, item_seq, drug_name = _resolve_prescription_item_seq(request.medication_id, user_id, db)

    payload = await generate_guide_for_drug_async(
        item_seq=item_seq,
        drug_name=drug_name,
    )

    guide = MedicationGuide(
        user_id=user_id,
        medication_id=request.medication_id,
        drug_name=drug_name,
        safety_block=payload.get("safety_block"),
        safety_warn=payload.get("safety_warn"),
        safety_info=payload.get("safety_info"),
        main_content=payload["main_content"],
        references=payload.get("references"),
        safety_recommendations=payload.get("safety_recommendations"),
        is_fallback=payload.get("is_fallback", False),
    )
    db.add(guide)
    db.commit()
    db.refresh(guide)

    # 포인트 적립
    point_service.earn(user_id, "medication_guide", db)
    db.commit()

    return GenerateGuideResponse(detail="medication_guide_generating")


async def stream_guide_generation(
    request: GenerateGuideRequest,
    user_id: int,
    db: Session,
):
    _, item_seq, drug_name = _resolve_prescription_item_seq(request.medication_id, user_id, db)

    async def _emit():
        main_content = ""
        meta: dict | None = None
        async for ev in generate_guide_for_drug_stream(item_seq=item_seq, drug_name=drug_name):
            etype = ev.get("type")
            if etype == "meta":
                meta = ev
                yield ev
            elif etype == "token":
                main_content += ev.get("text", "")
                yield ev

        meta_d = meta or {}
        guide = MedicationGuide(
            user_id=user_id,
            medication_id=request.medication_id,
            drug_name=drug_name,
            safety_block=meta_d.get("safety_block"),
            safety_warn=meta_d.get("safety_warn"),
            safety_info=meta_d.get("safety_info"),
            main_content=main_content,
            references=meta_d.get("references"),
            safety_recommendations=meta_d.get("safety_recommendations"),
            is_fallback=meta_d.get("is_fallback", False),
        )
        db.add(guide)
        db.commit()
        db.refresh(guide)

        # 포인트 적립
        point_service.earn(user_id, "medication_guide", db)
        db.commit()

        yield {"type": "done", "guide_id": guide.id, "is_fallback": guide.is_fallback}

    return _emit()


def get_medication_guide(
    guide_id: int,
    user_id: int,
    db: Session,
) -> MedicationGuideSchema:
    guide = (
        db.query(MedicationGuide)
        .filter(
            MedicationGuide.id == guide_id,
            MedicationGuide.user_id == user_id,
        )
        .first()
    )
    if not guide:
        raise HTTPException(status_code=404, detail="medication_guide_not_found")
    return _to_schema(guide)


def list_medication_guides(
    user_id: int,
    db: Session,
) -> GuideListResponse:
    guides = (
        db.query(MedicationGuide)
        .filter(MedicationGuide.user_id == user_id)
        .order_by(desc(MedicationGuide.created_at))
        .all()
    )
    return GuideListResponse(
        guides=[_to_schema(g) for g in guides],
        total=len(guides),
    )


def delete_medication_guide(
    guide_id: int,
    user_id: int,
    db: Session,
) -> DeleteGuideResponse:
    guide = (
        db.query(MedicationGuide)
        .filter(
            MedicationGuide.id == guide_id,
            MedicationGuide.user_id == user_id,
        )
        .first()
    )
    if not guide:
        raise HTTPException(status_code=404, detail="medication_guide_not_found")

    db.delete(guide)
    db.commit()
    return DeleteGuideResponse(detail="medication_guide_deleted")