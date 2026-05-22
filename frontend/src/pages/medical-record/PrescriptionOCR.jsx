// pages/medical-record/PrescriptionOCR.jsx
// 처방전 사진으로 진료기록 자동 입력 페이지
// - 카메라/갤러리로 처방전 촬영 및 업로드
// - OCR 인식 결과 표시 (낮은 신뢰도 항목 강조)
// - 저장하기 버튼으로 MedicalRecordForm에 데이터 전달
// ※ OCR API는 팀원이 연동 예정 — 현재는 mock 함수로 처리

import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

// ── Mock OCR API (팀원이 실제 API로 교체) ─────────────────────
async function callOcrApi(imageFile) {
  // TODO: 실제 OCR API 호출로 교체
  // 예시: Clova OCR, Google Vision API 등
  await new Promise(r => setTimeout(r, 2000)) // 로딩 시뮬레이션

  return {
    visit_date: '2026-05-02',
    hospital_name: '서울내과의원',
    department: '내과',
    diagnosis_name: '감기·몸살',
    drugs: [
      {
        drug_name: '타이레놀정 500mg',
        dosage: '1',
        frequency: '3',
        duration_days: '3',
        confidence: 'high',
      },
    ],
    confidences: {
      visit_date: 'high',
      hospital_name: 'high',
      department: 'medium',
      diagnosis_name: 'low', // 낮은 신뢰도 → 강조 표시
    },
  }
}

// ── 진료과 목록 ────────────────────────────────────────────────
const DEPARTMENTS = [
  { id: 1,  name: '내과' },
  { id: 2,  name: '외과' },
  { id: 3,  name: '정형외과' },
  { id: 4,  name: '치과' },
  { id: 5,  name: '안과' },
  { id: 6,  name: '이비인후과' },
  { id: 7,  name: '피부과' },
  { id: 8,  name: '산부인과' },
  { id: 9,  name: '소아청소년과' },
  { id: 10, name: '신경과' },
  { id: 11, name: '정신건강의학과' },
  { id: 12, name: '비뇨기과' },
]

// ── 신뢰도별 스타일 ────────────────────────────────────────────
function getConfidenceStyle(level) {
  if (level === 'low') return 'border-red-400 bg-red-50 focus:border-red-500'
  return 'border-neutral-200 bg-neutral-50 focus:border-blue-500 focus:bg-white'
}

// ── 낮은 신뢰도 경고 메시지 ───────────────────────────────────
function LowConfidenceWarning() {
  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <svg className="w-3.5 h-3.5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
      <span className="text-xs text-red-500">인식이 불확실해요. 꼭 확인해 주세요.</span>
    </div>
  )
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────
export default function PrescriptionOCR() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [step, setStep] = useState('upload') // upload | processing | result
  const [previewUrl, setPreviewUrl] = useState(null)
  const [ocrResult, setOcrResult] = useState(null)
  const [form, setForm] = useState(null)
  const [error, setError] = useState(null)

  // ── 이미지 선택 처리 ────────────────────────────────────────
  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setPreviewUrl(URL.createObjectURL(file))
    setStep('processing')
    setError(null)

    try {
      const result = await callOcrApi(file)
      setOcrResult(result)
      setForm({
        visit_date: result.visit_date ?? '',
        hospital_name: result.hospital_name ?? '',
        department: result.department ?? '',
        diagnosis_name: result.diagnosis_name ?? '',
        drugs: result.drugs ?? [],
      })
      setStep('result')
    } catch (e) {
      setError('처방전을 인식하지 못했어요. 다시 시도해 주세요.')
      setStep('upload')
    }
  }

  // ── 폼 필드 업데이트 ────────────────────────────────────────
  function updateField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function updateDrug(index, key, value) {
    setForm(prev => {
      const drugs = [...prev.drugs]
      drugs[index] = { ...drugs[index], [key]: value }
      return { ...prev, drugs }
    })
  }

  // ── 저장 → MedicalRecordForm으로 데이터 전달 ────────────────
  function handleSave() {
    // TODO: 팀원과 데이터 전달 방식 협의
    // 예시 1) navigate + state: navigate('/medical-records/new', { state: { prefill: form } })
    // 예시 2) 전역 상태(Zustand/Context)에 저장 후 폼에서 읽기
    navigate('/medical-records/new', { state: { prefill: form } })
  }

  // ── 다시 촬영 ───────────────────────────────────────────────
  function handleRetake() {
    setStep('upload')
    setPreviewUrl(null)
    setOcrResult(null)
    setForm(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="flex flex-col min-h-dvh bg-white font-['Pretendard',sans-serif]">

      {/* 앱바 */}
      <header className="px-5 pt-6 pb-4 flex items-center gap-3 shrink-0 border-b border-neutral-100">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors"
          aria-label="뒤로가기"
        >
          <svg className="w-5 h-5 text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-base font-bold text-neutral-900">사진으로 진료기록 추가</h1>
      </header>

      {/* hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ── STEP 1: 업로드 ── */}
      {step === 'upload' && (
        <main className="flex-1 flex flex-col px-5 pt-6 pb-10">

          {/* 안내 배너 */}
          <div className="flex items-start gap-3 bg-blue-50 rounded-2xl px-4 py-3.5 mb-6">
            <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-blue-700 leading-relaxed">
              처방전 사진을 찍으면 진료 정보를 자동으로 입력해 드려요.
              인식 결과를 확인하고 필요한 항목만 수정해 주세요.
            </p>
          </div>

          {/* 촬영/업로드 영역 */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-neutral-200 rounded-3xl bg-neutral-50 min-h-[280px] active:bg-neutral-100 transition-colors"
          >
            <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-neutral-700">처방전 촬영 또는 업로드</p>
              <p className="text-xs text-neutral-400 mt-1">탭하여 카메라를 열거나 갤러리에서 선택</p>
            </div>
          </button>

          {error && (
            <p className="text-xs text-red-500 text-center mt-4">{error}</p>
          )}
        </main>
      )}

      {/* ── STEP 2: 인식 중 ── */}
      {step === 'processing' && (
        <main className="flex-1 flex flex-col items-center justify-center gap-6 px-5 pb-10">
          {previewUrl && (
            <div className="w-full max-h-56 rounded-2xl overflow-hidden bg-neutral-100">
              <img src={previewUrl} alt="처방전 미리보기" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm font-semibold text-neutral-700">처방전 인식 중...</p>
            <p className="text-xs text-neutral-400">잠시만 기다려 주세요</p>
          </div>
        </main>
      )}

      {/* ── STEP 3: 인식 결과 ── */}
      {step === 'result' && form && ocrResult && (
        <>
          <main className="flex-1 overflow-y-auto px-5 pt-5 pb-32">

            {/* 미리보기 + 다시 촬영 */}
            {previewUrl && (
              <div className="relative w-full h-40 rounded-2xl overflow-hidden bg-neutral-100 mb-5">
                <img src={previewUrl} alt="처방전" className="w-full h-full object-cover" />
                <button
                  onClick={handleRetake}
                  className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 text-white text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  다시 촬영
                </button>
              </div>
            )}

            {/* 안내 배너 */}
            <div className="flex items-start gap-3 bg-blue-50 rounded-2xl px-4 py-3.5 mb-5">
              <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-blue-700 leading-relaxed">
                자동 인식된 정보를 확인하고 필요하면 수정해 주세요.
                빨간 테두리 항목은 꼭 확인해 주세요.
              </p>
            </div>

            <p className="text-sm font-bold text-neutral-900 mb-4">인식 결과</p>

            {/* 진료일자 */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-neutral-500 mb-1.5 block">진료일자</label>
              <input
                type="date"
                value={form.visit_date}
                onChange={e => updateField('visit_date', e.target.value)}
                className={`w-full h-12 border rounded-xl px-4 text-sm text-neutral-900 outline-none transition-colors ${getConfidenceStyle(ocrResult.confidences.visit_date)}`}
              />
              {ocrResult.confidences.visit_date === 'low' && <LowConfidenceWarning />}
            </div>

            {/* 병원명 */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-neutral-500 mb-1.5 block">병원명</label>
              <input
                type="text"
                value={form.hospital_name}
                onChange={e => updateField('hospital_name', e.target.value)}
                placeholder="예: 서울내과의원"
                className={`w-full h-12 border rounded-xl px-4 text-sm text-neutral-900 outline-none transition-colors ${getConfidenceStyle(ocrResult.confidences.hospital_name)}`}
              />
              {ocrResult.confidences.hospital_name === 'low' && <LowConfidenceWarning />}
            </div>

            {/* 진료과 */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-neutral-500 mb-1.5 block">진료과</label>
              <select
                value={form.department}
                onChange={e => updateField('department', e.target.value)}
                className={`w-full h-12 border rounded-xl px-4 text-sm text-neutral-900 outline-none transition-colors appearance-none ${getConfidenceStyle(ocrResult.confidences.department)}`}
              >
                <option value="">선택 안 함</option>
                {DEPARTMENTS.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
              {ocrResult.confidences.department === 'low' && <LowConfidenceWarning />}
            </div>

            {/* 진단명 */}
            <div className="mb-6">
              <label className="text-xs font-semibold text-neutral-500 mb-1.5 block">진단명</label>
              <input
                type="text"
                value={form.diagnosis_name}
                onChange={e => updateField('diagnosis_name', e.target.value)}
                placeholder="예: 감기·몸살"
                className={`w-full h-12 border rounded-xl px-4 text-sm text-neutral-900 outline-none transition-colors ${getConfidenceStyle(ocrResult.confidences.diagnosis_name)}`}
              />
              {ocrResult.confidences.diagnosis_name === 'low' && <LowConfidenceWarning />}
            </div>

            {/* 처방약 */}
            {form.drugs.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-bold text-neutral-900 mb-3">처방약</p>
                {form.drugs.map((drug, i) => (
                  <div key={i} className="bg-neutral-50 rounded-2xl px-4 pt-4 pb-3 mb-3">
                    <p className="text-xs font-semibold text-neutral-500 mb-3">약 {i + 1}</p>

                    {/* 약 이름 */}
                    <div className="mb-3">
                      <label className="text-xs text-neutral-400 mb-1 block">약 이름</label>
                      <input
                        type="text"
                        value={drug.drug_name}
                        onChange={e => updateDrug(i, 'drug_name', e.target.value)}
                        className={`w-full h-11 border rounded-xl px-3 text-sm text-neutral-900 outline-none transition-colors ${getConfidenceStyle(drug.confidence)}`}
                      />
                      {drug.confidence === 'low' && <LowConfidenceWarning />}
                    </div>

                    {/* 복용 정보 3칸 */}
                    <div>
                      <label className="text-xs text-neutral-400 mb-1 block">복용 정보</label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 relative">
                          <input
                            type="number"
                            value={drug.dosage}
                            onChange={e => updateDrug(i, 'dosage', e.target.value)}
                            placeholder="1"
                            className="w-full h-11 bg-white border border-neutral-200 rounded-xl px-3 pr-7 text-sm text-neutral-900 outline-none focus:border-blue-500 text-right"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400">정</span>
                        </div>
                        <div className="flex-1 relative">
                          <input
                            type="number"
                            value={drug.frequency}
                            onChange={e => updateDrug(i, 'frequency', e.target.value)}
                            placeholder="3"
                            className="w-full h-11 bg-white border border-neutral-200 rounded-xl px-3 pr-10 text-sm text-neutral-900 outline-none focus:border-blue-500 text-right"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400">회/일</span>
                        </div>
                        <div className="flex-1 relative">
                          <input
                            type="number"
                            value={drug.duration_days}
                            onChange={e => updateDrug(i, 'duration_days', e.target.value)}

                            placeholder="3"
                            className="w-full h-11 bg-white border border-neutral-200 rounded-xl px-3 pr-10 text-sm text-neutral-900 outline-none focus:border-blue-500 text-right"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400">일분</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 하단 주의 문구 */}
            <p className="text-xs text-neutral-400 text-center leading-relaxed">
              자동 인식 결과는 100% 정확하지 않을 수 있어요.<br />
              저장 전에 모든 항목을 한 번 확인해 주세요.
            </p>
          </main>

          {/* 저장 버튼 */}
          <div className="fixed bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-white border-t border-neutral-100">
            <button
              onClick={handleSave}
              className="w-full h-14 rounded-2xl bg-blue-600 text-white font-bold text-base shadow-[0_4px_16px_rgba(37,99,235,0.35)] active:scale-[0.98] transition-transform duration-150"
            >
              저장하기
            </button>
          </div>
        </>
      )}
    </div>
  )
}
