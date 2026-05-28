// pages/medication/MedicationFormPage.jsx
// 약 등록(mode="create") / 약 수정(mode="edit") 통합 폼
//
// 진입 방법:
//   등록: navigate('/medication/form')
//   수정: navigate('/medication/form', { state: { mode: 'edit', medicationId: 123 } })

import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  addMedication,
  deleteMedication,
  getMedicationById,
  getSchedules,
  updateSchedule,
  createSchedule,
} from '../../api/medication.js'

// ── 상수 ──────────────────────────────────────────────────────

const DOSAGE_UNITS = ['정', '캡슐', '포', 'ml', '개']

const PURPOSES = ['선택 안 함', '고혈압', '당뇨', '고지혈증', '감기', '소화', '영양 보충', '통증', '기타']

const TIME_SLOTS = [
  { id: 'morning',  label: '아침',    icon: '☀️' },
  { id: 'lunch',    label: '점심',    icon: '🕛' },
  { id: 'evening',  label: '저녁',    icon: '🌙' },
  { id: 'bedtime',  label: '취침 전', icon: '🛏' },
]

const CYCLE_TABS = ['정기 복용', '필요시', 'N일 간격']

const QUICK_DAYS = [
  { label: '매일',    days: ['MON','TUE','WED','THU','FRI','SAT','SUN'] },
  { label: '평일',    days: ['MON','TUE','WED','THU','FRI'] },
  { label: '주말',    days: ['SAT','SUN'] },
  { label: '직접 선택', days: [] },
]

const DAY_OPTIONS = [
  { label: '일', value: 'SUN' },
  { label: '월', value: 'MON' },
  { label: '화', value: 'TUE' },
  { label: '수', value: 'WED' },
  { label: '목', value: 'THU' },
  { label: '금', value: 'FRI' },
  { label: '토', value: 'SAT' },
]

// ── 유틸 ──────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10)
const addMonth = (dateStr, n = 1) => {
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + n)
  return d.toISOString().slice(0, 10)
}

// ── 초기 폼 상태 ───────────────────────────────────────────────

const defaultForm = () => ({
  drugName:      '',
  dosageAmount:  '1',
  dosageUnit:    '정',
  purpose:       '선택 안 함',
  startDate:     today(),
  endDate:       addMonth(today()),
  isOngoing:     false,           // 복용 종료일 미정 (진행 중)
  timeSlots:     [],              // 'morning' | 'lunch' | 'evening' | 'bedtime'
  customTimes:   [],              // [{ id, time: 'HH:MM' }]
  cycleTab:      '정기 복용',
  quickDay:      '매일',
  selectedDays:  ['MON','TUE','WED','THU','FRI','SAT','SUN'],
  intervalDays:  '2',             // N일 간격
  alarmEnabled:  true,
})

// ── 메인 컴포넌트 ─────────────────────────────────────────────

export default function MedicationFormPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { mode = 'create', medicationId } = location.state ?? {}
  const isEdit    = mode === 'edit'

  const [form,        setForm]        = useState(defaultForm())
  const [isLoading,   setIsLoading]   = useState(false)
  const [isFetching,  setIsFetching]  = useState(isEdit)
  const [error,       setError]       = useState(null)
  const [showDelete,  setShowDelete]  = useState(false)

  // ── 수정 모드: 기존 데이터 로드 ────────────────────────────
  useEffect(() => {
    if (!isEdit || !medicationId) return
    const load = async () => {
      setIsFetching(true)
      try {
        // 약 기본 정보 + 스케줄 병렬 조회
        const [medRes, scheduleRes] = await Promise.all([
          getMedicationById(medicationId),
          getSchedules(medicationId),
        ])
        if (!medRes.success) throw new Error(medRes.message)

        const m         = medRes.data
        const schedules = scheduleRes.success ? (scheduleRes.data?.schedules ?? []) : []
        const firstSchedule = schedules[0] ?? {}

        setForm((prev) => ({
          ...prev,
          drugName:     m.name        ?? '',
          dosageAmount: firstSchedule.dosage_message?.replace(/[^0-9.]/g, '') ?? '1',
          dosageUnit:   firstSchedule.dosage_message?.replace(/[0-9.]/g, '').trim() ?? '정',
          purpose:      m.description ?? '선택 안 함',
          startDate:    m.startDate   ?? today(),
          endDate:      m.endDate     ?? addMonth(today()),
          isOngoing:    !m.endDate,
          selectedDays: firstSchedule.days?.length ? firstSchedule.days : ['MON','TUE','WED','THU','FRI','SAT','SUN'],
          alarmEnabled: firstSchedule.notification_type !== 'NONE',
        }))
      } catch {
        setError('약 정보를 불러오지 못했습니다.')
      } finally {
        setIsFetching(false)
      }
    }
    load()
  }, [isEdit, medicationId])

  // ── 폼 헬퍼 ───────────────────────────────────────────────
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const toggleTimeSlot = (id) =>
    set('timeSlots', form.timeSlots.includes(id)
      ? form.timeSlots.filter((t) => t !== id)
      : [...form.timeSlots, id])

  const addCustomTime = () =>
    set('customTimes', [...form.customTimes, { id: Date.now(), time: '09:00' }])

  const updateCustomTime = (id, time) =>
    set('customTimes', form.customTimes.map((t) => t.id === id ? { ...t, time } : t))

  const removeCustomTime = (id) =>
    set('customTimes', form.customTimes.filter((t) => t.id !== id))

  const selectQuickDay = (qd) => {
    set('quickDay', qd.label)
    if (qd.label !== '직접 선택') set('selectedDays', qd.days)
  }

  const toggleDay = (value) =>
    set('selectedDays', form.selectedDays.includes(value)
      ? form.selectedDays.filter((d) => d !== value)
      : [...form.selectedDays, value])

  // ── 유효성 검사 ────────────────────────────────────────────
  const validate = () => {
    if (!form.drugName.trim())       return '약 이름을 입력해 주세요.'
    if (!form.dosageAmount)          return '1회 복용량을 입력해 주세요.'
    if (!form.startDate)             return '시작일을 입력해 주세요.'
    if (!form.isOngoing && !form.endDate) return '종료일을 입력해 주세요.'
    if (form.timeSlots.length === 0 && form.customTimes.length === 0)
      return '복용 시간을 하나 이상 선택해 주세요.'
    return null
  }

  // ── 등록 / 수정 제출 ───────────────────────────────────────
  const handleSubmit = async () => {
    const validationError = validate()
    if (validationError) { setError(validationError); return }

    setIsLoading(true)
    setError(null)

    try {
      // 복약 일정 payload (스케줄 등록/수정 공통)
      const schedulePayload = {
        intake_time:       form.customTimes[0]?.time ?? '08:00',
        dosage_message:    `${form.dosageAmount}${form.dosageUnit}`,
        notification_type: form.alarmEnabled ? 'PUSH' : 'NONE',
        days:              form.cycleTab === '정기 복용' ? form.selectedDays
                         : form.cycleTab === '필요시'   ? []
                         : [], // N일 간격은 추후 백엔드 스펙 확인 필요
      }

      if (isEdit) {
        // 수정: PUT /{id}/schedules
        const res = await updateSchedule(medicationId, schedulePayload)
        if (!res.success) throw new Error(res.message)
      } else {
        // 등록: POST /prescriptions → POST /{id}/schedules
        const prescriptionPayload = {
          drug_name:     form.drugName.trim(),
          dosage:        `${form.dosageAmount}${form.dosageUnit}`,
          start_date:    form.startDate,
          end_date:      form.isOngoing ? null : form.endDate,
          is_active:     true,
        }
        const res = await addMedication(prescriptionPayload)
        if (!res.success) throw new Error(res.message)
        // TODO: 실제 API 연결 시 res.data.id로 createSchedule 호출
        await createSchedule(res.data.id, schedulePayload)
        console.log('[등록] prescriptionId:', res.data?.id, 'schedulePayload:', schedulePayload)
      }

      navigate('/medication')
    } catch (e) {
      setError(e.message ?? '저장에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  // ── 삭제 ──────────────────────────────────────────────────
  const handleDelete = async () => {
    setIsLoading(true)
    try {
      await deleteMedication(medicationId)
      navigate('/medication')
    } catch {
      setError('삭제에 실패했습니다.')
      setIsLoading(false)
    }
  }

  // ── 로딩 상태 ─────────────────────────────────────────────
  if (isFetching) {
    return (
      <div className="flex justify-center items-center min-h-[100dvh]">
        <div className="w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── 렌더 ──────────────────────────────────────────────────
  return (
    <div className="bg-[#FAFAFA] w-full min-h-[100dvh] flex justify-center">
      <div className="w-full bg-[#FAFAFA] flex flex-col min-h-[100dvh] mx-auto md:max-w-[480px] pb-28">

        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 bg-white border-b border-[#F4F4F5] sticky top-0 z-10">
          <button onClick={() => navigate(-1)} className="text-[#09090B] p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 className="text-[17px] font-[700] text-[#09090B]">
            {isEdit ? '약 수정' : '약 등록'}
          </h1>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="text-[15px] font-[600] text-[#2563EB] disabled:opacity-40"
          >
            저장
          </button>
        </div>

        <div className="px-4 pt-4 space-y-4">

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-[10px] px-4 py-3 text-[13px] text-red-500">
              {error}
            </div>
          )}

          {/* ── 약 정보 ── */}
          <Section title="약 정보">
            {/* 약 이름 */}
            <Field label="약 이름" required>
              <input
                type="text"
                placeholder="예: 아모잘탄정 5mg"
                value={form.drugName}
                onChange={(e) => set('drugName', e.target.value)}
                className="w-full px-3 py-2.5 bg-[#F4F4F5] rounded-[10px] text-[14px] text-[#09090B] placeholder-[#A1A1AA] outline-none"
              />
            </Field>

            {/* 1회 복용량 */}
            <Field label="1회 복용량" required>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={form.dosageAmount}
                  onChange={(e) => set('dosageAmount', e.target.value)}
                  className="flex-1 px-3 py-2.5 bg-[#F4F4F5] rounded-[10px] text-[14px] text-[#09090B] outline-none"
                />
                <select
                  value={form.dosageUnit}
                  onChange={(e) => set('dosageUnit', e.target.value)}
                  className="px-3 py-2.5 bg-[#F4F4F5] rounded-[10px] text-[14px] text-[#09090B] outline-none min-w-[80px]"
                >
                  {DOSAGE_UNITS.map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>
            </Field>

            {/* 복용 목적 */}
            <Field label="복용 목적 (선택)">
              <select
                value={form.purpose}
                onChange={(e) => set('purpose', e.target.value)}
                className="w-full px-3 py-2.5 bg-[#F4F4F5] rounded-[10px] text-[14px] text-[#09090B] outline-none appearance-none"
              >
                {PURPOSES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </Field>
          </Section>

          {/* ── 투약 기간 ── */}
          <Section title="투약 기간" required>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => set('startDate', e.target.value)}
                className="flex-1 px-3 py-2.5 bg-[#F4F4F5] rounded-[10px] text-[13px] text-[#09090B] outline-none"
              />
              <span className="text-[#A1A1AA] text-[13px]">~</span>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => set('endDate', e.target.value)}
                disabled={form.isOngoing}
                className="flex-1 px-3 py-2.5 bg-[#F4F4F5] rounded-[10px] text-[13px] text-[#09090B] outline-none disabled:opacity-40"
              />
            </div>
            {/* 진행 중 체크박스 */}
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <div
                onClick={() => set('isOngoing', !form.isOngoing)}
                className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors
                  ${form.isOngoing ? 'bg-[#2563EB] border-[#2563EB]' : 'bg-white border-[#D4D4D8]'}`}
              >
                {form.isOngoing && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <span className="text-[13px] text-[#52525B]">복용 종료일 미정 (진행 중)</span>
            </label>
          </Section>

          {/* ── 복용 시간 ── */}
          <Section title="복용 시간" required>
            {/* 기본 시간대 버튼 */}
            <div className="grid grid-cols-2 gap-2">
              {TIME_SLOTS.map(({ id, label, icon }) => {
                const active = form.timeSlots.includes(id)
                return (
                  <button
                    key={id}
                    onClick={() => toggleTimeSlot(id)}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] text-[14px] font-[500] border transition-all
                      ${active
                        ? 'bg-[#EFF6FF] border-[#2563EB] text-[#2563EB]'
                        : 'bg-white border-[#E4E4E7] text-[#52525B]'
                      }`}
                  >
                    <span className="text-[15px]">{icon}</span>
                    {label}
                  </button>
                )
              })}
            </div>

            {/* 직접 추가한 시간들 */}
            {form.customTimes.map(({ id, time }) => (
              <div key={id} className="flex items-center gap-2 mt-2">
                <div className="flex-1 flex items-center gap-2 bg-[#EFF6FF] border border-[#2563EB] rounded-[10px] px-3 py-2">
                  <span className="text-[13px] text-[#2563EB] font-[500]">
                    {(() => {
                      const [h] = time.split(':')
                      return parseInt(h) < 12 ? '오전' : '오후'
                    })()}
                  </span>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => updateCustomTime(id, e.target.value)}
                    className="flex-1 bg-transparent text-[14px] text-[#2563EB] font-[500] outline-none"
                  />
                </div>
                <button
                  onClick={() => removeCustomTime(id)}
                  className="w-7 h-7 rounded-full bg-[#F4F4F5] flex items-center justify-center text-[#A1A1AA]"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}

            {/* 직접 시간 추가 버튼 */}
            <button
              onClick={addCustomTime}
              className="w-full mt-2 py-2.5 border border-dashed border-[#D4D4D8] rounded-[10px] text-[13px] text-[#A1A1AA] flex items-center justify-center gap-1.5 hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              직접 시간 추가
            </button>
          </Section>

          {/* ── 복약 주기 ── */}
          <Section title="복약 주기" required>
            {/* 탭 */}
            <div className="flex bg-[#F4F4F5] rounded-[10px] p-1">
              {CYCLE_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => set('cycleTab', tab)}
                  className={`flex-1 py-1.5 rounded-[8px] text-[13px] font-[600] transition-all
                    ${form.cycleTab === tab
                      ? 'bg-white text-[#2563EB] shadow-sm'
                      : 'text-[#A1A1AA]'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* 정기 복용 */}
            {form.cycleTab === '정기 복용' && (
              <div className="mt-3 space-y-3">
                {/* 빠른 선택 */}
                <div>
                  <p className="text-[12px] text-[#A1A1AA] mb-2">빠른 선택</p>
                  <div className="flex gap-2 flex-wrap">
                    {QUICK_DAYS.map((qd) => (
                      <button
                        key={qd.label}
                        onClick={() => selectQuickDay(qd)}
                        className={`px-3.5 py-1.5 rounded-full text-[13px] font-[500] border transition-all
                          ${form.quickDay === qd.label
                            ? 'bg-[#EFF6FF] border-[#2563EB] text-[#2563EB]'
                            : 'bg-white border-[#E4E4E7] text-[#52525B]'
                          }`}
                      >
                        {qd.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 요일 선택 */}
                <div>
                  <p className="text-[12px] text-[#A1A1AA] mb-2">요일</p>
                  <div className="flex gap-1.5 justify-between">
                    {DAY_OPTIONS.map(({ label, value }) => {
                      const active = form.selectedDays.includes(value)
                      return (
                        <button
                          key={value}
                          onClick={() => { set('quickDay', '직접 선택'); toggleDay(value) }}
                          className={`w-9 h-9 rounded-full text-[13px] font-[600] border transition-all
                            ${active
                              ? 'bg-[#2563EB] border-[#2563EB] text-white'
                              : 'bg-white border-[#E4E4E7] text-[#52525B]'
                            }`}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 필요시 */}
            {form.cycleTab === '필요시' && (
              <p className="mt-3 text-[13px] text-[#71717A] bg-[#F4F4F5] rounded-[10px] px-4 py-3">
                필요할 때마다 복용하는 약으로 설정됩니다.
              </p>
            )}

            {/* N일 간격 */}
            {form.cycleTab === 'N일 간격' && (
              <div className="mt-3 flex items-center gap-3">
                <span className="text-[13px] text-[#52525B]">매</span>
                <input
                  type="number"
                  min="2"
                  max="30"
                  value={form.intervalDays}
                  onChange={(e) => set('intervalDays', e.target.value)}
                  className="w-16 px-3 py-2 bg-[#F4F4F5] rounded-[10px] text-[14px] text-center text-[#09090B] outline-none"
                />
                <span className="text-[13px] text-[#52525B]">일마다 복용</span>
              </div>
            )}
          </Section>

          {/* ── 복약 알림 ── */}
          <div className="bg-white border border-[#E4E4E7] rounded-[14px] px-4 py-4 flex items-center justify-between">
            <div>
              <p className="text-[14px] font-[600] text-[#09090B]">복약 알림 받기</p>
              <p className="text-[12px] text-[#A1A1AA] mt-0.5">설정한 시간에 푸시 알림을 보내드려요</p>
            </div>
            <button
              onClick={() => set('alarmEnabled', !form.alarmEnabled)}
              className={`w-12 h-6 rounded-full transition-colors relative ${form.alarmEnabled ? 'bg-[#2563EB]' : 'bg-[#D4D4D8]'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.alarmEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* ── 삭제 버튼 (수정 모드만) ── */}
          {isEdit && (
            <div>
              {!showDelete ? (
                <button
                  onClick={() => setShowDelete(true)}
                  className="w-full py-3 flex items-center justify-center gap-2 text-[14px] font-[600] text-red-400 border border-red-200 rounded-[14px] bg-white"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                  이 약 삭제하기
                </button>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-[14px] px-4 py-4">
                  <p className="text-[13px] text-red-500 text-center mb-3">
                    삭제 시 이 약과 관련된 모든 복약 기록도 함께 사라집니다.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDelete(false)}
                      className="flex-1 py-2.5 rounded-[10px] border border-[#E4E4E7] text-[13px] font-[600] text-[#52525B] bg-white"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isLoading}
                      className="flex-1 py-2.5 rounded-[10px] bg-red-500 text-[13px] font-[600] text-white disabled:opacity-60"
                    >
                      {isLoading ? '삭제 중...' : '삭제 확인'}
                    </button>
                  </div>
                </div>
              )}
              <p className="text-[11px] text-[#A1A1AA] text-center mt-2">
                삭제 시 이 약과 관련된 모든 복약 기록도 함께 사라집니다.
              </p>
            </div>
          )}

        </div>

        {/* ── 하단 고정 버튼 ── */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full md:max-w-[480px] bg-white border-t border-[#F4F4F5] px-4 py-4">
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full py-3.5 bg-[#2563EB] text-white text-[15px] font-[700] rounded-[14px] disabled:opacity-60 active:scale-[0.99] transition-transform"
          >
            {isLoading ? '처리 중...' : isEdit ? '수정 완료' : '등록하기'}
          </button>
        </div>

      </div>
    </div>
  )
}

// ── 공용 레이아웃 컴포넌트 ────────────────────────────────────

function Section({ title, required, children }) {
  return (
    <div className="bg-white border border-[#E4E4E7] rounded-[14px] px-4 py-4 space-y-3">
      <h2 className="text-[13px] font-[600] text-[#52525B]">
        {title}
        {required && <span className="text-[#2563EB] ml-0.5">*</span>}
      </h2>
      {children}
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12px] font-[500] text-[#71717A]">
        {label}
        {required && <span className="text-[#2563EB] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
