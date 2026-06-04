# app/services/guide_service.py
# 복약 가이드 비즈니스 로직 (생성/조회/목록/삭제)

import json

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


DISCLAIMER = (
    "본 서비스는 일반적인 정보 제공 목적이며, 의학적 진단·처방·치료를 "
    "대체하지 않습니다. 실제 복약 결정은 반드시 의사·약사와 상담하시기 바랍니다."
)


def _decode_references(raw: str | None) -> list[str]:
    """references Text 컬럼(JSON 문자열) → list[str]. 빈값·비JSON 레거시는 빈 목록."""
    if not raw:
        return []
    try:
        val = json.loads(raw)
    except (ValueError, TypeError):
        return []
    return [str(s) for s in val] if isinstance(val, list) else []


def _to_schema(guide: MedicationGuide) -> MedicationGuideSchema:
    return MedicationGuideSchema(
        guide_id=guide.id,
        safety_block=guide.safety_block,
        safety_warn=guide.safety_warn,
        safety_info=guide.safety_info,
        main_content=guide.main_content,
        # references 는 Text 컬럼에 JSON 문자열로 저장 → list[str] 로 디코드. 레거시 빈값/비JSON 은 빈 목록.
        references=_decode_references(guide.references),
        safety_recommendations=guide.safety_recommendations,
        is_fallback=guide.is_fallback,
        created_at=guide.created_at.isoformat(timespec="seconds") + "Z",  # DB·서버 UTC → JS 로컬 변환 위해 Z 명시
        disclaimer=DISCLAIMER,
        medication_id=guide.medication_id,
        drug_name=guide.drug_name,
    )


# 처방 → (prescription, item_seq, drug_name) 해결. drug_id 있으면 그 drug_code 사용,
# 없으면 약명→item_seq 매칭 폴백(confidence ≥ 90만 채택; 오매칭이 정보부족보다 위험).
# 블로킹/스트림 생성이 공유.
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

    # drug_id 미연결 처방 폴백: 약명 → item_seq 매칭. 미달이면 item_seq 빈 채로 두어
    # RAG 빈검색 게이트가 fallback 안내를 내도록 한다.
    if not item_seq:
        match = match_drug(prescription.drug_name, get_index(db))
        best = match.get("best_match")
        if best and match.get("confidence", 0) >= 90:
            item_seq = best.get("drug_code") or ""
            drug_name = best.get("drug_name") or drug_name

    return prescription, item_seq, drug_name


# 복약 가이드 생성 (동기 처리, 5~10초 블로킹)
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
        references=json.dumps(payload.get("references") or [], ensure_ascii=False),
        safety_recommendations=payload.get("safety_recommendations"),
        is_fallback=payload.get("is_fallback", False),
    )
    db.add(guide)
    db.commit()
    db.refresh(guide)

    return GenerateGuideResponse(detail="medication_guide_generating")


# 복약 가이드 스트리밍 생성 — 토큰을 흘리며 누적, 끝까지 완료된 경우에만 저장.
# yield: meta → token×N → done{guide_id, is_fallback}. (NDJSON 직렬화는 라우터에서)
# 중간 끊김 시 제너레이터가 취소되어 저장 코드에 도달하지 않음 → 미저장.
#
# 처방 해결은 제너레이터 본문 밖(코루틴 본문)에서 먼저 수행한다. 제너레이터 안에서
# 풀면 StreamingResponse 가 이미 200 을 내보낸 뒤 404 가 raise 되어 스트림이 잘리므로,
# 응답 시작 전에 미리 해결해 없는/권한 없는 처방이면 깨끗한 404 를 던진다.
# (라우터는 이 함수를 await 해서 해결 단계가 먼저 실행되도록 한다.)
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
            # 내부 done 은 흘리지 않음 — 루프가 자연 종료(내부 TIMING 로그 보존)된 뒤
            # guide_id 를 실어 아래에서 done 을 재발행한다.

        meta_d = meta or {}
        guide = MedicationGuide(
            user_id=user_id,
            medication_id=request.medication_id,
            drug_name=drug_name,
            safety_block=meta_d.get("safety_block"),
            safety_warn=meta_d.get("safety_warn"),
            safety_info=meta_d.get("safety_info"),
            main_content=main_content,
            references=json.dumps(meta_d.get("references") or [], ensure_ascii=False),
            safety_recommendations=meta_d.get("safety_recommendations"),
            is_fallback=meta_d.get("is_fallback", False),
        )
        db.add(guide)
        db.commit()
        db.refresh(guide)

        yield {"type": "done", "guide_id": guide.id, "is_fallback": guide.is_fallback}

    return _emit()


# 복약 가이드 단건 조회
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


# 복약 가이드 목록 조회 (created_at DESC)
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


# 복약 가이드 삭제
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
