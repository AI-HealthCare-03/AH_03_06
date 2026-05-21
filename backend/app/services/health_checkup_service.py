# app/services/health_checkup_service.py
# 건강검진 관련 비즈니스 로직

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.health_checkup import HealthCheckup
from app.schemas.health_checkup import (
    HealthCheckupCreateRequest,
    HealthCheckupUpdateRequest,
    HealthCheckupResponse,
    HealthCheckupListResponse,
    HealthCheckupDeleteResponse,
    HealthClassificationResponse,
    HealthTrendResponse,
)


def _classify_bp(systolic: int, diastolic: int) -> str:
    """혈압 분류 (FR-306 기준)"""
    if systolic <= 120 and diastolic <= 80:
        return "정상"
    elif systolic < 130 and diastolic < 80:
        return "주의"
    else:
        return "위험"


def _classify_glucose(fasting_glucose: int) -> str:
    """공복혈당 분류 (FR-306 기준)"""
    if fasting_glucose < 100:
        return "정상"
    elif fasting_glucose < 126:
        return "주의"
    else:
        return "위험"


def _classify_cholesterol(total: int, hdl: int, ldl: int, triglyceride: int) -> str:
    """콜레스테롤 분류 (FR-306 기준)"""
    if total < 200 and ldl < 130 and triglyceride < 150:
        return "정상"
    elif total < 240 and ldl < 160 and triglyceride < 200:
        return "주의"
    else:
        return "위험"


def _classify_bmi(height: float, weight: float) -> tuple:
    """BMI 계산 및 분류 (FR-306 기준)"""
    bmi = round(weight / ((height / 100) ** 2), 1)
    if bmi < 18.5:
        result = "저체중"
    elif bmi < 23.0:
        result = "정상"
    elif bmi < 25.0:
        result = "주의"
    else:
        result = "위험"
    return bmi, result


def create_checkup(
    user_id: int,
    request: HealthCheckupCreateRequest,
    db: Session
) -> HealthCheckupResponse:
    """건강검진 데이터 입력"""
    checkup = HealthCheckup(user_id=user_id, **request.model_dump())
    db.add(checkup)
    db.commit()
    db.refresh(checkup)
    return HealthCheckupResponse.model_validate(checkup)


def get_checkups(user_id: int, db: Session) -> HealthCheckupListResponse:
    """건강검진 목록 조회 - 최신순 정렬"""
    checkups = db.query(HealthCheckup).filter(
        HealthCheckup.user_id == user_id
    ).order_by(HealthCheckup.checkup_year.desc()).all()

    return HealthCheckupListResponse(
        checkups=[HealthCheckupResponse.model_validate(c) for c in checkups]
    )


def get_checkup(user_id: int, checkup_id: int, db: Session) -> HealthCheckupResponse:
    """건강검진 상세 조회"""
    checkup = db.query(HealthCheckup).filter(
        HealthCheckup.id == checkup_id,
        HealthCheckup.user_id == user_id
    ).first()

    if not checkup:
        raise HTTPException(status_code=404, detail="checkup_not_found")

    return HealthCheckupResponse.model_validate(checkup)


def update_checkup(
    user_id: int,
    checkup_id: int,
    request: HealthCheckupUpdateRequest,
    db: Session
) -> HealthCheckupResponse:
    """건강검진 데이터 수정 - 전달된 필드만 업데이트"""
    checkup = db.query(HealthCheckup).filter(
        HealthCheckup.id == checkup_id,
        HealthCheckup.user_id == user_id
    ).first()

    if not checkup:
        raise HTTPException(status_code=404, detail="checkup_not_found")

    # 전달된 필드만 업데이트
    for field, value in request.model_dump(exclude_none=True).items():
        setattr(checkup, field, value)

    db.commit()
    db.refresh(checkup)
    return HealthCheckupResponse.model_validate(checkup)


def delete_checkup(user_id: int, checkup_id: int, db: Session) -> HealthCheckupDeleteResponse:
    """건강검진 데이터 삭제"""
    checkup = db.query(HealthCheckup).filter(
        HealthCheckup.id == checkup_id,
        HealthCheckup.user_id == user_id
    ).first()

    if not checkup:
        raise HTTPException(status_code=404, detail="checkup_not_found")

    db.delete(checkup)
    db.commit()
    return HealthCheckupDeleteResponse(detail="checkup_deleted")


def get_classification(user_id: int, db: Session) -> HealthClassificationResponse:
    """최신 건강검진 기준 분류 결과 조회"""
    checkup = db.query(HealthCheckup).filter(
        HealthCheckup.user_id == user_id
    ).order_by(HealthCheckup.checkup_year.desc()).first()

    if not checkup:
        raise HTTPException(status_code=404, detail="checkup_not_found")

    classification = {}

    if checkup.bp_systolic and checkup.bp_diastolic:
        classification["bp"] = {
            "bp_systolic": checkup.bp_systolic,
            "bp_diastolic": checkup.bp_diastolic,
            "result": _classify_bp(checkup.bp_systolic, checkup.bp_diastolic)
        }

    if checkup.fasting_glucose:
        classification["glucose"] = {
            "fasting_glucose": checkup.fasting_glucose,
            "result": _classify_glucose(checkup.fasting_glucose)
        }

    if checkup.total_cholesterol and checkup.hdl and checkup.ldl and checkup.triglyceride:
        classification["cholesterol"] = {
            "total_cholesterol": checkup.total_cholesterol,
            "hdl": checkup.hdl,
            "ldl": checkup.ldl,
            "triglyceride": checkup.triglyceride,
            "result": _classify_cholesterol(
                checkup.total_cholesterol,
                checkup.hdl,
                checkup.ldl,
                checkup.triglyceride
            )
        }

    if checkup.height and checkup.weight:
        bmi, result = _classify_bmi(checkup.height, checkup.weight)
        classification["bmi"] = {
            "height": float(checkup.height),
            "weight": float(checkup.weight),
            "bmi": bmi,
            "result": result
        }

    return HealthClassificationResponse(
        checkup_year=checkup.checkup_year,
        classification=classification
    )


def get_trend(user_id: int, db: Session, period: str = "1y", item: str = None) -> HealthTrendResponse:
    """건강 수치 변화 추이 조회"""
    from datetime import datetime

    # 기간 필터
    current_year = datetime.now().year
    period_map = {"1m": 0, "3m": 0, "6m": 0, "1y": 1}

    if period not in period_map:
        raise HTTPException(status_code=400, detail="invalid_period")

    if item and item not in ["bp", "glucose", "cholesterol", "bmi"]:
        raise HTTPException(status_code=400, detail="invalid_item")

    year_limit = {
        "1m": current_year,
        "3m": current_year,
        "6m": current_year,
        "1y": current_year - 1
    }

    checkups = db.query(HealthCheckup).filter(
        HealthCheckup.user_id == user_id,
        HealthCheckup.checkup_year >= year_limit[period]
    ).order_by(HealthCheckup.checkup_year.asc()).all()

    trend = {}

    if not item or item == "bp":
        trend["bp"] = [
            {
                "checkup_year": c.checkup_year,
                "bp_systolic": c.bp_systolic,
                "bp_diastolic": c.bp_diastolic,
                "classification": _classify_bp(c.bp_systolic, c.bp_diastolic)
                if c.bp_systolic and c.bp_diastolic else None
            }
            for c in checkups if c.bp_systolic and c.bp_diastolic
        ]

    if not item or item == "glucose":
        trend["glucose"] = [
            {
                "checkup_year": c.checkup_year,
                "fasting_glucose": c.fasting_glucose,
                "classification": _classify_glucose(c.fasting_glucose)
                if c.fasting_glucose else None
            }
            for c in checkups if c.fasting_glucose
        ]

    if not item or item == "cholesterol":
        trend["cholesterol"] = [
            {
                "checkup_year": c.checkup_year,
                "total_cholesterol": c.total_cholesterol,
                "hdl": c.hdl,
                "ldl": c.ldl,
                "triglyceride": c.triglyceride,
                "classification": _classify_cholesterol(
                    c.total_cholesterol, c.hdl, c.ldl, c.triglyceride
                ) if c.total_cholesterol and c.hdl and c.ldl and c.triglyceride else None
            }
            for c in checkups if c.total_cholesterol
        ]

    if not item or item == "bmi":
        trend["bmi"] = []
        for c in checkups:
            if c.height and c.weight:
                bmi, result = _classify_bmi(float(c.height), float(c.weight))
                trend["bmi"].append({
                    "checkup_year": c.checkup_year,
                    "height": float(c.height),
                    "weight": float(c.weight),
                    "bmi": bmi,
                    "classification": result
                })

    return HealthTrendResponse(trend=trend)