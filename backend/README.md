# Viva Backend

진료기록 기반 복약 안내 및 생활습관 개선 가이드 자동 생성 서비스 백엔드

## 기술 스택

- Python 3.11
- FastAPI
- SQLAlchemy
- MySQL
- ChromaDB

## 폴더 구조

```
backend/
├── app/
│   ├── main.py         # FastAPI 앱 진입점
│   ├── config.py       # 환경변수 설정
│   ├── database.py     # DB 연결
│   ├── api/v1/         # 엔드포인트 라우터
│   ├── models/         # DB 모델
│   ├── schemas/        # 요청/응답 스키마
│   ├── services/       # 비즈니스 로직
│   ├── repositories/   # DB 접근 계층
│   └── utils/          # 공통 유틸
├── requirements.txt
├── Dockerfile
└── .env
```

## 로컬 실행 방법

### 1. 가상환경 생성 및 활성화
```
python -m venv venv
.\venv\Scripts\activate
```

### 2. 패키지 설치
```
pip install -r requirements.txt
```

### 3. 환경변수 설정

.env 파일 생성 후 아래 항목 입력
```
SECRET_KEY=
DB_HOST=
DB_PORT=3306
DB_NAME=
DB_USER=
DB_PASSWORD=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
KAKAO_CLIENT_ID=
OPENAI_API_KEY=
```

### 4. 서버 실행
```
uvicorn app.main:app --reload
```

### 5. API 문서 확인
```
http://127.0.0.1:8000/docs
```