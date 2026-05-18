# AH_03_06 복약 영역 데이터 (식약처 공공데이터 7종)
 
## 파일 설명
| 파일명 | 주요 내용 |
| :-- | :-- |
| OpenData_ItemPermitC20260513.csv | 의약품 제품허가목록 (품목명, 업체명, 허가 일자 등 기본 목록) |
| OpenData_ItemPermitDetail20260513.xls | 의약품 제품허가 상세정보 (효능, 용법, 주의사항 등) |
| OpenData_EasyExcelListC20260513.csv | e약은요 정보 (일반인이 이해하기 쉬운 사용 설명) |
| OpenData_DayMaxDosgQyInfoC20260513.csv | 의약품 1일 최대 투여량 (성분별 하루 최대량) |
| OpenData_PotOpenRecallSaleStopC20260513.csv | 의약품 회수/판매 중지 정보 |
| OpenData_PotOpenDurIngr_AC20260513.csv | DUR 성분 현황 (성분 간 병용 금기 정보) |
| OpenData_PotOpenDurItem_AC20260513.csv | DUR 품목 현황 (안전 사용 서비스 대상 품목) |

## Colab에서 사용하기

1. 공유된 구글드라이브(`AH_03_06_medication_data`)를 우클릭 → "내 드라이브에 단축키 추가"
   또는 폴더 전체를 본인 MyDrive 루트에 복사
2. 노트북 첫 셀에서 자동으로 마운트되고 폴더 감지됨:
```python
   from google.colab import drive
   drive.mount('/content/drive')
   # → /content/drive/MyDrive/AH_03_06_medication_data 자동 인식
```

## 로컬(PyCharm 등)에서 사용하기
1. 이 폴더 전체 다운로드 (우클릭 → "다운로드")
2. 압축 풀고 7개 CSV를 다음 경로에 두기: 
   **`AH_03_06/ml/data/raw/medication/`**
 

##  주의사항
- **GitHub에 절대 업로드 금지** (총 약 330MB, DUR 품목 1개만 290MB)
- `ml/.gitignore`에 `data/raw/` 등록되어 있어 자동 제외됨 (커밋 67012fd)
- 데이터 수정·재가공한 경우, 본인 로컬에서만 보관 (공유 폴더에 덮어쓰지 마세요)

## 데이터 범위 : 식약처 11종 중 7종 선정 
## 원본 출처 : 식약처 공공데이터포털 (https://www.data.go.kr)
 