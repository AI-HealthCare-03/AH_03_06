import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/Header.jsx'
import ErrorState from '../../components/ErrorState.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUtensils, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { listDietGuideDates, getDietGuideByDate, generateDietGuide, regenerateDietGuide } from '../../api/dietGuides.js'
import { listHealthCheckups } from '../../api/healthCheckup.js'

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

const MEAL_PLAN_KO = {
  'Balanced Diet':               '균형 식단',
  'Low-Sodium Diet':             '저염 식단',
  'Low-Carb Diet':               '저탄수화물 식단',
  'Low-Calorie Diet':            '저칼로리 식단',
  'Low-Carb Low-Sodium Diet':    '저탄수화물·저염 식단',
  'Low-Calorie Low-Sodium Diet': '저칼로리·저염 식단',
  'Low-Carb Low-Calorie Diet':   '저탄수화물·저칼로리 식단',
  'Therapeutic Diet':            '치료 식단',
}

function buildCalendarGrid(year, month) {
  const firstDay = new Date(year, month - 1, 1).getDay()
  const lastDate = new Date(year, month, 0).getDate()
  const prevLast = new Date(year, month - 1, 0).getDate()
  const cells = []
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: prevLast - i, cur: false })
  for (let d = 1; d <= lastDate; d++)     cells.push({ day: d, cur: true })
  const remain = 42 - cells.length
  for (let d = 1; d <= remain; d++)       cells.push({ day: d, cur: false })
  return cells
}

function toDateStr(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function MealSummaryRow({ label, content }) {
  if (!content) return null
  const lines   = content.replace(/^[-•]\s*/gm, '').trim().split('\n').filter(Boolean)
  const summary = lines.slice(0, 3).join(', ')
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="text-[11px] font-[700] text-mute w-6 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-[13px] text-textBody leading-relaxed line-clamp-2">{summary}</span>
    </div>
  )
}

function DietGuideListPage() {
  const navigate   = useNavigate()
  const now        = new Date()
  const [year,     setYear]     = useState(now.getFullYear())
  const [month,    setMonth]    = useState(now.getMonth() + 1)
  const [selected, setSelected] = useState(toDateStr(now.getFullYear(), now.getMonth() + 1, now.getDate()))
  const [guideDates,   setGuideDates]   = useState([])
  const [guide,        setGuide]        = useState(null)
  const [guideLoading, setGuideLoading] = useState(false)
  const [generating,   setGenerating]   = useState(false)
  const [guideError,   setGuideError]   = useState(false)
  const [datesError,   setDatesError]   = useState(false)
  const [generateError, setGenerateError] = useState('')
  const pollRef = useRef(null)

  const fetchGuideDates = async () => {
    try {
      const data = await listDietGuideDates()
      setGuideDates(Array.isArray(data?.dates) ? data.dates : [])
      setDatesError(false)
    } catch {
      setDatesError(true)
    }
  }

  const loadGuide = useCallback(() => {
    if (!selected) return
    setGuide(null)
    setGuideError(false)
    setGenerateError('')
    setGuideLoading(true)
    getDietGuideByDate(selected)
      .then(data => setGuide(data))
      .catch(() => setGuideError(true))
      .finally(() => setGuideLoading(false))
  }, [selected])

  useEffect(() => {
    fetchGuideDates()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  useEffect(() => { loadGuide() }, [loadGuide])

  const startPolling = (targetDate) => {
    if (pollRef.current) clearInterval(pollRef.current)
    let attempts = 0
    const MAX_ATTEMPTS = 20 // 3초 × 20 ≈ 60초 상한
    pollRef.current = setInterval(async () => {
      attempts += 1
      try {
        const data = await getDietGuideByDate(targetDate)
        if (data) {
          setGuide(data)
          setGuideDates(prev => prev.includes(targetDate) ? prev : [...prev, targetDate])
          setGenerating(false)
          clearInterval(pollRef.current)
          return
        }
      } catch { /* 폴링 중 일시 오류는 무시하고 다음 주기에 재시도 */ }
      if (attempts >= MAX_ATTEMPTS) {
        clearInterval(pollRef.current)
        setGenerating(false)
        setGenerateError('가이드 생성이 지연되고 있어요. 잠시 후 다시 시도해 주세요.')
      }
    }, 3000)
  }

  const handleGenerate = async () => {
    setGenerateError('')
    try {
      const data     = await listHealthCheckups()
      const checkups = Array.isArray(data?.checkups) ? data.checkups : []
      if (checkups.length === 0) {
        window.alert('등록된 건강검진 기록이 없어요.')
        return
      }
      setGenerating(true)
      await generateDietGuide(checkups[0].id, selected)
      startPolling(selected)
    } catch (err) {
      setGenerating(false)
      window.alert(err?.message ?? '가이드 생성 요청에 실패했어요.')
    }
  }

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) } else setMonth(m => m + 1)
  }

  const cells        = buildCalendarGrid(year, month)
  const guideDateSet = new Set(guideDates)

  return (
    <div className="bg-white md:bg-[#F4F4F5] w-full min-h-[100dvh] flex justify-center">
      <div className="w-full bg-white relative flex flex-col min-h-[100dvh] mx-auto md:max-w-[480px] md:rounded-[24px] md:shadow-2xl md:my-8 pb-10">

        <Header variant="back" title="식단 가이드" />

        <main className="px-4 py-4 space-y-3">

          {/* 달력 */}
          <div className="bg-white rounded-2xl px-4 py-4 shadow-sm border border-borderHairline">
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-bgSubtle">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#09090B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <span className="text-[15px] font-semibold text-textHeading">{year}년 {month}월</span>
              <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-bgSubtle">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#09090B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>

            <div className="grid grid-cols-7 mb-1">
              {DAY_LABELS.map((d, i) => (
                <div key={d} className={`text-center text-[11px] font-medium py-1
                  ${i === 0 ? 'text-[#EF4444]' : i === 6 ? 'text-primary' : 'text-mute'}`}>
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-1">
              {cells.map((cell, idx) => {
                const col      = idx % 7
                const isSun    = col === 0
                const isSat    = col === 6
                const dateStr  = cell.cur ? toDateStr(year, month, cell.day) : null
                const isSel    = dateStr === selected
                const hasGuide = dateStr && guideDateSet.has(dateStr)

                return (
                  <button
                    key={idx}
                    onClick={() => cell.cur && setSelected(dateStr)}
                    disabled={!cell.cur}
                    className={`flex flex-col items-center py-1 rounded-xl transition-colors
                      ${isSel ? 'bg-primary' : cell.cur ? 'hover:bg-bgSubtle' : ''}`}
                  >
                    <span className={`text-[13px] font-medium w-7 h-7 flex items-center justify-center rounded-full
                      ${!cell.cur ? 'text-[#D4D4D8]' : isSel ? 'text-white' : isSun ? 'text-[#EF4444]' : isSat ? 'text-primary' : 'text-textHeading'}`}>
                      {cell.day}
                    </span>
                    <span className={`w-1 h-1 rounded-full mt-0.5
                      ${hasGuide ? (isSel ? 'bg-white/60' : 'bg-primary') : 'invisible'}`} />
                  </button>
                )
              })}
            </div>

            <div className="flex justify-center mt-3 pt-3 border-t border-borderHairline">
              <span className="flex items-center gap-1.5 text-[11px] text-mute">
                <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" /> 식단 있음
              </span>
            </div>
          </div>

          {/* 날짜 목록 로드 실패 */}
          {datesError && (
            <ErrorState message={'식단 기록 날짜를 불러오지 못했어요'} onRetry={fetchGuideDates} className="py-3" />
          )}

          {/* 로딩 */}
          {guideLoading && (
            <p className="text-[13px] text-mute text-center py-6">불러오는 중…</p>
          )}

          {/* 조회 실패 */}
          {!guideLoading && guideError && (
            <ErrorState message={'식단 가이드를 불러오지 못했어요'} onRetry={loadGuide} className="py-6" />
          )}

          {/* 생성 중 */}
          {generating && !guide && (
            <div className="bg-primarySoft border border-primary/20 rounded-[12px] px-4 py-3">
              <p className="text-[12px] text-primary text-center animate-pulse">가이드를 생성하고 있어요. 잠시만 기다려 주세요…</p>
            </div>
          )}

          {/* 생성 지연/실패 안내 */}
          {generateError && (
            <p className="text-[13px] text-red-400 text-center py-3">{generateError}</p>
          )}

          {/* 식단 없음 */}
          {!guideLoading && !guideError && !guide && !generating && (
            <section className="bg-bgSubtle border border-borderHairline rounded-[12px] p-6 text-center">
              <FontAwesomeIcon icon={faUtensils} className="text-mute text-[24px] mb-3" />
              <h2 className="text-[14px] font-[700] text-textHeading mb-1">해당 날짜의 식단 가이드가 없어요</h2>
              <p className="text-[12px] text-subtext leading-relaxed mb-4">최신 건강검진 결과를 기반으로 맞춤 식단을 생성해 드려요.</p>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full h-11 bg-primary text-white text-[14px] font-[700] rounded-[10px] transition-colors disabled:bg-mute disabled:cursor-not-allowed"
              >
                식단 생성하기
              </button>
            </section>
          )}

          {/* 식단 요약 */}
          {!guideLoading && guide && (
            <div
              onClick={() => navigate(`/diet-guides/${selected}`)}
              className="bg-white border border-borderHairline rounded-[12px] px-5 py-4 cursor-pointer active:bg-bgSubtle transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[14px] font-[700] text-textHeading">
                  {MEAL_PLAN_KO[guide.meal_plan_type] ?? guide.meal_plan_type}
                </h2>
                <div className="flex items-center gap-1 text-mute">
                  <span className="text-[11px]">상세보기</span>
                  <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
                </div>
              </div>
              <div className="divide-y divide-borderHairline">
                <MealSummaryRow label="아침" content={guide.breakfast} />
                <MealSummaryRow label="점심" content={guide.lunch} />
                <MealSummaryRow label="저녁" content={guide.dinner} />
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}

export default DietGuideListPage