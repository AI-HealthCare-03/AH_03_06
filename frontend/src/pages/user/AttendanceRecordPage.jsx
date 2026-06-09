// 출석 기록 — 2분할 요약(연속/이번 달) + 점 달력 + 범례. (복약 기록 달력 패턴)
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/Header.jsx'
import MobileFrame from '../../components/MobileFrame.jsx'
import BottomNav from '../../components/BottomNav.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { getAttendanceStatus, getAttendanceCalendar } from '../../api/attendance.js'

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function buildGrid(year, month) {
  const firstDay = new Date(year, month - 1, 1).getDay()
  const lastDate = new Date(year, month, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= lastDate; d++) cells.push(d)
  return cells
}

export default function AttendanceRecordPage() {
  const navigate = useNavigate()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [streak, setStreak] = useState(0)
  const [cal, setCal] = useState({ checked_dates: [], total_count: 0 })

  useEffect(() => { getAttendanceStatus().then(s => setStreak(s?.current_streak ?? 0)).catch(() => {}) }, [])
  useEffect(() => {
    getAttendanceCalendar(year, month)
      .then(c => setCal(c ?? { checked_dates: [], total_count: 0 }))
      .catch(() => setCal({ checked_dates: [], total_count: 0 }))
  }, [year, month])

  const checkedSet = new Set((cal.checked_dates || []).map(d => String(d).slice(0, 10)))
  const dateStr = (d) => `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const isToday = (d) => year === now.getFullYear() && month === now.getMonth() + 1 && d === now.getDate()
  const prevMonth = () => { if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setYear(y => y + 1); setMonth(1) } else setMonth(m => m + 1) }

  const cells = buildGrid(year, month)

  return (
    <MobileFrame header={<Header variant="back" title="출석 기록" onBack={() => navigate(-1)} />} bottomNav={<BottomNav />} contentBg="white">
      <div className="px-5 pt-5 space-y-4">

        {/* 2분할 요약 */}
        <div className="bg-white rounded-[14px] border border-[#E4E4E7] flex shadow-sm">
          <div className="flex-1 py-5 text-center border-r border-[#F4F4F5]">
            <p className="text-[12px] text-[#71717A]">연속 출석</p>
            <p className="text-[26px] font-bold text-primary mt-1">{streak}일</p>
          </div>
          <div className="flex-1 py-5 text-center">
            <p className="text-[12px] text-[#71717A]">이번 달 출석</p>
            <p className="text-[26px] font-bold text-[#18181B] mt-1">{cal.total_count ?? 0}일</p>
          </div>
        </div>

        {/* 달력 */}
        <div className="bg-white rounded-[14px] border border-[#E4E4E7] p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="w-8 h-8 rounded-lg bg-[#F4F4F5] flex items-center justify-center active:bg-[#E4E4E7]">
              <FontAwesomeIcon icon={faChevronLeft} className="text-[#52525B] text-[12px]" />
            </button>
            <span className="text-[15px] font-bold text-[#18181B]">{year}년 {month}월</span>
            <button onClick={nextMonth} className="w-8 h-8 rounded-lg bg-[#F4F4F5] flex items-center justify-center active:bg-[#E4E4E7]">
              <FontAwesomeIcon icon={faChevronRight} className="text-[#52525B] text-[12px]" />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center">
            {DAY_LABELS.map((d, i) => (
              <span key={d} className={`text-[12px] font-medium py-1.5 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-[#71717A]'}`}>{d}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 text-center">
            {cells.map((d, idx) => {
              const col = idx % 7
              const checked = d && checkedSet.has(dateStr(d))
              const today = d && isToday(d)
              return (
                <div key={idx} className="h-11 flex flex-col items-center justify-center gap-0.5">
                  {d && (
                    <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${today ? 'bg-primary' : ''}`}>
                      <span className={`text-[14px] ${today ? 'text-white font-bold' : col === 0 ? 'text-red-500' : col === 6 ? 'text-blue-500' : 'text-[#18181B]'}`}>{d}</span>
                    </div>
                  )}
                  <span className={`w-1.5 h-1.5 rounded-full ${checked ? 'bg-primary' : 'bg-transparent'}`} />
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-center gap-1.5 mt-3 pt-3 border-t border-[#F4F4F5]">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-[12px] text-[#71717A]">출석</span>
          </div>
        </div>

        <p className="text-[12px] text-[#A1A1AA] text-center pt-1">출석체크는 하루 1회, 홈 화면에서 할 수 있어요</p>
      </div>
    </MobileFrame>
  )
}
