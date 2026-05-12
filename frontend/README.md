# Viva Frontend

진료기록 기반 복약 안내 및 생활습관 개선 가이드 자동 생성 서비스 프론트엔드

## 기술 스택

- HTML
- CSS
- JavaScript

## 폴더 구조

```
frontend/
├── pages/
│   ├── auth/           # 인증 관련 페이지 (로그인, 회원가입 등)
│   ├── medication/     # 복약 관련 페이지
│   ├── medical-record/ # 진료기록 관련 페이지
│   ├── health-checkup/ # 건강검진 관련 페이지
│   ├── guide/          # 가이드 관련 페이지 (식단/운동/수면)
│   ├── dashboard/      # 홈/대시보드 페이지
│   └── user/           # 마이페이지 관련 페이지
├── assets/
│   ├── css/            # 스타일시트
│   ├── js/             # 자바스크립트
│   └── images/         # 이미지 파일
└── components/         # 공통 컴포넌트 (헤더, 푸터, 네브바)
```

## 실행 방법

브라우저에서 pages/dashboard/home.html 파일을 열어 실행합니다.

## API 연동

백엔드 API 주소: http://127.0.0.1:8000