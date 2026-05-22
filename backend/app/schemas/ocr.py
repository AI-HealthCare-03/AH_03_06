# app/schemas/ocr.py

from typing import Optional, List
from datetime import date
from pydantic import BaseModel


class MedicationItem(BaseModel):
    name: Optional[str] = None
    dose: Optional[str] = None
    freq: Optional[str] = None
    days: Optional[str] = None


class InjectItem(BaseModel):
    name: Optional[str] = None
    dose: Optional[str] = None
    freq: Optional[str] = None
    days: Optional[str] = None


class PrescriptionOCRResponse(BaseModel):
    facility_code:  Optional[str]        = None
    facility_name:  Optional[str]        = None
    issue_date:     Optional[date]       = None
    issue_no:       Optional[str]        = None
    patient_name:   Optional[str]        = None
    patient_ssn:    Optional[str]        = None
    disease_code:   Optional[str]        = None
    doctor_name:    Optional[str]        = None
    license_type:   Optional[str]        = None
    license_no:     Optional[str]        = None
    medications:    List[MedicationItem] = []
    med_usage:      Optional[str]        = None
    inject_info:    List[InjectItem]     = []
    pharmacy_note:  Optional[str]        = None
    valid_days:     Optional[int]        = None