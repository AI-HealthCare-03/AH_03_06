# ML

> 건강 데이터 분석·분류 모델 및 RAG 벡터스토어 구축 — Viva 서비스의 ML

## 프로젝트 개요

- **언어**: Python 3.13
- **ML 프레임워크**: scikit-learn, PyTorch
- **임베딩**: sentence-transformers (all-MiniLM-L6-v2)
- **벡터 DB**: ChromaDB
- **OCR**: CLOVA OCR, EasyOCR
- **이미지 증강**: Augraphy
- **PDF 처리**: pypdf, pymupdf, pdf2image

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| ML | scikit-learn 1.8, PyTorch 2.12 |
| 임베딩·벡터 DB | sentence-transformers, ChromaDB |
| OCR | EasyOCR 1.7.2, CLOVA OCR (API) |
| 이미지 증강 | Augraphy 8.2.6, OpenCV (headless) |
| PDF 처리 | pypdf, pymupdf, pdf2image |
| 수치 계산 | numpy, scipy |
| 데이터 처리 | pandas, scikit-learn Pipeline |

---

## 프로젝트 구조

```
ml/
├── data/
│   ├── ocr/prescriptions/
│   │   ├── output/          # 처방전 HWP 원본 (501건)
│   │   ├── output_aug/      # Augraphy 증강 이미지 PNG (건당 5장)
│   │   ├── output_ocr/      # CLOVA OCR 결과 시각화 및 batch_eval_results.csv
│   │   ├── output_png/      # HWP → PNG 변환본 (501건)
│   │   ├── 처방전_데이터.csv
│   │   └── 처방전_양식.hwp
│   ├── processed/           # health_clustered.csv, health_grouped.csv
│   └── raw/                 # 원천 데이터 CSV (공개 데이터셋 + 국민건강보험공단)
├── models/
│   ├── diet/                # kmeans_model.pkl, scaler.pkl
│   ├── exercise/            # (예정)
│   └── sleep/               # (예정)
├── notebooks/
│   ├── diet/                # 01_eda ~ 04_nutrient_standard
│   ├── exercise/            # 01_eda ~ 04_exercise_guide
│   ├── medication/          # 01_eda ~ 04_rag_llm + README.md
│   ├── ocr/                 # 00_generate ~ 02_ocr_clova
│   └── sleep/               # 01_eda ~ 04_regression_weights
├── rag/
│   ├── documents/           # diet / exercise / sleep (임상진료지침 PDF 적재 위치)
│   ├── embeddings/          # ChromaDB 영속 저장 위치
│   └── scripts/
│       ├── build_diet_rag.py
│       ├── build_exercise_rag.py
│       └── build_sleep_rag.py
├── src/
│   ├── common/
│   │   ├── health_classifier.py   # 혈압·혈당·콜레스테롤·BMI·허리둘레 분류
│   │   └── preprocessing.py       # 수치 스케일링·범주형 인코딩 공통 유틸
│   ├── diet/
│   │   ├── classifier.py          # 식사 패턴 분류
│   │   └── nutrient_calculator.py # 일일 영양소 산출·기준 대비 정렬
│   ├── exercise/
│   │   ├── cvd_score.py           # CVD 위험 점수 산출
│   │   ├── exercise_classifier.py # 운동 유형·강도 구간 분류
│   │   └── intensity_adjuster.py  # 임상·행동 요인 반영 운동 강도 결정
│   └── sleep/
│       ├── sleep_classifier.py    # 수면 상태 통합 분류
│       ├── social_jetlag.py       # 사회적 시차 산출
│       └── guide_score.py         # 수면효율 예측 점수 및 기대 개선치
├── .gitignore
├── README.md
└── requirements.txt
```

---

## 시작하기

```bash
# 패키지 설치
pip install -r requirements.txt

# RAG 벡터스토어 구축 (rag/documents/{domain}/ 에 PDF 적재 후 실행)
python rag/scripts/build_diet_rag.py
python rag/scripts/build_exercise_rag.py
python rag/scripts/build_sleep_rag.py
```

---

## 주요 기능

### 1. 공통 건강 지표 분류

`src/common/health_classifier.py`는 수치 하나를 받아 정상/주의/위험 3등급을 반환하는 순수 규칙 기반 함수 모음입니다. 백엔드의 건강검진 분류 로직과 분리하여 ML 파이프라인에서 독립적으로 재사용할 수 있습니다.

**분류 기준**

| 항목 | 정상 | 주의 | 위험 |
|------|------|------|------|
| 수축기 혈압 | <120 mmHg | 120~139 mmHg | ≥140 mmHg |
| 이완기 혈압 | <80 mmHg | 80~89 mmHg | ≥90 mmHg |
| 공복혈당 | <100 mg/dL | 100~125 mg/dL | ≥126 mg/dL |
| 총콜레스테롤 | <200 mg/dL | 200~239 mg/dL | ≥240 mg/dL |
| BMI | 18.5~22.9 | <18.5 또는 23~24.9 | ≥25 |
| 허리둘레 (남) | <90 cm | — | ≥90 cm |
| 허리둘레 (여) | <85 cm | — | ≥85 cm |

---

### 2. 식단 분류 및 영양소 산출

건강검진 수치 기반 위험군 분류 결과를 입력받아 K-Means 모델(`models/diet/kmeans_model.pkl`)로 식사 패턴을 분류하고, 체중·나이·성별·위험군 계수로 개인별 일일 영양소 기준(칼로리·단백질·탄수화물·지방)을 산출합니다. 백엔드 식단 가이드 생성의 전처리 단계로 활용됩니다.

---

### 3. 운동 가이드

#### CVD 위험 점수

`src/exercise/cvd_score.py`는 4개 수치 지표를 가중합하여 0~1로 클리핑된 CVD 점수와 위험도 구간을 산출합니다.

```
CVD_score = (수축기혈압/200 × 0.30)
           + (공복혈당/300 × 0.25)
           + (총콜레스테롤/300 × 0.20)
           + (나이/80 × 0.25)
```

| 점수 구간 | 위험도 |
|-----------|--------|
| <0.35 | 저위험 |
| 0.35~0.55 | 중위험 |
| 0.55~0.75 | 고위험 |
| ≥0.75 | 매우고위험 |

#### 운동 강도 결정

`src/exercise/intensity_adjuster.py`는 여러 임상·행동 요인을 조합해 저강도/중강도/고강도를 결정합니다.

**결정 규칙**

```
1. 심혈관·뇌혈관·말초혈관 기저질환이 하나라도 있으면 → 저강도 고정
2. CVD 점수로 기본 상한 설정
3. BMI+허리둘레 등급(0~3)으로 상한 조정 (더 보수적인 쪽 채택)
4. 대사증후군 항목 수(0~1 / 2 / 3+)에 따라 추가 하향
5. 운동 습관(거의안함/가끔/규칙적)으로 미세 보정
```

---

### 4. 수면 가이드

#### 수면 상태 통합 분류

`src/sleep/sleep_classifier.py`는 4개 항목을 각각 등급화한 뒤 통합 판정합니다.

**항목별 등급 기준**

| 항목 | 정상 | 주의 | 위험 |
|------|------|------|------|
| 수면시간(NSF 기준) | 7~9시간 | 6~7시간 또는 9~10시간 | <6시간 또는 >10시간 |
| 사회적 시차(Wittmann 2006) | <1시간 | 1~2시간 | >2시간 |
| 단축 설문 합계(0~15점) | 0~5점 | 6~10점 | 11~15점 |
| ESS 졸림 척도(Johns 1991) | 0~10점 | 11~15점 | 16~24점 |

통합 판정 규칙: 위험 항목 1개 이상이면 위험, 주의 항목 2개 이상이면 주의, 그 외 정상.

#### 사회적 시차

`src/sleep/social_jetlag.py`는 Wittmann et al.(2006) 방식으로 주중·주말 수면 미드포인트(MSW/MSF)를 24시간 원형 좌표에서 계산하고, |MSF − MSW|를 사회적 시차로 정의합니다.

#### 수면효율 개선 기대치

`src/sleep/guide_score.py`는 다변량 OLS 회귀(N=359, R²=0.346) 계수를 사용하여 수면효율 점수와 라이프스타일별 한 단위 변화에 대한 기대 개선치를 산출합니다.

```
score = 0.7881
      + (흡연 × -0.0796)
      + (주당 알코올 × -0.0339)
      + (주당 운동 횟수 × +0.0202)
```

| 라이프스타일 변화 | 기대 개선치 |
|-------------------|-------------|
| 금연 | +0.0796 |
| 알코올 1단위 감소 | +0.0339 |
| 운동 1회 추가 | +0.0202 |

---

### 5. 처방전 OCR 데이터셋

`notebooks/ocr/` 파이프라인은 처방전 합성 데이터를 생성하고, Augraphy로 증강하여 CLOVA OCR 성능을 평가합니다.

**처리 흐름**

```
처방전_양식.hwp + 처방전_데이터.csv
      ↓
00_generate_prescription_sample  HWP 개별 파일 생성 (501건)
      ↓
HWP → PNG 변환 (output_png/)
      ↓
01_augment_prescriptions         Augraphy 증강 (건당 5장 → output_aug/)
      ↓
02_ocr_clova                     CLOVA OCR API 호출 → batch_eval_results.csv
```

---

### 6. 복약 데이터 및 RAG

`notebooks/medication/`은 식약처 공공데이터 7종을 활용하여 약품 매칭, DUR 안전성 검사, RAG+LLM 파이프라인을 구축합니다. 원천 데이터는 약 330MB로 GitHub에 포함되지 않으며, 팀 공유 드라이브에서 별도 수령 후 `data/raw/medication/`에 배치합니다.

**식약처 공공데이터 7종**

| 파일 | 내용 |
|------|------|
| OpenData_ItemPermitC | 의약품 제품허가목록 |
| OpenData_ItemPermitDetail | 의약품 제품허가 상세 (효능·용법·주의사항) |
| OpenData_EasyExcelList | e약은요 (일반인 복약 설명) |
| OpenData_DayMaxDosgQyInfo | 성분별 1일 최대 투여량 |
| OpenData_PotOpenRecallSaleStop | 회수/판매 중지 정보 |
| OpenData_PotOpenDurIngr_A | DUR 성분 병용금기 |
| OpenData_PotOpenDurItem_A | DUR 품목 안전사용 서비스 |

---

### 7. RAG 벡터스토어

`rag/scripts/` 빌드 스크립트는 임상진료지침 PDF를 청킹·임베딩하여 ChromaDB 컬렉션으로 구축합니다. 백엔드 RAG 검색은 이 컬렉션에서 코사인 유사도로 근거 문서를 조회합니다.

청킹 전략: 문단 단위 분할 후 900자 초과 시 문장 단위 추가 분할. 임베딩 모델은 `sentence-transformers/all-MiniLM-L6-v2`.

| 컬렉션명 | 문서 디렉토리 | 대상 가이드 |
|----------|--------------|------------|
| `diet_guidelines` | `rag/documents/diet/` | 식단·영양 임상진료지침 |
| `exercise_guidelines` | `rag/documents/exercise/` | 운동 임상진료지침 |
| `sleep_guidelines` | `rag/documents/sleep/` | 수면 임상진료지침 |

---

## 데이터 주의사항

- `data/raw/` 및 `data/ocr/`는 `.gitignore`에 등록되어 있으며 GitHub에 포함되지 않습니다.
- 복약 원천 데이터(식약처 7종, 약 330MB)는 팀 공유 드라이브에서 별도 수령합니다.
- `EMBED_MODEL`을 변경하면 ChromaDB를 해당 모델로 전체 재구축해야 합니다.
