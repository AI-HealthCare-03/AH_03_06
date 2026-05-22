# app/services/ocr_service.py
# Clova OCR API 호출 및 처방전 필드 추출 비즈니스 로직

import os
import re
import uuid
import time
import json
import httpx
from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.schemas.ocr import PrescriptionOCRResponse, MedicationItem, InjectItem


CLOVA_SECRET_KEY = os.getenv("CLOVA_OCR_SECRET_KEY")
CLOVA_INVOKE_URL = os.getenv("CLOVA_OCR_INVOKE_URL")

KOREAN_SURNAMES = {
    "김", "이", "박", "최", "정", "강", "조", "윤", "장", "임",
    "한", "오", "서", "신", "권", "황", "안", "송", "류", "유",
    "홍", "전", "고", "문", "손", "양", "배", "백", "허", "남",
    "심", "노", "로", "하", "곽", "성", "차", "주", "우", "구",
    "민", "나", "진", "지", "엄", "채", "원", "천", "방", "공",
}

FORM_FIELD_NAMES = {
    "전화번호", "팩스번호", "주소", "명칭", "요양기관기호", "성명",
    "질병", "분류", "기호", "환자", "의사", "의료", "처방", "발급",
    "기관", "면허", "연월일", "성", "명", "의원", "날인", "서명",
    "투약량", "투여횟수", "투약일수", "용법", "용", "법", "주민등록번호",
    "의료인의", "요양", "기관기호",
}

FACILITY_NAME_KEYWORDS = ["의원", "병원", "의학", "클리닉"]
LICENSE_TYPE_KEYWORDS  = ["의사", "한의사", "치과의사"]

VALID_FACILITY_CODE = re.compile(r"^\d{8}$")
VALID_PERSON_NAME   = re.compile(r"^[가-힣]{2,4}$")
VALID_PATIENT_SSN   = re.compile(r"^\d{6}-\d{7}$")
VALID_DISEASE_CODE  = re.compile(r"^[A-Z]\d{2}")
VALID_LICENSE_NO    = re.compile(r"제\s*\d+\s*호|^\d+$")


def is_valid_person_name(text):
    """한국 성씨로 시작하는 2~4자 한글 이름 검증 + 양식 필드명 제외"""
    if not text or text in FORM_FIELD_NAMES:
        return False
    return bool(VALID_PERSON_NAME.match(text)) and text[0] in KOREAN_SURNAMES


def is_valid_facility_name(text):
    """한글 포함 + 의원/병원/의학/클리닉 키워드 검증 + 양식 필드명 제외"""
    if not text or text in FORM_FIELD_NAMES:
        return False
    return any(kw in text for kw in FACILITY_NAME_KEYWORDS)


async def call_clova_ocr(file: UploadFile) -> dict:
    """Clova OCR API 호출 → 결과 JSON 반환"""
    img_data = await file.read()

    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext == "jpg":
        ext = "jpeg"

    payload = {
        "images": [{"format": ext, "name": "prescription"}],
        "requestId": str(uuid.uuid4()),
        "version": "V2",
        "timestamp": int(time.time() * 1000),
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            CLOVA_INVOKE_URL,
            headers={"X-OCR-SECRET": CLOVA_SECRET_KEY},
            data={"message": json.dumps(payload)},
            files={"file": img_data},
        )

    if response.status_code != 200:
        raise Exception(f"Clova OCR API 오류: {response.status_code} {response.text}")

    return response.json()


def parse_clova_result(result: dict) -> list:
    """Clova OCR 결과 → 텍스트 리스트 변환"""
    texts = []
    for image in result.get("images", []):
        for field in image.get("fields", []):
            texts.append({
                "text":       field["inferText"],
                "confidence": field["inferConfidence"],
                "bbox":       field["boundingPoly"]["vertices"],
            })
    return texts


def extract_fields(texts: list) -> dict:
    """OCR 텍스트 리스트 → 처방전 14개 필드 딕셔너리 추출"""
    text_list = [t["text"] for t in texts]

    fields = {
        "facility_code": None,
        "facility_name": None,
        "issue_info":    None,
        "patient_name":  None,
        "patient_ssn":   None,
        "disease_code":  None,
        "doctor_name":   None,
        "license_type":  None,
        "license_no":    None,
        "medications":   [],
        "med_usage":     None,
        "inject_info":   [],
        "pharmacy_note": None,
        "valid_period":  None,
    }

    dose_pattern   = re.compile(r"^\d+(\.\d+)?(정|캡슐|앰플|mg|mL|g|포|개|병)$")
    freq_pattern   = re.compile(r"^\d+회$")
    days_pattern   = re.compile(r"^\d+일$")
    med_pattern    = re.compile(r"(mg|캡슐|정)\d*$", re.IGNORECASE)
    inject_pattern = re.compile(r"^[\w가-힣]+주사$")

    skip_set = {
        "처방명세", "주사제", "조제기관", "조제약사", "조제량", "조제연월일",
        "내", "외", "조제,", "□원", "처방", "조제", "시", "참고", "사항",
        "본인부담", "구분기호", ")",
    }

    def get_x(t):
        return int(t["bbox"][0]["x"])

    def get_y(t):
        return int(t["bbox"][0]["y"])

    def coord_right_of(keyword, y_tolerance=15):
        """keyword 기준 같은 y 범위 오른쪽 첫 번째 텍스트 반환"""
        anchor = next((t for t in texts if t["text"] == keyword), None)
        if not anchor:
            return None
        ax, ay = get_x(anchor), get_y(anchor)
        candidates = [
            t for t in texts
            if get_x(t) > ax and abs(get_y(t) - ay) <= y_tolerance
            and t["text"] != keyword
        ]
        if not candidates:
            return None
        return min(candidates, key=get_x)["text"]

    def coord_right_of_multi(keyword, y_tolerance=15):
        """keyword 기준 같은 y 범위 오른쪽 텍스트 전부 반환 (x순 정렬)"""
        anchor = next((t for t in texts if t["text"] == keyword), None)
        if not anchor:
            return []
        ax, ay = get_x(anchor), get_y(anchor)
        candidates = [
            t for t in texts
            if get_x(t) > ax and abs(get_y(t) - ay) <= y_tolerance
        ]
        return [t["text"] for t in sorted(candidates, key=get_x)]

    def resolve(text_val, coord_val, validator=None):
        """텍스트/좌표 기반 결과 비교 후 최종값 반환
        validator 통과한 값 우선, 둘 다 통과하면 좌표 기반 우선
        """
        t_ok = text_val  and (validator(text_val)  if validator else True)
        c_ok = coord_val and (validator(coord_val) if validator else True)
        if t_ok and c_ok:
            return coord_val if text_val != coord_val else text_val
        if c_ok:
            return coord_val
        if t_ok:
            return text_val
        return None

    def get_dose_freq_days(start_idx, window=20):
        """약품명 이후 토큰에서 dose/freq/days 추출 - 중간 노이즈 스킵"""
        dose = freq = days = None
        for j in range(start_idx, min(start_idx + window, len(text_list))):
            nxt = text_list[j]
            if any(kw in nxt for kw in skip_set):
                continue
            if dose is None and dose_pattern.match(nxt):
                dose = nxt
            elif freq is None and freq_pattern.match(nxt):
                freq = nxt
            elif days is None and days_pattern.match(nxt):
                days = nxt
            if dose and freq and days:
                break
        return dose, freq, days

    text_facility_code = None
    text_facility_name = None
    text_patient_name  = None
    text_patient_ssn   = None
    text_disease_code  = None
    text_doctor_name   = None
    text_license_type  = None
    text_license_no    = None

    for i, text in enumerate(text_list):

        if "요양기관기호" in text:
            match = re.search(r'\d{8}', text)
            if match:
                text_facility_code = match.group()
            elif i + 1 < len(text_list) and VALID_FACILITY_CODE.match(text_list[i + 1]):
                text_facility_code = text_list[i + 1]

        if re.search(r'\d{4}년', text) and fields["issue_info"] is None:
            parts = [text]
            for j in range(i + 1, min(i + 8, len(text_list))):
                nxt = text_list[j]
                if re.search(r'\d{1,2}월|\d{1,2}일', nxt):
                    parts.append(nxt)
                elif nxt in ("제", "호") or re.match(r'^\d+$', nxt):
                    parts.append(nxt)
                elif nxt == "-":
                    parts.append(nxt)
                else:
                    if re.search(r'\d{1,2}월|\d{1,2}일|제|\d+|호', nxt):
                        parts.append(nxt)
                    else:
                        break
            fields["issue_info"] = " ".join(parts)

        if is_valid_facility_name(text) and text_facility_name is None:
            text_facility_name = text

        if "주민등록번호" in text:
            for j in range(i - 1, max(i - 10, -1), -1):
                candidate = text_list[j]
                if is_valid_person_name(candidate):
                    text_patient_name = candidate
                    break
            if i + 1 < len(text_list) and VALID_PATIENT_SSN.match(text_list[i + 1]):
                text_patient_ssn = text_list[i + 1]

        if VALID_DISEASE_CODE.match(text):
            text_disease_code = text
        elif re.match(r"^\|", text):
            corrected = "I" + text[1:]
            if VALID_DISEASE_CODE.match(corrected):
                text_disease_code = corrected
        elif re.match(r"^\d{2}", text) and i > 0 and text_list[i - 1] in ("|", "I"):
            text_disease_code = ("I" if text_list[i - 1] == "|" else text_list[i - 1]) + text

        if text == "성명" and i + 1 < len(text_list):
            candidate = text_list[i + 1]
            if is_valid_person_name(candidate):
                text_doctor_name = candidate

        if text == "면허종류" and i + 1 < len(text_list):
            candidate = text_list[i + 1]
            if candidate in LICENSE_TYPE_KEYWORDS:
                text_license_type = candidate

        if text == "면허번호":
            parts = []
            for j in range(i + 3, min(i + 8, len(text_list))):
                nxt = text_list[j]
                if re.search(r'제|\d+|호', nxt):
                    parts.append(nxt)
                elif nxt in ("면허종류", "면허번호"):
                    break
                else:
                    if parts:
                        break
            if parts:
                text_license_no = " ".join(parts)

        if med_pattern.search(text) and re.match(r"^[가-힣]", text):
            if text not in [m["name"] for m in fields["medications"]]:
                dose, freq, days = get_dose_freq_days(i + 1)
                fields["medications"].append({"name": text, "dose": dose, "freq": freq, "days": days})

        if any(kw in text for kw in ["매식후", "매식전", "매식간", "취침전", "아침식후", "아침저녁", "아침공복"]):
            fields["med_usage"] = text

        if inject_pattern.match(text) and "주사제" not in text and "처방명세" not in text:
            dose, freq, days = get_dose_freq_days(i + 1)
            fields["inject_info"].append({"name": text, "dose": dose, "freq": freq, "days": days})

        if any(kw in text for kw in ["냉장보관", "빛을 피해"]):
            fields["pharmacy_note"] = text

        if "발급일부터" in text:
            parts = [text]
            for j in range(i + 1, min(i + 8, len(text_list))):
                nxt = text_list[j]
                if re.search(r'\d+|일간|\(|\)', nxt):
                    parts.append(nxt)
                else:
                    break
            fields["valid_period"] = " ".join(parts)

    # 좌표 기반 수집
    coord_facility_code = coord_right_of("요양기관기호")
    if coord_facility_code:
        match = re.search(r'\d{8}', coord_facility_code)
        coord_facility_code = match.group() if match else None

    coord_facility_name = next(
        (t["text"] for t in texts if is_valid_facility_name(t["text"])), None
    )

    coord_patient_ssn = coord_right_of("주민등록번호")
    if coord_patient_ssn and not VALID_PATIENT_SSN.match(coord_patient_ssn):
        coord_patient_ssn = None

    ssn_anchor = next((t for t in texts if "주민등록번호" in t["text"]), None)
    coord_patient_name = None
    if ssn_anchor:
        ay = get_y(ssn_anchor)
        ax = get_x(ssn_anchor)
        candidates = [
            t for t in texts
            if get_x(t) < ax and abs(get_y(t) - ay) <= 60
            and is_valid_person_name(t["text"])
        ]
        if candidates:
            coord_patient_name = max(candidates, key=get_x)["text"]

    disease_anchor = next((t for t in texts if t["text"] == "기호"), None)
    coord_disease_code = None
    if disease_anchor:
        ax, ay = get_x(disease_anchor), get_y(disease_anchor)
        candidates = [
            t for t in texts
            if get_x(t) > ax and abs(get_y(t) - ay) <= 40
        ]
        for c in sorted(candidates, key=get_x):
            val = c["text"]
            if VALID_DISEASE_CODE.match(val):
                coord_disease_code = val
                break
            elif re.match(r"^\|", val):
                corrected = "I" + val[1:]
                if VALID_DISEASE_CODE.match(corrected):
                    coord_disease_code = corrected
                    break

    coord_license_type = coord_right_of("면허종류")
    if coord_license_type and coord_license_type not in LICENSE_TYPE_KEYWORDS:
        coord_license_type = None

    coord_license_no_parts = coord_right_of_multi("면허번호")
    coord_license_no = " ".join(coord_license_no_parts) if coord_license_no_parts else None
    if coord_license_no and not VALID_LICENSE_NO.search(coord_license_no):
        coord_license_no = None

    # 최종값 결정
    fields["facility_code"] = resolve(text_facility_code, coord_facility_code, VALID_FACILITY_CODE.match)
    fields["facility_name"] = resolve(text_facility_name, coord_facility_name, is_valid_facility_name)
    fields["patient_name"]  = resolve(text_patient_name,  coord_patient_name,  is_valid_person_name)
    fields["patient_ssn"]   = resolve(text_patient_ssn,   coord_patient_ssn,   VALID_PATIENT_SSN.match)
    fields["disease_code"]  = resolve(text_disease_code,  coord_disease_code,  VALID_DISEASE_CODE.match)
    fields["doctor_name"]   = resolve(text_doctor_name,   None,                is_valid_person_name)
    fields["license_type"]  = resolve(text_license_type,  coord_license_type)
    fields["license_no"]    = resolve(text_license_no,    coord_license_no)

    return fields


def format_fields(fields: dict) -> dict:
    """추출된 필드를 응답 형식에 맞게 가공"""
    from datetime import date

    result = dict(fields)

    # issue_info → issue_date / issue_no 분리
    issue_info = fields.get("issue_info")
    if issue_info:
        date_match = re.search(r'(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일', issue_info)
        no_match   = re.search(r'제\s*(\d+)\s*호', issue_info)
        if date_match:
            year, month, day = int(date_match.group(1)), int(date_match.group(2)), int(date_match.group(3))
            result["issue_date"] = date(year, month, day)
        else:
            result["issue_date"] = None
        result["issue_no"] = no_match.group(1) if no_match else None
    else:
        result["issue_date"] = None
        result["issue_no"]   = None
    del result["issue_info"]

    # license_no → 숫자만 추출
    license_no = fields.get("license_no")
    if license_no:
        no_match = re.search(r'\d+', license_no)
        result["license_no"] = no_match.group() if no_match else None

    # valid_period → 숫자만 추출 후 int 변환
    valid_period = fields.get("valid_period")
    if valid_period:
        no_match = re.search(r'\d+', valid_period)
        result["valid_days"] = int(no_match.group()) if no_match else None
    else:
        result["valid_days"] = None
    del result["valid_period"]

    return result


async def extract_prescription(file: UploadFile, db: Session) -> PrescriptionOCRResponse:
    """처방전 이미지 → Clova OCR 호출 → 필드 추출 → 응답 반환"""
    result = await call_clova_ocr(file)
    texts = parse_clova_result(result)
    fields = extract_fields(texts)
    formatted = format_fields(fields)

    formatted["medications"] = [MedicationItem(**m) for m in formatted["medications"]]
    formatted["inject_info"] = [InjectItem(**m) for m in formatted["inject_info"]]

    return PrescriptionOCRResponse(**formatted)