# app/models/department.py

from sqlalchemy import Column, BigInteger, String
from sqlalchemy.orm import relationship

from app.database import Base


class Department(Base):
    """진료과 테이블"""
    __tablename__ = "department"

    id   = Column(BigInteger, primary_key=True, autoincrement=True)  # 고유 ID
    name = Column(String(100), nullable=False)                        # 진료과명

    # 관계 정의
    medical_records = relationship("MedicalRecord", back_populates="department")