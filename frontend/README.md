# Viva Frontend

진료기록 기반 복약 안내 및 생활습관 개선 가이드 자동 생성 서비스 프론트엔드

## 기술 스택

- React 18
- Vite
- Tailwind CSS v3
- React Router DOM

## 폴더 구조
```
frontend/
├── src/
│   ├── api/
│   │   └── auth.js
│   ├── components/
│   ├── pages/
│   │   ├── landing/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── user/
│   │   ├── health-checkup/
│   │   ├── medical-record/
│   │   ├── medication/
│   │   └── guide/
│   ├── styles/
│   ├── utils/
│   │   └── token.js
│   ├── App.jsx
│   └── main.jsx
├── public/
├── .env
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

## 로컬 실행 방법

### 1. 패키지 설치
```
cd frontend
npm install
```

### 2. 환경변수 설정
frontend/.env 파일 생성 후 아래 항목 입력
```
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### 3. 개발 서버 실행
```
npm run dev
```

### 4. 브라우저 확인
http://localhost:5173