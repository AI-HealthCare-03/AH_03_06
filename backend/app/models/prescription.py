# app/models/prescription.py

from sqlalchemy import Column, BigInteger, String, Integer, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Prescription(Base):
    """처방약 테이블"""
    __tablename__ = "prescription"

    id                = Column(BigInteger, primary_key=True, autoincrement=True)       # 고유 ID
    medical_record_id = Column(BigInteger, ForeignKey("medical_record.id"), nullable=False)  # 진료기록 ID
    drug_name         = Column(String(255), nullable=False)                            # 처방약 이름
    dosage            = Column(String(100), nullable=True)                             # 복용량
    frequency         = Column(String(100), nullable=True)                             # 복용 횟수
    duration_days     = Column(Integer, nullable=True)                                 # 복용 기간 (일)

    # 관계 정의
    medical_record = relationship("MedicalRecord", back_populates="prescriptions")