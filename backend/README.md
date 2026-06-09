# Backend

> FastAPI 기반 RESTful API 서버 — Viva 서비스의 백엔드

## 프로젝트 개요

- **프레임워크**: Python, FastAPI
- **데이터베이스**: MySQL (SQLAlchemy ORM)
- **벡터 DB**: ChromaDB
- **LLM**: GPT-4o-mini (OpenAI)
- **OCR**: CLOVA OCR
- **인증**: JWT, Google OAuth 2.0
- **푸시 알림**: Firebase FCM
- **배포**: AWS EC2, Docker

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | FastAPI 0.136, Uvicorn |
| ORM | SQLAlchemy 2.0, PyMySQL |
| 인증 | python-jose, passlib, bcrypt |
| LLM/RAG | LangChain, langchain-openai, langchain-chroma, OpenAI |
| 벡터 DB | ChromaDB 1.5 |
| 스케줄러 | APScheduler |
| 푸시 알림 | firebase-admin |
| 이메일 | fastapi-mail |
| OCR | CLOVA OCR (httpx) |
| 한국어 처리 | jamo, rapidfuzz |

---

## 프로젝트 구조

```
backend/app/
├── api/v1/
│   ├── attendance.py        # 출석체크
│   ├── auth.py              # 인증
│   ├── chat.py              # 멀티턴 AI 챗봇
│   ├── dashboard.py         # 홈 대시보드
│   ├── guides.py            # 식단·운동 가이드
│   ├── health_checkups.py   # 건강검진
│   ├── medical_records.py   # 진료기록
│   ├── medications.py       # 복약 관리
│   ├── medication_guides.py # 복약 가이드
│   ├── medication_histories.py # 복약 이력 CSV
│   ├── ocr.py               # 처방전 OCR
│   ├── point.py             # 포인트
│   ├── push.py              # FCM 푸시 알림
│   ├── sleep_guides.py      # 수면 가이드
│   └── users.py             # 사용자 프로필
├── models/                  # SQLAlchemy DB 모델
├── schemas/                 # Pydantic 요청/응답 스키마
├── services/                # 비즈니스 로직
├── repositories/            # DB 쿼리
├── utils/                   # 인증, RAG 유틸
├── prompts/                 # LLM 프롬프트
├── data/chroma_db/          # 벡터 DB
├── config.py                # 환경변수 설정
├── database.py              # DB 연결
├── main.py                  # FastAPI 앱 진입점
└── scheduler.py             # APScheduler 복약 알림
```

---

## 시작하기

```bash
# 패키지 설치
pip install -r requirements.txt

# 개발 서버 실행
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Docker 실행:
```bash
docker-compose up --build
```

---

## 환경 변수

`.env` 파일에 아래 변수를 설정합니다.

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `SECRET_KEY` | JWT 서명 키 | `your-secret-key` |
| `DB_HOST` | MySQL 호스트 | `localhost` |
| `DB_PORT` | MySQL 포트 | `3306` |
| `DB_NAME` | DB 이름 | `viva` |
| `DB_USER` | DB 사용자 | `root` |
| `DB_PASSWORD` | DB 비밀번호 | `password` |
| `OPENAI_API_KEY` | OpenAI API 키 | `sk-...` |
| `EMBEDDING_MODEL` | 임베딩 모델 | `text-embedding-3-small` |
| `GENERATION_MODEL` | 생성 모델 | `gpt-4o-mini` |
| `CHROMA_DIR` | ChromaDB 경로 | `/app/ml_data/chroma_db` |
| `GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID | `...` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 클라이언트 시크릿 | `...` |
| `GOOGLE_REDIRECT_URI` | Google OAuth 리다이렉트 URI | `http://localhost:8000/api/v1/auth/social/google/callback` |
| `MAIL_USERNAME` | 이메일 계정 | `...@gmail.com` |
| `MAIL_PASSWORD` | 이메일 비밀번호 | `...` |
| `MAIL_FROM` | 발신 이메일 | `...@gmail.com` |
| `FIREBASE_CREDENTIALS_PATH` | Firebase 키 파일 경로 | `firebase_key.json` |
| `FRONTEND_URL` | 프론트엔드 URL | `http://localhost:5173` |

> `EMBEDDING_MODEL`을 변경하면 ChromaDB를 해당 모델로 전체 재구축해야 합니다.

---

## 주요 기능

### 1. 인증

이메일/비밀번호 로그인과 Google OAuth 2.0을 지원합니다. Access Token(30분)과 Refresh Token(14일)을 발급하며, Refresh Token은 `refresh_token` 테이블에서 provider(local/google) 구분으로 통합 관리합니다. 비밀번호 재설정 링크는 이메일로 발송되며 30분간 유효합니다.

**회원가입 플로우**

```
이메일·비밀번호·이름 입력 (POST /auth/register)
      ↓
닉네임 자동 생성 — 형용사+명사+4자리 숫자, 중복 시 재생성
      ↓
초기 프로필 설정 — 생년월일·성별·신장·체중·생활습관·수면·기저질환·건강목표
(POST /users/profile/initial)
```

Google OAuth 흐름:
```
GET /auth/social/google → Google 인증 페이지 리다이렉트
      ↓
Google 인증 완료 → GET /auth/social/google/callback
      ↓
신규 사용자: /register/nickname?access_token=...&refresh_token=...
기존 사용자: /auth/callback?access_token=...&refresh_token=...
```

---

### 2. 건강검진

건강검진 수치를 연도별로 입력하고 혈압·혈당·콜레스테롤·BMI 4개 항목을 자동 분류합니다. 분류 결과는 8개 위험군으로 매핑되어 식단 가이드 생성에 활용됩니다.

**분류 기준**

| 항목 | 정상 | 주의 | 위험 |
|------|------|------|------|
| 수축기 혈압 | ≤120 mmHg | 121~129 mmHg | ≥130 mmHg |
| 공복혈당 | <100 mg/dL | 100~125 mg/dL | ≥126 mg/dL |
| 총 콜레스테롤 | <200 mg/dL | 200~239 mg/dL | ≥240 mg/dL |
| BMI | 18.5~22.9 | 23~24.9 | ≥25 |

**8개 위험군 분류**

| 위험군 | 조건 | 식단 플랜 |
|--------|------|-----------|
| 정상군 | 모든 항목 정상 | Balanced Diet |
| 고혈압군 | 혈압 이상 | Low-Sodium Diet |
| 혈당이상군 | 혈당 이상 | Low-Carb Diet |
| 비만군 | BMI 이상 | Low-Calorie Diet |
| 고혈압+혈당이상군 | 혈압+혈당 이상 | Low-Carb Low-Sodium Diet |
| 고혈압+비만군 | 혈압+BMI 이상 | Low-Calorie Low-Sodium Diet |
| 혈당이상+비만군 | 혈당+BMI 이상 | Low-Carb Low-Calorie Diet |
| 복합위험군 | 3가지 모두 이상 | Therapeutic Diet |

건강검진 수치 변화 추이는 `GET /health-checkups/trend` 에서 기간(1m/3m/6m/1y) 및 항목(bp/glucose/cholesterol/bmi) 필터로 조회할 수 있습니다.

---

### 3. 진료기록 및 처방전 OCR

진료기록 등록 시 처방약이 함께 저장되며, 진료기록과 연결된 DUR 안전성 검사를 제공합니다. 처방전 사진을 업로드하면 CLOVA OCR API를 통해 14개 필드를 자동 추출합니다.

**처방전 OCR 추출 필드**

요양기관기호, 요양기관명, 발급일자·발급번호, 환자명, 주민등록번호, 질병분류기호, 의사명, 면허종류, 면허번호, 처방약 목록(약품명·투약량·투여횟수·투약일수), 용법, 주사제 정보, 조제 안내, 처방전 유효기간

**OCR 추출 전략**: 텍스트 기반 파싱과 좌표(bounding box) 기반 파싱을 병행하며, validator 통과 결과를 우선 채택합니다. 한국 성씨 기반 이름 검증, ICD 질병코드 정규식 검증, 8자리 기관코드 검증 등 14개 필드별 정합성 규칙을 적용합니다.

진료기록 목록은 진단명·병원명 키워드 검색, 진료과·기간 필터, 최신순/오래된순 정렬을 지원합니다.

---

### 4. 복약 관리

처방약 스케줄을 등록하고 오늘의 복약 현황을 관리합니다. 처방전 기반 약과 직접 등록(custom) 약을 통합 목록으로 제공합니다.

**복약 일정 구조**

`MedicationSchedule` → `ScheduleDay`(요일 N:M) → `MedicationLog`(복약 기록) 구조로 설계되어 있습니다. 진료기록 등록 시 처방약마다 기본 스케줄(매일 08:00, PUSH 알림)이 자동 생성됩니다.

**복약 완료율 대시보드**

- 주간(weekly) / 월간(monthly) 전체 달성률
- 일별 복약 완료율
- 약별 달성률

**복약 이력 CSV 내보내기**

기간을 지정하여 날짜·예정시각·약품명·용량·상태·실제복용시각 컬럼의 CSV를 UTF-8 BOM으로 내보냅니다.

---

### 5. AI 가이드

건강검진 데이터 및 설문을 기반으로 RAG + LLM이 생성한 맞춤 가이드를 제공합니다. ChromaDB에 구축된 식약처·학회 임상진료지침 벡터를 검색하여 근거 기반 응답을 생성합니다.

#### 식단 가이드

건강검진 수치 기반 위험군 분류 → RAG 검색 → GPT-4o-mini 생성 순서로 처리됩니다. 생성 요청은 `BackgroundTasks`로 비동기 처리되며, 프론트엔드는 3초 폴링으로 완료 여부를 확인합니다.

영양소 기준(칼로리·단백질·탄수화물·지방)은 체중·나이·성별·위험군 계수로 개인별 산출됩니다. 최근 7일 식단 이력을 참조하여 동일 식재료·조리법 반복을 방지합니다.

단건 생성(`/diet/generate`), 재생성(`/diet/regenerate`), 코스 생성(`/diet/generate-course`, 기본 7일) 3가지 엔드포인트를 제공합니다.

#### 복약 가이드

처방약의 식약처 e약은요·의약품안전나라(nedrug) 데이터를 RAG 검색하여 복약 안내를 생성합니다. 검색 결과가 0건이면 LLM 호출 없이 결정론적 폴백 텍스트를 반환합니다(환각 차단 게이트).

**스트리밍 생성** (`/medication_guides/generate-stream`): NDJSON 스트림으로 토큰 단위 실시간 렌더링을 지원합니다.

```
meta  이벤트 → 약품명·안전성 알림 즉시 표시
token 이벤트 → 본문 토큰 누적 렌더링
done  이벤트 → guide_id 수신 후 상세 페이지 이동
```

스트림이 중간에 끊기면 저장 코드에 도달하지 않아 DB에 미저장됩니다.

**약품명 매칭**: 처방전에 drug_id가 없는 경우 rapidfuzz WRatio + 자모 분해 fuzzy 매칭으로 item_seq를 폴백 탐색합니다. 신뢰도 90 미만이면 매칭 실패로 처리합니다.

#### DUR 안전성 검사

진료기록 처방 묶음에 대해 5종 안전성 검사를 수행합니다.

| 검사 항목 | 수준 | 설명 |
|-----------|------|------|
| 동일성분 중복 | BLOCK | 주성분(is_main=1) 기준 중복 |
| 병용금기 | BLOCK | 식약처 DUR 품목 페어(dur_concurrent_product) |
| 회수약 | BLOCK | drug_info.is_recalled 플래그 |
| 1일 최대량 초과 | WARN | 성분별 총 복용량 vs drug_dose_limit |
| 효능군 중복 | WARN | ATC 코드 앞 5자리 기준 |
| 노인주의 | INFO | 65세 이상 + 벤조디아제핀계·삼환계 항우울제 등 |

같은 환자의 다른 진료기록 처방과 직접 등록 활성 복약 스케줄 중 복용 기간이 겹치는 것도 교차 점검합니다. 마스터 데이터(DrugInfo·DrugIngredientMap·DrugDoseLimit)는 프로세스 1회 빌드 후 메모리 캐시합니다.

#### 수면 가이드

수면 설문을 입력하면 분류 알고리즘과 RAG + LLM이 수면 상태를 분석하고 코칭을 제공합니다.

**설문 입력 항목**
- 주중·주말 취침/기상 시각
- 단축 수면 설문 5문항(PSQI-K 기반, 각 0~3)
- Epworth 졸음 척도(ESS) 8문항(선택)
- 카페인 음료 종류 및 잔 수
- 수면 방해 원인

**분류 기준**

| 항목 | 정상 | 주의 | 위험 |
|------|------|------|------|
| 수면시간(NSF 기준) | 7~9h | 6~7h 또는 9~10h | <6h 또는 >10h |
| 사회적 시차(Wittmann 2006) | <1h | 1~2h | >2h |
| 단축 설문 합계 | 0~5점 | 6~10점 | 11~15점 |
| ESS 졸림 척도(Johns 1991) | 0~10점 | 11~15점 | 16~24점 |

종합 위험 단계: 위험 항목 1개 이상이면 위험(2), 주의 항목 2개 이상이면 주의(1), 그 외 정상(0).

수면효율 개선 기대치는 다변량 OLS 회귀(N=359, R²=0.346) 계수를 기반으로 금연·음주 감소·운동 증가별로 산출됩니다.

---

### 6. 멀티턴 AI 챗봇

가이드 및 건강검진 결과 화면에서 진입할 수 있는 컨텍스트 기반 AI 상담 챗봇입니다. `ChatSession` 생성 시 context_type과 context_id를 지정하면 해당 데이터를 시스템 프롬프트에 자동으로 주입합니다.

**지원 컨텍스트**

| context_type | 주입 데이터 | 상담 내용 |
|--------------|-------------|-----------|
| `DIET_GUIDE` | 식단 플랜·영양소·권장/제한 식품 | 식단·영양 상담 |
| `HEALTH_CHECKUP` | 혈압·혈당·콜레스테롤·BMI 수치 | 건강 수치 상담 |
| `PRESCRIPTION` | 활성 처방약 목록 | 복약 방법·부작용·약 조합 |
| `SLEEP_GUIDE` | 수면 분류 결과·7섹션 가이드 | 수면 개선 상담 |

편의점·GS25·CU 등 키워드가 포함된 메시지는 OpenAI Web Search 도구를 사용하여 실시간 검색 결과를 반영합니다.

**메시지 기능**: 사용자 메시지 수정(수정 시점 이후 메시지 삭제 후 재생성), AI 메시지 재생성, 단건 삭제, 전체 삭제. 대화 이력은 최근 20턴을 컨텍스트로 전달합니다.

---

### 7. FCM 푸시 알림 및 이메일 알림

복약 스케줄 기반으로 FCM 푸시 알림과 이메일 알림을 발송합니다. APScheduler가 앱 lifespan 내에서 실행되며, 복약 시각에 맞춰 알림을 트리거합니다.

FCM 토큰은 `fcm_tokens` 테이블에서 사용자별 다중 기기를 지원합니다. 알림 유형은 `MedicationSchedule.notification_type`(PUSH/EMAIL)으로 개별 설정합니다.

---

### 8. 출석체크 및 포인트

매일 1회 출석체크 시 포인트를 적립합니다. 연속 출석 현황은 `attendance_streak` 테이블에 캐싱됩니다.

**포인트 적립 규칙**

| 이벤트 | 포인트 |
|--------|--------|
| 출석 체크 | 10p |
| 연속 7일 출석 보너스 | 50p |
| 연속 30일 출석 보너스 | 100p |
| 복약 기록 | 5p |
| 건강 가이드 조회 | 3p |
| 프로필 완성 | 20p |

포인트 잔액은 `user_point` 테이블에 캐싱되며, 적립·차감 이력은 `point_history` 테이블에 원장으로 보관됩니다.

---

## API 모듈 구조

모든 엔드포인트는 `/api/v1` 프리픽스를 사용하며, JWT Bearer Token 인증이 필요합니다.

```
api/v1/
├── auth.py
│   POST   /auth/register                   # 회원가입
│   POST   /auth/login                      # 로그인
│   POST   /auth/logout                     # 로그아웃
│   POST   /auth/token/refresh              # 액세스 토큰 재발급
│   GET    /auth/social/{provider}          # 소셜 로그인 요청
│   GET    /auth/social/{provider}/callback # 소셜 로그인 콜백
│   POST   /auth/email/find                 # 이메일 찾기
│   POST   /auth/password/find              # 비밀번호 재설정 링크 발송
│   PUT    /auth/password/reset             # 비밀번호 재설정
│
├── users.py
│   POST   /users/profile/initial           # 초기 프로필 설정
│   GET    /users/me                        # 내 프로필 조회
│   PUT    /users/me                        # 내 프로필 수정
│   DELETE /users/me                        # 회원 탈퇴
│   GET    /users/me/nickname               # 닉네임 자동 생성
│   GET    /users/me/health-goals           # 건강 목표 조회
│   PUT    /users/me/health-goals           # 건강 목표 수정
│   GET    /users/me/social                 # 소셜 연동 목록
│   DELETE /users/me/social/{provider}      # 소셜 연동 해제
│   GET    /users/me/notifications          # 알림 설정 조회
│   PUT    /users/me/notifications          # 알림 설정 수정
│
├── health_checkups.py
│   POST   /health-checkups                 # 건강검진 입력
│   GET    /health-checkups                 # 건강검진 목록
│   GET    /health-checkups/{id}            # 건강검진 상세
│   PUT    /health-checkups/{id}            # 건강검진 수정
│   DELETE /health-checkups/{id}            # 건강검진 삭제
│   GET    /health-checkups/year/{year}     # 연도별 건강검진 조회
│   GET    /health-checkups/classification  # 최신 건강검진 분류 결과
│   GET    /health-checkups/trend           # 건강 수치 변화 추이
│
├── medical_records.py
│   POST   /medical-records                 # 진료기록 등록
│   GET    /medical-records                 # 진료기록 목록 (검색·필터·정렬)
│   GET    /medical-records/{id}            # 진료기록 상세
│   PUT    /medical-records/{id}            # 진료기록 수정
│   DELETE /medical-records/{id}            # 진료기록 삭제
│   GET    /medical-records/{id}/safety-check # DUR 안전성 검사
│
├── medications.py
│   GET    /medications/list                # 복약 목록 (처방+직접등록)
│   GET    /medications/today               # 오늘의 복약
│   GET    /medications/by-date             # 날짜별 복약
│   PATCH  /medications/check               # 복약 완료 토글
│   POST   /medications/schedules           # 복약 일정 등록
│   DELETE /medications/schedules/{id}      # 복약 일정 삭제
│   PUT    /medications/schedules/{id}      # 복약 일정 수정
│   GET    /medications/schedules           # 복약 이력 기간별 조회
│   GET    /medications/dashboard           # 복약 완료율 대시보드
│   PATCH  /medications/alarms/{id}         # 알림 설정 수정
│
├── medication_guides.py
│   POST   /medication_guides/generate        # 복약 가이드 생성
│   POST   /medication_guides/generate-stream # 복약 가이드 스트리밍 생성 (NDJSON)
│   GET    /medication_guides                 # 복약 가이드 목록
│   GET    /medication_guides/{id}            # 복약 가이드 단건 조회
│   DELETE /medication_guides/{id}            # 복약 가이드 삭제
│   GET    /medication_guides/drug-suggest    # 약품 자동완성 (데모)
│   POST   /medication_guides/preview         # 가이드 미리보기 (데모)
│   POST   /medication_guides/preview-stream  # 가이드 스트리밍 미리보기 (데모)
│
├── medication_histories.py
│   GET    /medication-histories/export       # 복약 이력 CSV 내보내기
│
├── guides.py
│   GET    /guides/diet                       # 식단 가이드 날짜 목록
│   GET    /guides/diet/{date}                # 식단 가이드 단건 조회
│   DELETE /guides/diet/{date}                # 식단 가이드 삭제
│   POST   /guides/diet/generate              # 식단 가이드 생성
│   POST   /guides/diet/regenerate            # 식단 가이드 재생성
│   POST   /guides/diet/generate-course       # 코스 식단 가이드 생성 (기본 7일)
│
├── sleep_guides.py
│   POST   /sleep_guides/generate             # 수면 가이드 생성
│   GET    /sleep_guides                      # 수면 가이드 목록
│   GET    /sleep_guides/{id}                 # 수면 가이드 단건 조회
│   DELETE /sleep_guides/{id}                 # 수면 가이드 삭제
│   GET    /sleep_guides/caffeine-types       # 카페인 음료 마스터
│
├── chat.py
│   POST   /chat/sessions                              # 채팅 세션 생성
│   GET    /chat/sessions/{id}                         # 채팅 세션 조회
│   DELETE /chat/sessions/{id}                         # 채팅 세션 삭제
│   POST   /chat/sessions/{id}/messages                # 메시지 전송
│   GET    /chat/sessions/{id}/messages                # 메시지 이력 조회
│   PUT    /chat/sessions/{id}/messages/{msg_id}       # 메시지 수정
│   DELETE /chat/sessions/{id}/messages/{msg_id}       # 메시지 단건 삭제
│   DELETE /chat/sessions/{id}/messages                # 메시지 전체 삭제
│   POST   /chat/sessions/{id}/messages/{msg_id}/regenerate # AI 메시지 재생성
│
├── ocr.py
│   POST   /ocr/prescription                  # 처방전 OCR 필드 추출
│
├── push.py
│   POST   /push                              # FCM 토큰 등록
│   DELETE /push                              # FCM 토큰 삭제
│   POST   /push/test                         # 알림 테스트 발송
│
├── attendance.py
│   POST   /attendance/check-in               # 출석 체크인
│   GET    /attendance/status                 # 오늘 출석 여부 + 연속일수
│   GET    /attendance/calendar               # 월별 출석 날짜 목록
│
└── point.py
    GET    /point/balance                     # 포인트 잔액 조회
    GET    /point/history                     # 포인트 이력 조회
```

---

## 인증 흐름

```
로그인 성공
    ↓
access_token (30분), refresh_token (14일) 발급
    ↓
클라이언트 → Authorization: Bearer {access_token} 헤더 포함
    ↓
get_current_user 의존성 → JWT 검증 → user 객체 반환

액세스 토큰 만료 시
    ↓
POST /auth/token/refresh (refresh_token 전달)
    ↓
refresh_token 테이블 조회 → is_revoked 확인 → 만료 확인
    ↓
새 access_token 발급

로그아웃
    ↓
POST /auth/logout (refresh_token 전달)
    ↓
refresh_token.is_revoked = 1 → 무효화
```

---

## DB 모델 구조

```
User (사용자)
├── UserProfile          # 생년월일·성별
├── UserHealthInfo       # 신장·체중
├── UserUnderlyingDisease # 기저질환 (1:N)
├── UserHealthGoal       # 건강 목표 (1:N)
├── SmokingInfo          # 흡연 습관
├── AlcoholInfo          # 음주 습관
├── ExerciseInfo         # 운동 습관
│   └── UserExerciseType # 운동 종류 (N:M)
├── SleepInfo            # 수면 습관 (회원가입 시)
├── DietInfo             # 식사 습관
│   ├── UserCuisine      # 선호 음식 (N:M)
│   ├── UserFoodAversion # 기피 음식 (N:M)
│   └── UserAllergy      # 알레르기 (N:M)
├── SocialLogin          # 소셜 로그인 연동
├── RefreshToken         # 리프레시 토큰
├── HealthCheckup        # 건강검진 (1:N)
├── MedicalRecord        # 진료기록 (1:N)
│   ├── Prescription     # 처방약 (1:N)
│   │   └── MedicationSchedule # 복약 일정
│   │       ├── ScheduleDay    # 요일 (N:M)
│   │       ├── MedicationLog  # 복약 기록
│   │       └── Notification   # 알림 이력
│   └── Guide            # 복약·생활습관 가이드
├── MedicationGuide      # 복약 가이드 (RAG+LLM)
├── SleepSurveyResponse  # 수면 설문 응답 (1:N)
│   └── SleepSurveyCaffeine # 카페인 정션
├── SleepGuide           # 수면 가이드
│   └── SleepGuideGuideline # 참고 임상진료지침 정션
├── Attendance           # 출석 기록
├── AttendanceStreak     # 연속 출석 캐시
├── UserPoint            # 포인트 잔액 캐시
├── PointHistory         # 포인트 이력 원장
└── FcmToken             # FCM 토큰 (다중 기기)

약품 마스터 (사용자 독립)
├── DrugInfo             # 약품 기준 정보 (식약처 허가목록)
│   ├── DrugInfoDetail   # 약품 상세 (e약은요·nedrug)
│   └── DrugIngredientMap # 약품-성분 매핑 (N:M)
├── DrugDoseLimit        # 성분별 1일 최대 투여량
├── DurConcurrentProduct # 품목 단위 병용금기 (~40만 행)
├── DurConcurrentIngredient # 성분 단위 병용금기
├── ClinicalGuideline    # 임상진료지침 메타
├── CaffeineDrinkType    # 카페인 음료 마스터
└── Department           # 진료과 마스터
```
