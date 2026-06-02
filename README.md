# Viva
> 건강검진 데이터 기반 복약·식단·운동·수면 가이드 자동 생성 반응형 웹 서비스

## 서비스 소개
사용자의 건강검진 데이터 및 진료기록을 기반으로 AI가 개인 맞춤형 복약 안내, 식단, 운동, 수면 가이드를 자동 생성하는 반응형 웹 서비스입니다.

## 주요 기능
- 건강검진 수치 입력 및 혈압·혈당·BMI 기반 8개 위험군 자동 분류
- 처방전 사진 촬영 → CLOVA OCR 자동 인식 → 진료기록 등록
- RAG + LLM 기반 개인 맞춤형 식단 가이드 자동 생성
- RAG + LLM 기반 복약 가이드 자동 생성 및 DUR 안전성 검사
- 수면 설문 기반 RAG LLM 수면 코칭
- 건강검진·처방약·식단 데이터 기반 멀티턴 AI 챗봇
- FCM 푸시 알림 기반 복약 스케줄 관리

## 기술 스택
| 영역 | 기술 |
|------|------|
| Frontend | HTML, CSS, JavaScript |
| Backend | Python, FastAPI |
| Database | MySQL |
| Vector DB | ChromaDB |
| LLM | GPT-4o-mini (OpenAI) |
| OCR | CLOVA OCR |
| 배포 | AWS EC2, Docker |

## 프로젝트 구조
```
AH_03_06/
├── backend/
│   └── app/
│       ├── api/v1/          # 엔드포인트
│       ├── models/          # DB 모델
│       ├── schemas/         # 요청/응답 스키마
│       ├── services/        # 비즈니스 로직
│       ├── repositories/    # DB 쿼리
│       ├── utils/           # 인증, RAG 유틸
│       ├── prompts/         # LLM 프롬프트
│       └── data/chroma_db/  # 벡터 DB
├── frontend/
│   └── src/
│       ├── pages/           # 라우트별 페이지
│       ├── components/      # 공통 컴포넌트
│       ├── api/             # API 연동
│       └── utils/
└── ml/
├── notebooks/           # 학습 노트북
├── src/                 # 모델 소스
├── models/              # 학습된 모델
└── rag/                 # RAG 문서/임베딩
```

## 팀원 및 기여

| 이름 | 역할 | 주요 구현 |
|------|------|-----------|
| 김창현 (조장) | 프로젝트 리더, 백엔드, 프론트엔드 | 개발환경 세팅, 인증 시스템 전체 (JWT/Google OAuth), 건강검진 CRUD, 혈압·혈당·BMI 기반 위험군 분류 엔진, RAG+LLM 식단 가이드 파이프라인, CLOVA OCR 처방전 14개 필드 추출, 멀티턴 챗봇, DUR 안전성 검사 |
| 윤성수 | 백엔드, ML | 복약 가이드 RAG·LLM 백엔드, 복약 이력 관리, DUR 안전성 검사, 수면 가이드 RAG LLM, drug_matching_service, 식약처 의약품 데이터 적재 |
| 이경민 | 프론트엔드 | 진료기록 UI, 복약 관리 UI, OCR 페이지 |

## 관련 문서
- [Backend README](./backend/README.md)
- [Frontend README](./frontend/README.md)
