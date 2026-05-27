# app/api/v1/push.py
# FCM 토큰 등록 엔드포인트

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.utils.auth import get_current_user
from app.models.fcm_token import FcmToken
from app.services.notification_service import send_medication_reminder, send_push_reminder

router = APIRouter()


class FcmTokenRequest(BaseModel):
    token: str


class FcmTokenResponse(BaseModel):
    detail: str


class AlarmTestRequest(BaseModel):
    notification_type: str        # EMAIL 또는 PUSH
    drug_name: Optional[str] = "테스트약"
    intake_time: Optional[str] = "09:00"
    dosage_message: Optional[str] = "테스트 복약 알림입니다."
    fcm_token: Optional[str] = None  # PUSH 테스트 시 직접 토큰 입력 가능


@router.post("", response_model=FcmTokenResponse, status_code=201)
def register_fcm_token(
    request: FcmTokenRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    existing = db.query(FcmToken).filter(
        FcmToken.user_id == current_user.id,
        FcmToken.token == request.token
    ).first()

    if existing:
        return FcmTokenResponse(detail="token_already_registered")

    fcm_token = FcmToken(
        user_id=current_user.id,
        token=request.token
    )
    db.add(fcm_token)
    db.commit()
    return FcmTokenResponse(detail="token_registered")


@router.delete("", response_model=FcmTokenResponse)
def delete_fcm_token(
    request: FcmTokenRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    fcm_token = db.query(FcmToken).filter(
        FcmToken.user_id == current_user.id,
        FcmToken.token == request.token
    ).first()

    if not fcm_token:
        return FcmTokenResponse(detail="token_not_found")

    db.delete(fcm_token)
    db.commit()
    return FcmTokenResponse(detail="token_deleted")


@router.post("/test", response_model=FcmTokenResponse)
async def test_alarm(
    request: AlarmTestRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if request.notification_type == "EMAIL":
        await send_medication_reminder(
            user_email=current_user.email,
            user_name=current_user.name,
            drug_name=request.drug_name,
            intake_time=request.intake_time,
            dosage_message=request.dosage_message
        )
    elif request.notification_type == "PUSH":
        if request.fcm_token:
            from app.services.push_service import send_push_notification
            send_push_notification(
                fcm_token=request.fcm_token,
                title="복약 알림",
                body=f"{request.intake_time} 복약 시간입니다. {request.drug_name}"
            )
        else:
            await send_push_reminder(
                user_id=current_user.id,
                drug_name=request.drug_name,
                intake_time=request.intake_time,
                dosage_message=request.dosage_message,
                db=db
            )
    else:
        return FcmTokenResponse(detail="invalid_notification_type")

    return FcmTokenResponse(detail="alarm_sent")