from sqlalchemy import Column, BigInteger, String, Integer, Boolean, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Prescription(Base):
    """처방약 테이블"""
    __tablename__ = "prescription"

    id                = Column(BigInteger, primary_key=True, autoincrement=True)
    medical_record_id = Column(BigInteger, ForeignKey("medical_record.id"), nullable=True)
    drug_id           = Column(BigInteger, ForeignKey("drug_info.drug_id"), nullable=True)
    drug_name         = Column(String(255), nullable=False)
    dosage            = Column(String(100), nullable=True)
    frequency         = Column(String(100), nullable=True)
    duration_days     = Column(Integer, nullable=True)
    start_date        = Column(Date, nullable=True)
    end_date          = Column(Date, nullable=True)
    is_active         = Column(Boolean, nullable=False, default=True)
    created_at        = Column(DateTime, nullable=False, default=func.now())
    updated_at        = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    # 관계 정의
    medical_record       = relationship("MedicalRecord", back_populates="prescriptions", foreign_keys=[medical_record_id])
    drug_info            = relationship("DrugInfo", back_populates="prescriptions")
    medication_schedules = relationship("MedicationSchedule", back_populates="prescription", cascade="all, delete-orphan")