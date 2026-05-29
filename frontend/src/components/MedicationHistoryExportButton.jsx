import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDownload } from '@fortawesome/free-solid-svg-icons'
import { exportMedicationHistory } from '../api/medicationHistories.js'

const fmt = (d) => {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
const dot = (s) => s.replace(/-/g, '.') // YYYY-MM-DD → YYYY.MM.DD (표시용)
const daysAgo = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

// 빠른 기간 프리셋 (오늘 기준 N일)
const PRESETS = [
  { key: '1w', label: '최근 1주', days: 7 },
  { key: '1m', label: '최근 1개월', days: 30 },
  { key: '3m', label: '최근 3개월', days: 90 },
]

function MedicationHistoryExportButton({ className = '' }) {
  const [mode, setMode] = useState('1m') // '1w' | '1m' | '3m' | 'custom'
  const [startDate, setStartDate] = useState(fmt(daysAgo(29)))
  const [endDate, setEndDate] = useState(fmt(new Date()))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const applyPreset = (p) => {
    setMode(p.key)
    setStartDate(fmt(daysAgo(p.days - 1)))
    setEndDate(fmt(new Date()))
    setError('')
  }

  const handleClick = async () => {
    setError('')
    if (!startDate || !endDate) {
      setError('시작일과 종료일을 모두 입력하세요.')
      return
    }
    if (endDate < startDate) {
      setError('종료일은 시작일 이후여야 합니다.')
      return
    }

    setLoading(true)
    try {
      const blob = await exportMedicationHistory(startDate, endDate)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `medication_history_${startDate}_${endDate}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err?.message ?? '다운로드에 실패했어요.')
    } finally {
      setLoading(false)
    }
  }

  const chipCls = (active) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      active ? 'bg-[#2563EB] text-white' : 'bg-[#F4F4F5] text-[#71717A] hover:bg-[#E4E4E7]'
    }`

  const dateInputCls =
    'flex-1 min-w-0 border border-[#E4E4E7] rounded-xl px-3 py-2.5 text-sm text-[#09090B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]'

  return (
    <div className={`bg-white rounded-2xl px-4 py-4 shadow-sm ${className}`}>
      {/* 헤더 */}
      <div className="flex items-start gap-2 mb-3">
        <FontAwesomeIcon icon={faDownload} className="text-[#71717A] text-[14px] mt-0.5" />
        <div>
          <h2 className="text-[15px] font-semibold text-[#09090B] leading-tight">복약 이력 다운로드</h2>
          <p className="text-[11px] text-[#A1A1AA] mt-1 leading-tight">외래 진료 시 의료진과 공유하실 수 있어요</p>
        </div>
      </div>

      {/* 빠른 기간 + 직접 선택 */}
      <div className="flex flex-wrap gap-2 mb-3">
        {PRESETS.map((p) => (
          <button key={p.key} type="button" onClick={() => applyPreset(p)} className={chipCls(mode === p.key)}>
            {p.label}
          </button>
        ))}
        <button type="button" onClick={() => setMode('custom')} className={chipCls(mode === 'custom')}>
          직접 선택
        </button>
      </div>

      {/* 직접 선택 시 날짜 입력 */}
      {mode === 'custom' && (
        <div className="flex items-center gap-2 mb-3">
          <input
            type="date"
            value={startDate}
            max={endDate}
            onChange={(e) => { setStartDate(e.target.value); setError('') }}
            className={dateInputCls}
          />
          <span className="text-[#A1A1AA] text-sm flex-shrink-0">~</span>
          <input
            type="date"
            value={endDate}
            min={startDate}
            max={fmt(new Date())}
            onChange={(e) => { setEndDate(e.target.value); setError('') }}
            className={dateInputCls}
          />
        </div>
      )}

      {/* 선택 범위 표시 */}
      <div className="bg-[#F4F4F5] rounded-xl py-2.5 mb-3 text-center">
        <span className="text-[13px] text-[#71717A] font-medium tracking-wide">
          {dot(startDate)} – {dot(endDate)}
        </span>
      </div>

      {/* 인라인 에러 */}
      {error && <p className="text-[12px] text-[#DC2626] mb-2 text-center">{error}</p>}

      {/* 다운로드 */}
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="w-full py-3 inline-flex items-center justify-center gap-2 text-sm font-semibold bg-[#2563EB] text-white rounded-xl hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <FontAwesomeIcon icon={faDownload} className="text-[12px]" />
        {loading ? '다운로드 중…' : '복약 이력 다운로드 (CSV)'}
      </button>
    </div>
  )
}

export default MedicationHistoryExportButton
