# app/services/push_service.py
# FCM 푸시 알림 발송 서비스

import firebase_admin
from firebase_admin import credentials, messaging
from app.config import settings

_firebase_app = None


def get_firebase_app():
    global _firebase_app
    if _firebase_app is None:
        cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
        _firebase_app = firebase_admin.initialize_app(cred)
    return _firebase_app


def send_push_notification(
    fcm_token: str,
    title: str,
    body: str,
):
    """FCM 푸시 알림 단건 발송"""
    get_firebase_app()
    message = messaging.Message(
        notification=messaging.Notification(
            title=title,
            body=body,
        ),
        token=fcm_token,
    )
    try:
        response = messaging.send(message)
        print(f"푸시 알림 발송 성공: {response}")
        return response
    except Exception as e:
        print(f"푸시 알림 발송 실패: {e}")
        return None