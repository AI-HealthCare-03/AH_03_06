# app/services/notification_service.py
# 알림 발송 관련 비즈니스 로직

from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from sqlalchemy.orm import Session

from app.config import settings
from app.models.medication_schedule import MedicationSchedule
from app.models.medication_log import MedicationLog
from app.models.prescription import Prescription
from app.models.medical_record import MedicalRecord
from app.models.user import User
from app.models.fcm_token import FcmToken
from app.services.push_service import send_push_notification


def _get_mail_config() -> ConnectionConfig:
    return ConnectionConfig(
        MAIL_USERNAME=settings.MAIL_USERNAME,
        MAIL_PASSWORD=settings.MAIL_PASSWORD,
        MAIL_FROM=settings.MAIL_FROM,
        MAIL_PORT=settings.MAIL_PORT,
        MAIL_SERVER=settings.MAIL_SERVER,
        MAIL_STARTTLS=True,
        MAIL_SSL_TLS=False,
        USE_CREDENTIALS=True
    )


async def send_medication_reminder(
    user_email: str,
    user_name: str,
    drug_name: str,
    intake_time: str,
    dosage_message: str = None
):
    """복약 알림 이메일 발송"""
    body = f"""
안녕하세요, {user_name}님.

복약 시간 알림입니다.

약품명: {drug_name}
복약 시간: {intake_time}
"""
    if dosage_message:
        body += f"복용 안내: {dosage_message}\n"

    body += "\n건강한 하루 되세요.\nViva 드림"

    message = MessageSchema(
        subject="[Viva] 복약 시간 알림",
        recipients=[user_email],
        body=body,
        subtype="plain"
    )

    try:
        fm = FastMail(_get_mail_config())
        await fm.send_message(message)
    except Exception as e:
        print(f"복약 알림 이메일 발송 실패: {e}")


async def send_push_reminder(
    user_id: int,
    drug_name: str,
    intake_time: str,
    dosage_message: str = None,
    db: Session = None
):
    """FCM 푸시 알림 발송"""
    fcm_tokens = db.query(FcmToken).filter(FcmToken.user_id == user_id).all()

    if not fcm_tokens:
        return

    body = f"{intake_time} 복약 시간입니다. {drug_name}"
    if dosage_message:
        body += f" - {dosage_message}"

    for fcm_token in fcm_tokens:
        send_push_notification(
            fcm_token=fcm_token.token,
            title="복약 알림",
            body=body,
        )


async def send_reminders_for_schedule(schedule_id: int, db: Session):
    """특정 복약 일정의 알림 발송"""
    schedule = db.query(MedicationSchedule).filter(
        MedicationSchedule.schedule_id == schedule_id,
        MedicationSchedule.is_active == True
    ).first()

    if not schedule:
        return

    prescription = db.query(Prescription).filter(
        Prescription.id == schedule.prescribed_medicine_id
    ).first()

    if not prescription:
        return

    medical_record = db.query(MedicalRecord).filter(
        MedicalRecord.id == prescription.medical_record_id
    ).first()

    if not medical_record:
        return

    user = db.query(User).filter(
        User.id == medical_record.user_id
    ).first()

    if not user:
        return

    if schedule.notification_type == "EMAIL":
        await send_medication_reminder(
            user_email=user.email,
            user_name=user.name,
            drug_name=prescription.drug_name,
            intake_time=str(schedule.intake_time)[:5],
            dosage_message=schedule.dosage_message
        )
    elif schedule.notification_type == "PUSH":
        await send_push_reminder(
            user_id=user.id,
            drug_name=prescription.drug_name,
            intake_time=str(schedule.intake_time)[:5],
            dosage_message=schedule.dosage_message,
            db=db
        )