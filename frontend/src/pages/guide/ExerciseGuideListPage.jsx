import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/Header.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPersonRunning, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { getExerciseGuideByDate, generateExerciseGuide } from '../../api/exerciseGuides.js'
import { listHealthCheckups } from '../../api/healthCheckup.js'

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

const CVD_RANGE_KO = {
  low:       '저위험',
  moderate:  '중위험',
  high:      '고위험',
  very_high: '초고위험',
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

function ExerciseGuideListPage() {
  const navigate = useNavigate()
  const now      = new Date()
  const [year,     setYear]     = useState(now.getFullYear())
  const [month,    setMonth]    = useState(now.getMonth() + 1)
  const [selected, setSelected] = useState(toDateStr(now.getFullYear(), now.getMonth() + 1, now.getDate()))
  const [guide,        setGuide]        = useState(null)
  const [guideLoading, setGuideLoading] = useState(false)
  const [generating,   setGenerating]   = useState(false)
  const pollRef = useRef(null)

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  useEffect(() => {
    if (!selected) return
    setGuide(null)
    setGuideLoading(true)
    getExerciseGuideByDate(selected)
      .then(data => setGuide(data))
      .catch(() => setGuide(null))
      .finally(() => setGuideLoading(false))
  }, [selected])

  const startPolling = (targetDate) => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const data = await getExerciseGuideByDate(targetDate)
        if (data) {
          setGuide(data)
          setGenerating(false)
          clearInterval(pollRef.current)
        }
      } catch {}
    }, 3000)
  }

  const handleGenerate = async () => {
    try {
      const data     = await listHealthCheckups()
      const checkups = Array.isArray(data?.checkups) ? data.checkups : []
      if (checkups.length === 0) {
        window.alert('등록된 건강검진 기록이 없어요.')
        return
      }
      setGenerating(true)
      await generateExerciseGuide(checkups[0].id, selected)
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

  const cells = buildCalendarGrid(year, month)

  return (
    <div className="bg-white md:bg-[#F4F4F5] w-full min-h-[100dvh] flex justify-center">
      <div className="w-full bg-white relative flex flex-col min-h-[100dvh] mx-auto md:max-w-[480px] md:rounded-[24px] md:shadow-2xl md:my-8 pb-10">

        <Header variant="back" title="운동 가이드" />

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
                const col     = idx % 7
                const isSun   = col === 0
                const isSat   = col === 6
                const dateStr = cell.cur ? toDateStr(year, month, cell.day) : null
                const isSel   = dateStr === selected

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
                  </button>
                )
              })}
            </div>
          </div>

          {/* 로딩 */}
          {guideLoading && (
            <p className="text-[13px] text-mute text-center py-6">불러오는 중…</p>
          )}

          {/* 생성 중 */}
          {generating && !guide && (
            <div className="bg-primarySoft border border-primary/20 rounded-[12px] px-4 py-3">
              <p className="text-[12px] text-primary text-center animate-pulse">가이드를 생성하고 있어요. 잠시만 기다려 주세요…</p>
            </div>
          )}

          {/* 가이드 없음 */}
          {!guideLoading && !guide && !generating && (
            <section className="bg-bgSubtle border border-borderHairline rounded-[12px] p-6 text-center">
              <FontAwesomeIcon icon={faPersonRunning} className="text-mute text-[24px] mb-3" />
              <h2 className="text-[14px] font-[700] text-textHeading mb-1">해당 날짜의 운동 가이드가 없어요</h2>
              <p className="text-[12px] text-subtext leading-relaxed mb-4">최신 건강검진 결과를 기반으로 맞춤 운동 가이드를 생성해 드려요.</p>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full h-11 bg-primary text-white text-[14px] font-[700] rounded-[10px] transition-colors disabled:bg-mute disabled:cursor-not-allowed"
              >
                운동 가이드 생성하기
              </button>
            </section>
          )}

          {/* 가이드 요약 */}
          {!guideLoading && guide && (
            <div
              onClick={() => navigate(`/exercise-guides/${selected}`)}
              className="bg-white border border-borderHairline rounded-[12px] px-5 py-4 cursor-pointer active:bg-bgSubtle transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[14px] font-[700] text-textHeading">
                  {guide.intensity_label} 운동 플랜
                </h2>
                <div className="flex items-center gap-1 text-mute">
                  <span className="text-[11px]">상세보기</span>
                  <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center rounded-md bg-primarySoft text-primary px-2 py-0.5 text-[12px] font-[600]">
                  {CVD_RANGE_KO[guide.cvd_range] ?? guide.cvd_range}
                </span>
                <span className="text-[12px] text-subtext">CVD 점수 {guide.cvd_score}</span>
                {guide.conditions?.map((c, i) => (
                  <span key={i} className="inline-flex items-center rounded-md bg-bgSubtle text-subtext px-2 py-0.5 text-[11px]">{c}</span>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}

export default ExerciseGuideListPage
