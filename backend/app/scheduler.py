# app/scheduler.py
# 복약 알림 스케줄러
# APScheduler 기반 복약 시간 체크 및 알림 발송

from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.medication_schedule import MedicationSchedule
from app.services.notification_service import send_reminders_for_schedule

scheduler = AsyncIOScheduler()


async def check_and_send_reminders():
    """매 분 실행 - 현재 시간과 일치하는 복약 일정 알림 발송"""
    db: Session = SessionLocal()
    try:
        now = datetime.now()
        current_time = now.strftime("%H:%M")
        current_day = now.strftime("%a").upper()[:3]

        schedules = db.query(MedicationSchedule).filter(
            MedicationSchedule.is_active == True
        ).all()

        for schedule in schedules:
            if str(schedule.intake_time)[:5] != current_time:
                continue

            days = [sd.day_of_week for sd in schedule.schedule_days]
            if days and current_day not in days:
                continue

            await send_reminders_for_schedule(schedule.schedule_id, db)

    except Exception as e:
        print(f"스케줄러 오류: {e}")
    finally:
        db.close()


def start_scheduler():
    scheduler.add_job(
        check_and_send_reminders,
        CronTrigger(minute="*"),
        id="medication_reminder",
        replace_existing=True
    )
    scheduler.start()


def stop_scheduler():
    scheduler.shutdown()