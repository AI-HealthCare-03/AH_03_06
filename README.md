# Viva

진료기록 기반 복약 안내 및 생활습관 개선 가이드 자동 생성 서비스

## 서비스 소개

사용자의 건강검진 데이터 및 진료기록을 기반으로 AI가 개인 맞춤형 복약 안내, 식단, 운동, 수면 가이드를 자동 생성하는 반응형 웹 서비스입니다.

## 주요 기능

- 건강검진 데이터 입력 및 정상/주의/위험 분류
- AI 기반 복약 안내 자동 생성
- AI 기반 식단/운동/수면 가이드 자동 생성
- 복약 알림 및 복약 이력 관리
- 진료기록 관리 (직접 입력 / OCR 자동 인식)

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | HTML, CSS, JavaScript |
| Backend | Python, FastAPI |
| Database | MySQL |
| Vector DB | ChromaDB |
| LLM | GPT API (OpenAI) |
| 배포 | AWS EC2, Docker |

## 프로젝트 구조

```
AH_03_06/
├── backend/    # FastAPI 백엔드
├── frontend/   # HTML/CSS/JS 프론트엔드
└── ml/         # ML 모델 학습
```

## 팀원

| 이름 | 역할 |
|------|------|
| 김창현 (조장) | 인증/계정 백엔드, 진료기록 분석/LLM, 식단 가이드 전체 |
| 윤성수 | 복약 관리 백엔드, 알림 시스템, 운동 가이드 전체 |
| 이경민 | 홈/대시보드 프론트, 수면 가이드 전체, 각 가이드 UI |
| 권대원 | 인증/복약/진료기록 프론트, 마이페이지/설정 전체 |

## 관련 문서

- [Backend README](./backend/README.md)
- [Frontend README](./frontend/README.md)