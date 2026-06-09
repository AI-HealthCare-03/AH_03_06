import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import FormLayout from '../../components/FormLayout.jsx'

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

function getConfidenceStyle(value) {
  if (value === null || value === undefined || value === '') {
    return 'border-red-400 bg-red-50 focus:border-red-500'
  }
  return 'border-neutral-200 bg-neutral-50 focus:border-blue-500 focus:bg-white'
}

function LowConfidenceWarning() {
  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <svg className="w-3.5 h-3.5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
      <span className="text-xs text-red-500">인식하지 못했어요. 직접 입력해 주세요.</span>
    </div>
  )
}

function extractNumber(str) {
  if (!str) return ''
  const match = str.match(/[\d.]+/)
  return match ? match[0] : ''
}

export default function PrescriptionOCRResult() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const ocrData = state?.ocrData
  const previewUrl = state?.previewUrl

  const [form, setForm] = useState({
    visit_date:     ocrData?.issue_date ?? '',
    hospital_name:  ocrData?.facility_name ?? '',
    department:     '',
    diagnosis_name: ocrData?.disease_code ?? '',
    drugs: (ocrData?.medications ?? []).map(m => ({
      drug_name:     m.name ?? '',
      dosage:        extractNumber(m.dose),
      frequency:     extractNumber(m.freq),
      duration_days: extractNumber(m.days),
    })),
  })

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

  function handleSave() {
    navigate('/medical-records/new', { state: { prefill: form } })
  }

  if (!ocrData) {
    navigate('/medical-records/ocr', { replace: true })
    return null
  }

  return (
    <FormLayout
      title="사진으로 진료기록 추가"
      onNext={handleSave}
      nextLabel="저장하기"
    >
      <div className="flex flex-col gap-4">
        {previewUrl && (
          <div className="relative w-full h-40 rounded-2xl overflow-hidden bg-neutral-100">
            <img src={previewUrl} alt="처방전" className="absolute inset-0 w-full h-full object-cover" />
            <button
              onClick={() => navigate('/medical-records/ocr', { replace: true })}
              className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 text-white text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm min-h-11"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              다시 촬영
            </button>
          </div>
        )}

        <div className="flex items-start gap-3 bg-blue-50 rounded-2xl px-4 py-3.5">
          <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-blue-700 leading-relaxed">
            자동 인식된 정보를 확인하고 필요하면 수정해 주세요.
            빨간 테두리 항목은 꼭 확인해 주세요.
          </p>
        </div>

        <p className="text-sm font-bold text-neutral-900">인식 결과</p>

        <div>
          <label className="text-xs font-semibold text-neutral-500 mb-1.5 block">진료일자</label>
          <input
            type="date"
            value={form.visit_date}
            onChange={e => updateField('visit_date', e.target.value)}
            className={`w-full h-12 border rounded-xl px-4 text-sm text-neutral-900 outline-none transition-colors ${getConfidenceStyle(form.visit_date)}`}
          />
          {!form.visit_date && <LowConfidenceWarning />}
        </div>

        <div>
          <label className="text-xs font-semibold text-neutral-500 mb-1.5 block">병원명</label>
          <input
            type="text"
            value={form.hospital_name}
            onChange={e => updateField('hospital_name', e.target.value)}
            placeholder="예: 서울내과의원"
            className={`w-full h-12 border rounded-xl px-4 text-sm text-neutral-900 outline-none transition-colors ${getConfidenceStyle(form.hospital_name)}`}
          />
          {!form.hospital_name && <LowConfidenceWarning />}
        </div>

        <div>
          <label className="text-xs font-semibold text-neutral-500 mb-1.5 block">진료과</label>
          <div className="relative">
            <select
              value={form.department}
              onChange={e => updateField('department', e.target.value)}
              className="w-full h-12 border border-neutral-200 bg-neutral-50 rounded-xl px-4 text-sm text-neutral-900 outline-none transition-colors appearance-none focus:border-blue-500 focus:bg-white"
            >
              <option value="">선택 안 함</option>
              {DEPARTMENTS.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-neutral-500 mb-1.5 block">진단명</label>
          <input
            type="text"
            value={form.diagnosis_name}
            onChange={e => updateField('diagnosis_name', e.target.value)}
            placeholder="예: 감기·몸살"
            className={`w-full h-12 border rounded-xl px-4 text-sm text-neutral-900 outline-none transition-colors ${getConfidenceStyle(form.diagnosis_name)}`}
          />
          {!form.diagnosis_name && <LowConfidenceWarning />}
        </div>

        {form.drugs.length > 0 && (
          <div>
            <p className="text-sm font-bold text-neutral-900 mb-3">처방약</p>
            {form.drugs.map((drug, i) => (
              <div key={i} className="bg-neutral-50 rounded-2xl px-4 pt-4 pb-3 mb-3">
                <p className="text-xs font-semibold text-neutral-500 mb-3">약 {i + 1}</p>

                <div className="mb-3">
                  <label className="text-xs text-neutral-400 mb-1 block">약 이름</label>
                  <input
                    type="text"
                    value={drug.drug_name}
                    onChange={e => updateDrug(i, 'drug_name', e.target.value)}
                    className={`w-full h-11 border rounded-xl px-3 text-sm text-neutral-900 outline-none transition-colors ${getConfidenceStyle(drug.drug_name)}`}
                  />
                  {!drug.drug_name && <LowConfidenceWarning />}
                </div>

                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">복용 정보</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        value={drug.dosage}
                        onChange={e => updateDrug(i, 'dosage', e.target.value)}
                        placeholder="1"
                        className={`w-full h-11 border rounded-xl px-3 pr-7 text-sm text-neutral-900 outline-none transition-colors text-right ${drug.dosage ? 'bg-white border-neutral-200' : 'bg-red-50 border-red-400'}`}
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400">정</span>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        value={drug.frequency}
                        onChange={e => updateDrug(i, 'frequency', e.target.value)}
                        placeholder="3"
                        className={`w-full h-11 border rounded-xl px-3 pr-10 text-sm text-neutral-900 outline-none transition-colors text-right ${drug.frequency ? 'bg-white border-neutral-200' : 'bg-red-50 border-red-400'}`}
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400">회/일</span>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        value={drug.duration_days}
                        onChange={e => updateDrug(i, 'duration_days', e.target.value)}
                        placeholder="3"
                        className={`w-full h-11 border rounded-xl px-3 pr-10 text-sm text-neutral-900 outline-none transition-colors text-right ${drug.duration_days ? 'bg-white border-neutral-200' : 'bg-red-50 border-red-400'}`}
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400">일분</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-neutral-400 text-center leading-relaxed">
          자동 인식 결과는 100% 정확하지 않을 수 있어요.<br />
          저장 전에 모든 항목을 한 번 확인해 주세요.
        </p>
      </div>
    </FormLayout>
  )
}