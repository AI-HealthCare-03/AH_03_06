# Viva ML

**Viva**는 진료기록을 바탕으로 복약 안내와 생활습관(식단·운동·수면) 개선 가이드를 자동 생성하는 서비스입니다. 이 디렉터리(`ml/`)는 식단·운동·수면 가이드 생성 파이프라인에서 사용하는 데이터 처리, 모델 실험, RAG(검색 증강 생성) 구축 코드를 담습니다.

## 폴더 구조

| 경로 | 설명 |
|------|------|
| `data/raw/` | 원본 데이터(민감·대용량은 Git에 올리지 않음) |
| `data/processed/` | 전처리·피처 엔지니어링 결과 |
| `notebooks/diet|exercise|sleep/` | 도메인별 EDA·모델링 노트북 |
| `src/` | 재사용 가능한 파이썬 모듈(분류·점수·전처리 등) |
| `models/` | 학습된 모델 아티팩트 저장(로컬·Drive 동기화용) |
| `rag/documents/` | RAG용 PDF 등 원문 |
| `rag/embeddings/` | 벡터 DB 저장 경로(ChromaDB persist 등) |
| `rag/scripts/` | 문서 로드·청킹·임베딩·ChromaDB 적재 스크립트 |

## Google Colab에서 실행하기

1. **Google Drive 마운트**  
   노트북 첫 설정 셀에서 `drive.mount('/content/drive')`로 Drive를 연결합니다.

2. **레포지토리 가져오기**  
   Colab에서 GitHub 저장소를 클론합니다.
   ```python
   !git clone https://github.com/AI-HealthCare-03/AH_03_06.git
   ```
   이후 `AH_03_06/ml` 경로를 작업 루트로 사용하고, 필요 시 `requirements.txt`로 의존성을 설치합니다.
   ```python
   %pip install -r AH_03_06/ml/requirements.txt
   ```

3. **경로 설정**  
   Drive에 프로젝트를 두었다면 `cd`로 `ml` 폴더로 이동하거나, `sys.path.append`로 `src`를 추가해 모듈을 import합니다.

## 노트북 실행 순서

### 식단 (`notebooks/diet/`)

1. `01_eda.ipynb` — 데이터 탐색  
2. `02_clustering.ipynb` — 클러스터링  
3. `03_classification.ipynb` — 분류 모델  
4. `04_nutrient_standard.ipynb` — 영양소 기준·스케일링

### 운동 (`notebooks/exercise/`)

1. `01_eda.ipynb` — 데이터 탐색  
2. `02_cvd_score.ipynb` — CVD 위험 점수  
3. `03_intensity_classification.ipynb` — 운동 강도 분류  
4. `04_exercise_guide.ipynb` — 가이드 생성 연계

### 수면 (`notebooks/sleep/`)

1. `01_eda.ipynb` — 데이터 탐색  
2. `02_knhanes_analysis.ipynb` — KNHANES 등 공개 데이터 분석  
3. `03_classification_model.ipynb` — 수면 상태 분류  
4. `04_regression_weights.ipynb` — 회귀 가중치·효율 점수

각 노트북 상단에는 Drive 마운트, GitHub 클론, 해당 노트북 목적이 정리되어 있습니다.
