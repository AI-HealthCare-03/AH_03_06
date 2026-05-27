# app/models/guide.py
# MEDICATION_GUIDE 테이블 모델

from sqlalchemy import Column, BigInteger, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class MedicationGuide(Base):
    """사용자 복약 가이드 결과 저장 테이블"""
    __tablename__ = "medication_guide"

    id = Column(BigInteger, primary_key=True, autoincrement=True)              # 고유 ID
    user_id = Column(BigInteger, ForeignKey("user.id"), nullable=False)        # 사용자 ID (USER.id 참조)

    medication_id = Column(BigInteger, nullable=True)                          # 처방 prescription.id 참조 (soft, FK 제약 없음)
    drug_name = Column(String(255), nullable=True)                             # 약품명 캐시

    # 안전 알림 영역 (의논 ①번 (나) 결정 — 답변 전 점검 결과)
    safety_block = Column(Text, nullable=True)                                 # 차단 안내
    safety_warn = Column(Text, nullable=True)                                  # 경고 안내
    safety_info = Column(Text, nullable=True)                                  # 정보 안내

    # 본문 (의논 ③번 (가) 결정 — 발췌+보충 형식)
    main_content = Column(Text, nullable=False)                                # 가이드 본문

    # 근거 및 권고
    references = Column(Text, nullable=True)                                   # 사용된 출처
    safety_recommendations = Column(Text, nullable=True)                       # 안전사용 권고

    # 환각 차단 메타
    is_fallback = Column(Boolean, nullable=False, default=False)               # 환각 차단 회피 응답 여부
    created_at = Column(DateTime, nullable=False, default=func.now())          # 생성일시

    user = relationship("User")


from sqlalchemy import Column, BigInteger, String, Text, DateTime, ForeignKey, SmallInteger
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Guide(Base):
    """복약 안내 및 생활습관 가이드 테이블"""
    __tablename__ = "guide"

    id                = Column(BigInteger, primary_key=True, autoincrement=True)            # 고유 ID
    medical_record_id = Column(BigInteger, ForeignKey("medical_record.id"), nullable=False) # 진료기록 ID
    guide_type        = Column(String(20), nullable=False)                                  # 가이드 유형 ("medication" / "lifestyle")
    content           = Column(Text, nullable=True)                                         # 가이드 내용 (생성 전 null)
    is_generated      = Column(SmallInteger, nullable=False, default=0)                     # 생성 완료 여부 (0: 생성 중, 1: 완료)
    created_at        = Column(DateTime, nullable=False, default=func.now())                # 생성일시
    updated_at        = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())  # 수정일시

    # 관계 정의
    medical_record = relationship("MedicalRecord", back_populates="guides")

