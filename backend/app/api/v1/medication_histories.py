# api/v1/medication_histories.py
# 복약 이력 내보내기 API
# GET /api/v1/medication-histories/export — 본인 복약 이력을 CSV 로 반환

import csv
import io
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.medication_log import MedicationLog
from app.models.medication_schedule import MedicationSchedule
from app.models.prescription import Prescription
from app.models.user import User
from app.utils.auth import get_current_user


router = APIRouter()


def _parse_date(s: Optional[str], missing_detail: str) -> date:
    if not s or not s.strip():
        raise HTTPException(status_code=400, detail=missing_detail)
    try:
        return datetime.strptime(s.strip(), "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid_date_format")


@router.get("/export")
def export_medication_history(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    start = _parse_date(start_date, "missing_start_date")
    end = _parse_date(end_date, "missing_end_date")
    if end < start:
        raise HTTPException(status_code=400, detail="invalid_date_range")

    try:
        rows = (
            db.query(
                Prescription.drug_name,
                Prescription.dosage,
                MedicationLog.intake_date,
                MedicationSchedule.intake_time,
                MedicationLog.status,
            )
            .join(MedicationSchedule, MedicationLog.schedule_id == MedicationSchedule.schedule_id)
            .join(Prescription, MedicationSchedule.prescribed_medicine_id == Prescription.id)
            .filter(
                MedicationLog.user_id == current_user.id,
                MedicationLog.intake_date >= start,
                MedicationLog.intake_date <= end,
            )
            .order_by(MedicationLog.intake_date, MedicationSchedule.intake_time)
            .all()
        )

        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(["medication_name", "dosage", "intake_time", "is_completed"])
        for drug_name, dosage, intake_date, intake_time, status in rows:
            if intake_time:
                dt_str = f"{intake_date.isoformat()}T{intake_time.isoformat(timespec='seconds')}"
            else:
                dt_str = intake_date.isoformat()
            writer.writerow([
                drug_name or "",
                dosage or "",
                dt_str,
                "true" if status == "TAKEN" else "false",
            ])

        filename = f"medication_history_{start.isoformat()}_{end.isoformat()}.csv"
        return StreamingResponse(
            iter([buf.getvalue()]),
            media_type="text/csv; charset=utf-8",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
            },
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="export_failed")
