// pages/medical-record/MedicalRecordForm.jsx
// 진료기록 등록 (POST) + 수정 (PUT) 겸용 폼
// - record_id 없으면 등록 모드, 있으면 수정 모드
// - 처방약 동적 추가/삭제
// - 메모 필드 (200자 제한)

import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  createMedicalRecord,
  getMedicalRecord,
  updateMedicalRecord,
} from '../../api/medicalrecord'
import Header from '../../components/Header'

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

// ── 처방약 초기값 팩토리 ───────────────────────────────────────
function emptyPrescription() {
  return { id: null, drug_name: '', dosage: '', frequency: '', duration_days: '' }
}

// ── 인풋 공통 스타일 ──────────────────────────────────────────
const inputCls =
  'w-full h-12 bg-neutral-50 border border-neutral-200 rounded-xl px-4 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-blue-500 focus:bg-white transition-colors'

// ── 섹션 헤더 ─────────────────────────────────────────────────
function SectionLabel({ children }) {
  return <p className="text-sm font-semibold text-neutral-700 mb-3">{children}</p>
}

// ── 처방약 카드 ───────────────────────────────────────────────
function PrescriptionCard({ index, data, onChange, onRemove }) {
  function update(field, value) {
    onChange(index, { ...data, [field]: value })
  }

  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-4 relative">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-neutral-700">약 {index + 1}</span>
        <button
          onClick={() => onRemove(index)}
          className="text-neutral-400 hover:text-red-400 transition-colors"
          aria-label="처방약 삭제"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 약 이름 */}
      <div className="mb-2">
        <input
          type="text"
          value={data.drug_name}
          onChange={e => update('drug_name', e.target.value)}
          placeholder="약 이름"
          className={inputCls}
        />
      </div>

      {/* 용량 */}
      <div className="flex-1 flex items-center justify-center gap-0.3 h-11 bg-neutral-50 border border-neutral-200 rounded-xl px-3">
        <input
          type="number"
          placeholder="1"
          value={data.dosage ?? ''}
          onChange={e => update('dosage', e.target.value)}
          className="w-8 bg-transparent text-sm text-center text-neutral-900 placeholder:text-neutral-400 outline-none"
        />
        <span className="text-sm text-neutral-400 shrink-0">정</span>
      </div>

      {/* 횟수 */}
      <div className="flex-1 flex items-center justify-center gap-0.3 h-11 bg-neutral-50 border border-neutral-200 rounded-xl px-3">
        <input
          type="number"
          placeholder="3"
          value={data.frequency ?? ''}
          onChange={e => update('frequency', e.target.value)}
          className="w-8 bg-transparent text-sm text-center text-neutral-900 placeholder:text-neutral-400 outline-none"
        />
        <span className="text-sm text-neutral-400 shrink-0">회 / 일</span>
      </div>

      {/* 기간 */}
      <div className="flex-1 flex items-center justify-center gap-0.3 h-11 bg-neutral-50 border border-neutral-200 rounded-xl px-3">
        <input
          type="number"
          placeholder="3"
          value={data.duration_days ?? ''}
          onChange={e => update('duration_days', e.target.value)}
          className="w-8 bg-transparent text-sm text-center text-neutral-900 placeholder:text-neutral-400 outline-none"
        />
        <span className="text-sm text-neutral-400 shrink-0">일분</span>
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export default function MedicalRecordForm() {
  const navigate = useNavigate()
  const { id: recordId } = useParams()
  const { state } = useLocation()
  const isEdit = !!recordId
  const prefill = state?.prefill

  const [form, setForm] = useState({
    visit_date:     prefill?.visit_date     ?? '',
    hospital_name:  prefill?.hospital_name  ?? '',
    department_id:  '',
    diagnosis_name: prefill?.diagnosis_name ?? '',
    memo:           '',
  })

  const [prescriptions, setPrescriptions] = useState(
    prefill?.drugs?.map(d => ({
      id:            null,
      drug_name:     d.drug_name     ?? '',
      dosage:        d.dosage        ?? '',
      frequency:     d.frequency     ?? '',
      duration_days: d.duration_days ?? '',
    })) ?? []
  )

  const [loading, setLoading]     = useState(isEdit) // 수정 모드면 초기 로딩
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors]       = useState({})

  // ── 수정 모드: 기존 데이터 로드 ──────────────────────────
  useEffect(() => {
    if (!isEdit) return
    ;(async () => {
      try {
        const data = await getMedicalRecord(recordId)
        setForm({
          visit_date:     data.visit_date ?? '',
          hospital_name:  data.hospital_name ?? '',
          department_id:  data.department_id ? String(data.department_id) : '',
          diagnosis_name: data.diagnosis_name ?? '',
          memo:           data.memo ?? '',
        })
        setPrescriptions(
          (data.prescriptions ?? []).map(p => ({
            id:           p.id,
            drug_name:    p.drug_name,
            dosage:       p.dosage ?? '',
            frequency:    p.frequency ?? '',
            duration_days: p.duration_days != null ? String(p.duration_days) : '',
          }))
        )
      } catch (e) {
        alert('진료기록을 불러오지 못했어요.')
        navigate(-1)
      } finally {
        setLoading(false)
      }
    })()
  }, [isEdit, recordId])

  // ── 입력 핸들러 ───────────────────────────────────────────
  function handleField(field, value) {
    setForm(p => ({ ...p, [field]: value }))
    if (errors[field]) setErrors(p => ({ ...p, [field]: '' }))
  }

  function handlePrescriptionChange(index, updated) {
    setPrescriptions(prev => prev.map((p, i) => (i === index ? updated : p)))
  }

  function addPrescription() {
    setPrescriptions(prev => [...prev, emptyPrescription()])
  }

  function removePrescription(index) {
    setPrescriptions(prev => prev.filter((_, i) => i !== index))
  }

  // ── 유효성 검사 ───────────────────────────────────────────
  function validate() {
    const e = {}
    if (!form.visit_date)     e.visit_date = '진료일을 입력해 주세요'
    if (!form.diagnosis_name.trim()) e.diagnosis_name = '진단명을 입력해 주세요'
    // 처방약 약 이름 검사
    prescriptions.forEach((p, i) => {
      if (!p.drug_name.trim()) e[`drug_name_${i}`] = '약 이름을 입력해 주세요'
    })
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── 제출 ──────────────────────────────────────────────────
  async function handleSubmit() {
    if (!validate()) return
    setSubmitting(true)
    try {
      const payload = {
        visit_date:     form.visit_date,
        diagnosis_name: form.diagnosis_name.trim(),
        hospital_name:  form.hospital_name.trim() || null,
        department_id:  form.department_id ? Number(form.department_id) : null,
        prescriptions:  prescriptions
          .filter(p => p.drug_name.trim())
          .map(p => ({
            ...(p.id ? { id: p.id } : {}), // 수정 시 id 포함
        drug_name:    p.drug_name.trim(),
        dosage:        (p.dosage ?? '').trim() || null,
        frequency:     (p.frequency ?? '').trim() || null,
        duration_days: p.duration_days ? Number(p.duration_days) : null,
          })),
      }

      if (isEdit) {
        await updateMedicalRecord(recordId, payload)
      } else {
        await createMedicalRecord(payload)
      }
      navigate('/medical-records', { replace: true })
    } catch (e) {
      alert(e.message ?? '저장에 실패했어요. 다시 시도해 주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── 로딩 ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mobile-container flex flex-col min-h-dvh bg-white font-['Pretendard',sans-serif] items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  const memoLen = form.memo.length

  return (
    <div className="mobile-container flex flex-col min-h-dvh bg-white font-['Pretendard',sans-serif]">

      {/* 앱바 */}
      <Header variant="back" title={isEdit ? '진료기록 수정' : '진료기록 입력'} showDivider={true} />

      {/* 스크롤 영역 */}
      <main className="flex-1 px-5 py-6 flex flex-col gap-7 pb-32">

        {/* 처방전으로 자동 입력 버튼 */}
        <button
          onClick={() => navigate('/medical-records/ocr')}
          className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border border-blue-200 bg-blue-50 text-blue-600 text-sm font-semibold mb-6 active:bg-blue-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          처방전으로 자동 입력
        </button>


        {/* ── 진료 정보 ─────────────────────────────────── */}
        <section>
          <SectionLabel>진료 정보</SectionLabel>
          <div className="flex flex-col gap-3">

            {/* 진료일 */}
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 flex items-center gap-1">
                진료일자 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.visit_date}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => handleField('visit_date', e.target.value)}
                className={`${inputCls} ${errors.visit_date ? 'border-red-400' : ''}`}
              />
              {errors.visit_date && (
                <p className="text-xs text-red-500 mt-1">{errors.visit_date}</p>
              )}
            </div>

            {/* 병원명 */}
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">
                병원명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.hospital_name}
                onChange={e => handleField('hospital_name', e.target.value)}
                placeholder="예: 서울내과의원"
                className={inputCls}
              />
            </div>

            {/* 진료과 */}
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 block">
                진료과 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={form.department_id}
                  onChange={e => handleField('department_id', e.target.value)}
                  className={`${inputCls} appearance-none pr-10`}
                >
                  <option value="">선택 안 함</option>
                  {DEPARTMENTS.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* 진단명 */}
            <div>
              <label className="text-xs font-medium text-neutral-500 mb-1.5 flex items-center gap-1">
                진단명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.diagnosis_name}
                onChange={e => handleField('diagnosis_name', e.target.value)}
                placeholder="예: 감기 · 몸살"
                className={`${inputCls} ${errors.diagnosis_name ? 'border-red-400' : ''}`}
              />
              {errors.diagnosis_name && (
                <p className="text-xs text-red-500 mt-1">{errors.diagnosis_name}</p>
              )}
            </div>
          </div>
        </section>

        {/* ── 처방약 ────────────────────────────────────── */}
        <section>
          <SectionLabel>처방약 <span className="text-neutral-400 font-normal">(선택)</span></SectionLabel>
          <div className="flex flex-col gap-3">
            {prescriptions.map((p, i) => (
              <div key={i}>
                <PrescriptionCard
                  index={i}
                  data={p}
                  onChange={handlePrescriptionChange}
                  onRemove={removePrescription}
                />
                {errors[`drug_name_${i}`] && (
                  <p className="text-xs text-red-500 mt-1 px-1">{errors[`drug_name_${i}`]}</p>
                )}
              </div>
            ))}

            {/* 약 추가 버튼 */}
            <button
              onClick={addPrescription}
              className="w-full h-12 rounded-xl border-2 border-dashed border-neutral-200 text-sm font-semibold text-neutral-400 hover:border-blue-300 hover:text-blue-500 transition-colors flex items-center justify-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              약 추가
            </button>
          </div>
        </section>

        {/* ── 메모 ──────────────────────────────────────── */}
        <section>
          <SectionLabel>메모 <span className="text-neutral-400 font-normal">(선택)</span></SectionLabel>
          <div className="relative">
            <textarea
              value={form.memo}
              onChange={e => {
                if (e.target.value.length <= 200) handleField('memo', e.target.value)
              }}
              placeholder="추가 사항이 있다면 메모로 남겨주세요"
              rows={4}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-blue-500 focus:bg-white transition-colors resize-none"
            />
            <span className="absolute bottom-3 right-4 text-xs text-neutral-400">
              {memoLen} / 200
            </span>
          </div>
        </section>
      </main>

      {/* 하단 저장 버튼 */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[375px] px-5 pb-8 pt-4 bg-white border-t border-neutral-50">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full h-14 rounded-2xl bg-blue-600 text-white font-bold text-base shadow-[0_8px_20px_rgba(37,99,235,0.3)] disabled:opacity-50 disabled:pointer-events-none transition-opacity flex items-center justify-center gap-2"
        >
          {submitting && (
            <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
          )}
          {submitting ? '저장 중...' : '저장하기'}
        </button>
      </div>
    </div>
  )
}
