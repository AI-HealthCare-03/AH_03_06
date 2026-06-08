# Frontend

> React 기반 반응형 웹 앱 — Viva 서비스의 사용자 인터페이스

## 프로젝트 개요

- **프레임워크**: React 19 + Vite 8
- **스타일링**: Tailwind CSS v3, Pretendard 폰트
- **라우팅**: React Router DOM v7
- **인증**: JWT (localStorage) + Google OAuth 2.0
- **API 통신**: Fetch API (Bearer Token 인증)

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | React 19 |
| 번들러 | Vite 8 |
| 라우팅 | React Router DOM v7 |
| 스타일링 | Tailwind CSS v3 |
| 아이콘 | Font Awesome 7 |
| 마크다운 렌더링 | react-markdown |
| 폰트 | Pretendard |

---

## 프로젝트 구조

```
frontend/src/
├── api/                        # 도메인별 API 모듈
│   ├── auth.js                 # 로그인·회원가입·토큰 재발급
│   ├── chat.js                 # 채팅 세션·메시지 CRUD
│   ├── dietGuides.js           # 식단 가이드 생성·조회
│   ├── healthCheckup.js        # 건강검진 조회
│   ├── medicalRecord.js        # 진료기록 CRUD
│   ├── medication.js           # 복약 스케줄·오늘 복약·대시보드
│   ├── medicationGuides.js     # 복약 가이드 스트리밍 생성
│   ├── medicationHistories.js  # 복약 이력 CSV 내보내기
│   ├── safetyCheck.js          # DUR 안전성 검사
│   └── sleepGuides.js          # 수면 가이드 생성·조회
├── pages/
│   ├── auth/                   # 로그인·회원가입·비밀번호 찾기
│   ├── dashboard/              # 홈 대시보드
│   ├── guide/                  # 식단·복약·수면·운동 가이드
│   ├── health-checkup/         # 건강검진 입력·결과
│   ├── medical-record/         # 진료기록·OCR
│   ├── medication/             # 복약 관리·이력·대시보드
│   ├── chat/                   # 멀티턴 AI 챗봇
│   └── user/                   # 마이페이지·프로필 수정
├── components/                 # 공통 컴포넌트
└── utils/
    └── token.js                # Access/Refresh Token 관리
```

---

## 시작하기

```bash
# 패키지 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
```

---

## 환경 변수

`.env.development` 또는 `.env.production` 파일에 아래 변수를 설정합니다.

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `VITE_API_BASE_URL` | 백엔드 API 기본 URL | `http://localhost:8000/api/v1` |
| `VITE_USE_MOCK` | Mock 모드 활성화 여부 | `false` |

> `VITE_USE_MOCK=true` 설정 시 `medication.js`가 실제 API 대신 Mock 서비스를 사용합니다.

---

## 주요 기능

### 1. 인증

이메일/비밀번호 로그인과 Google OAuth 2.0을 지원합니다. 토큰은 `localStorage`에 저장하며 `App.jsx`의 전역 상태로 인증 여부를 관리합니다.

**회원가입 플로우**

```
이메일·비밀번호·약관 동의 (/register)
      ↓
닉네임 설정 — 자동 추천 + 수동 수정 (/register/nickname)
      ↓
생년월일·성별 (/register/basic-info)
      ↓
신장·체중 (/register/body-info)
      ↓
생활습관 — 흡연·음주·운동 (/register/lifestyle)
      ↓
수면 정보 (/register/sleep)
      ↓
기저질환·건강목표 → POST /users/profile/initial 저장 후 홈으로 (/register/health)
```

- `PrivateRoute` / `PublicRoute` 컴포넌트로 인증 상태에 따라 라우팅 분기
- Google OAuth 콜백: `/auth/callback`에서 URL 파라미터로 토큰 수신 후 `localStorage` 저장
- 비밀번호 재설정 링크는 발송 후 30분간 유효하며 URL의 `token` 파라미터로 처리

---

### 2. 홈 대시보드

로그인 후 진입하는 메인 화면으로, 사용자의 건강 데이터를 한눈에 확인할 수 있습니다.

**표시 항목**
- 오늘의 복약 현황 — 완료/전체 건수, 달성률 프로그레스 바
- 최근 건강 수치 — 수축기·이완기 혈압, 공복혈당, BMI (정상/주의/위험 뱃지)
- 오늘의 AI 가이드 — 식단·운동·수면 가이드 진입 카드
- 최근 진료기록 — 진료일, 진단명, 병원명·진료과

---

### 3. 건강검진

건강검진 수치를 연도별로 입력하고 위험군을 자동 분류합니다.

**입력 항목**
- 필수: 신장, 체중, 수축기·이완기 혈압, 공복혈당
- 선택: 허리둘레, 총 콜레스테롤, HDL/LDL, 중성지방, 혈색소, 크레아티닌, AST/ALT/γ-GTP

**결과 분류 기준**

| 항목 | 정상 | 주의 | 위험 |
|------|------|------|------|
| 수축기 혈압 | ≤120 mmHg | 121~129 mmHg | ≥130 mmHg |
| 공복혈당 | <100 mg/dL | 100~125 mg/dL | ≥126 mg/dL |
| 총 콜레스테롤 | <200 mg/dL | 200~239 mg/dL | ≥240 mg/dL |
| BMI | 18.5~22.9 | 23~24.9 | ≥25 |

- 이전 연도 데이터가 있을 경우 자동으로 불러와 수정 편의 제공
- 결과 화면에서 AI 채팅 상담 및 AI 가이드 바로가기 연결

---

### 4. 진료기록 및 처방전 OCR

진료기록을 직접 입력하거나 처방전 사진으로 자동 등록할 수 있습니다.

**처방전 OCR 플로우**

```
처방전 사진 촬영 또는 업로드 (/medical-records/ocr)
      ↓
CLOVA OCR API 호출 — 처방전 14개 필드 추출 (/medical-records/ocr/processing)
      ↓
인식 결과 확인 및 수정 — 미인식 항목 빨간 테두리 표시 (/medical-records/ocr/result)
      ↓
진료기록 등록 폼으로 prefill 후 저장 (/medical-records/new)
```

**진료기록 목록 기능**
- 진단명·병원명 키워드 검색
- 진료과·기간 필터 (바텀시트 드로어)
- 최신순/오래된순 정렬

**진료기록 상세**
- 처방약 목록 및 DUR 안전성 검사 결과 표시
- 경고 수준: 차단(Ban) → 경고(Warning) → 안내(Info) 3단계

---

### 5. 복약 관리

처방약 스케줄을 등록하고 오늘의 복약 현황을 관리합니다.

**오늘 복약 화면**

- 시간대(아침·점심·저녁)별 복약 그룹 표시
- 각 약의 복약 완료/예정 상태 토글
- `intake_time` 기준으로 아침(06~11시)/점심(11~17시)/저녁(17시 이후) 자동 분류

**복약 달성 대시보드**

- 주간/월간 전체 달성률 도넛 차트 (SVG)
- 일별 복약 완료율 바 차트
- 약별 달성률 프로그레스 바

**복약 이력**
- 기간 선택(빠른 선택 7·14·30·90일 또는 직접 입력) 후 날짜별 그룹 조회
- CSV 파일 내보내기 (`/medication-histories/export`)

---

### 6. AI 가이드

건강검진 데이터 및 설문을 기반으로 RAG + LLM이 생성한 맞춤 가이드를 제공합니다.

#### 식단 가이드

- 달력 UI에서 날짜 선택 → 해당 날짜의 가이드 조회
- 가이드가 없으면 최신 건강검진 데이터 기반으로 생성 요청
- 가이드 생성 중 3초 폴링으로 완료 여부 확인
- 영양소 기준(칼로리·탄수화물·단백질·지방), 아침·점심·저녁 식단, 권장/제한 식품 표시
- 식단 유형: 균형 식단, 저염, 저탄수화물, 저칼로리, 치료 식단 등 8종

#### 복약 가이드

- 처방약 기반으로 식약처 자료를 RAG 검색하여 가이드 생성
- **스트리밍 생성**: `/medication_guides/generate-stream` NDJSON 스트림으로 토큰 단위 실시간 렌더링
  - `meta` 이벤트 → 약 이름 표시
  - `token` 이벤트 → 본문 누적
  - `done` 이벤트 → `guide_id` 수신 후 상세 페이지로 이동
- 안전 카드: 차단(Ban) / 경고(Warning) / 안내(Info) 수준별 표시
- 데모용 약품 검색(`/medication_guides/drug-suggest`) 및 미리보기(`/medication_guides/preview-stream`) 지원

#### 수면 가이드

수면 설문을 입력하면 AI가 수면 상태를 분석하고 코칭을 제공합니다.

**설문 입력 항목**
- 평일·주말 취침/기상 시간
- 간이 수면 설문 (brief_survey_q1~q5)
- Epworth 졸음 척도 (ESS, ess_q1~q8)
- 카페인 섭취 종류 및 잔 수
- 수면 방해 원인

**결과 표시**
- 전체 수면 상태: 정상(0) / 주의(1) / 위험(2) 3단계 분류
- 평균 수면 시간, 주말 수면 시차, 일일 카페인 섭취량
- 오늘 할 일, 주간 목표, 대처 전략, 생활습관 조정, 전문 상담 권장 여부

#### 운동 가이드

백엔드 미구현 상태로 결과 화면 샘플만 제공됩니다.

---

### 7. 멀티턴 AI 챗봇

가이드 및 건강검진 결과 화면에서 진입할 수 있는 컨텍스트 기반 AI 상담 챗봇입니다.

**지원 컨텍스트**

| 컨텍스트 타입 | 진입 경로 | 상담 내용 |
|---------------|-----------|-----------|
| `DIET_GUIDE` | 식단 가이드 상세 | 식단 플랜·영양소·제한 식품 |
| `HEALTH_CHECKUP` | 건강검진 결과 | 혈압·혈당·전반적 건강 상태 |
| `PRESCRIPTION` | 진료기록 상세 | 복용 방법·부작용·약 조합 |
| `SLEEP_GUIDE` | 수면 가이드 상세 | 수면 상태·개선 방법·전문 상담 |

**화면 상단 컨텍스트 패널**
- 식단 가이드 진입 시: 식단 유형, 영양소 기준, 아침·점심·저녁 요약 표시
- 건강검진 진입 시: 혈압·혈당·콜레스테롤·BMI 수치 표시
- 수면 가이드 진입 시: 평균 수면 시간, 주말 시차, 카페인 섭취량 표시

**메시지 기능**
- 예시 질문 카테고리 선택 → 세부 질문 선택 또는 직접 입력
- 사용자 메시지 수정 (수정 후 AI 재답변 자동 생성)
- AI 메시지 재생성
- 메시지 단건 삭제 및 전체 삭제
- 채팅방 나가기 (세션 삭제)

---

## API 모듈 구조

모든 API 모듈은 `VITE_API_BASE_URL` 환경 변수를 기준으로 요청하며, `token.js`에서 가져온 Access Token을 `Authorization: Bearer` 헤더에 포함합니다.

```
src/api/
├── auth.js              # POST /auth/login, /auth/register, /auth/logout
│                        # POST /auth/token/refresh
│                        # POST /auth/email/find, /auth/password/find
│                        # PUT  /auth/password/reset
├── chat.js              # POST   /chat/sessions
│                        # POST   /chat/sessions/:id/messages
│                        # GET    /chat/sessions/:id/messages
│                        # PUT    /chat/sessions/:id/messages/:msgId
│                        # DELETE /chat/sessions/:id/messages/:msgId
│                        # POST   /chat/sessions/:id/messages/:msgId/regenerate
│                        # DELETE /chat/sessions/:id/messages (전체 삭제)
│                        # DELETE /chat/sessions/:id
├── dietGuides.js        # GET  /guides/diet
│                        # GET  /guides/diet/:date
│                        # POST /guides/diet/generate
│                        # POST /guides/diet/regenerate
│                        # POST /guides/diet/generate-course
│                        # DELETE /guides/diet/:date
├── healthCheckup.js     # GET /health-checkups
│                        # GET /health-checkups/:id
│                        # GET /health-checkups/year/:year
├── medicalRecord.js     # POST   /medical-records
│                        # GET    /medical-records
│                        # GET    /medical-records/:id
│                        # PUT    /medical-records/:id
│                        # DELETE /medical-records/:id
├── medication.js        # GET   /medications/list
│                        # GET   /medications/today
│                        # GET   /medications/by-date
│                        # PATCH /medications/check
│                        # POST  /medications/schedules
│                        # DELETE /medications/schedules/:id
│                        # GET   /medications/calendar
│                        # GET   /medications/dashboard
│                        # GET   /medications/schedules (이력 조회)
├── medicationGuides.js  # GET  /medication_guides/:id
│                        # GET  /medication_guides
│                        # POST /medication_guides/generate
│                        # POST /medication_guides/generate-stream  (NDJSON 스트리밍)
│                        # POST /medication_guides/preview
│                        # POST /medication_guides/preview-stream
│                        # GET  /medication_guides/drug-suggest
│                        # DELETE /medication_guides/:id
├── medicationHistories.js # GET /medication-histories/export (CSV Blob)
├── safetyCheck.js       # GET /medical-records/:id/safety-check
└── sleepGuides.js       # POST   /sleep_guides/generate
                         # GET    /sleep_guides/:id
                         # GET    /sleep_guides
                         # DELETE /sleep_guides/:id
                         # GET    /sleep_guides/caffeine-types
```

---

## 인증 흐름

```
로그인 성공
    ↓
access_token, refresh_token → localStorage 저장 (token.js)
    ↓
App.jsx의 auth 상태 → true
    ↓
PrivateRoute 통과 → 보호된 페이지 접근 가능

로그아웃
    ↓
POST /auth/logout (refresh_token 전달)
    ↓
localStorage 토큰 삭제 → auth 상태 → false
    ↓
/login 으로 리다이렉트
```

Google OAuth 흐름:
```
로그인 페이지 → GET /auth/social/google 로 리다이렉트
    ↓
Google 인증 완료
    ↓
/auth/callback?access_token=...&refresh_token=... 로 리다이렉트
    ↓
AuthCallback.jsx에서 토큰 파싱 후 localStorage 저장 → 홈으로 이동
```
