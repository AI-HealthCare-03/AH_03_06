# app/models/medical_record.py

from sqlalchemy import Column, BigInteger, String, Date, DateTime, ForeignKey, SmallInteger
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class MedicalRecord(Base):
    """진료기록 테이블"""
    __tablename__ = "medical_record"

    id            = Column(BigInteger, primary_key=True, autoincrement=True)  # 고유 ID
    user_id       = Column(BigInteger, ForeignKey("user.id"), nullable=False)  # 사용자 ID
    visit_date    = Column(Date, nullable=False)                               # 진료일
    diagnosis_name = Column(String(255), nullable=False)                       # 진단명
    hospital_name = Column(String(255), nullable=True)                         # 진료 기관명
    department_id = Column(BigInteger, ForeignKey("department.id"), nullable=True)  # 진료과 ID
    is_deleted    = Column(SmallInteger, nullable=False, default=0)            # 삭제 여부 (0: 정상, 1: 삭제)
    created_at    = Column(DateTime, nullable=False, default=func.now())       # 생성일시
    updated_at    = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())  # 수정일시

    # 관계 정의
    user          = relationship("User", back_populates="medical_records")
    department    = relationship("Department", back_populates="medical_records")
    prescriptions = relationship("Prescription", back_populates="medical_record", cascade="all, delete-orphan")
    guides        = relationship("Guide", back_populates="medical_record", cascade="all, delete-orphan")