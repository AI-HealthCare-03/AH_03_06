// 내 포인트 — 잔액 카드 + 적립 이력. 빈 상태는 CTA(출석체크 하러 가기 → 홈).
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/Header.jsx'
import MobileFrame from '../../components/MobileFrame.jsx'
import BottomNav from '../../components/BottomNav.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faStar } from '@fortawesome/free-solid-svg-icons'
import { getPointHistory } from '../../api/point.js'
import { resetAttendanceCheckSession } from '../../components/AttendanceModal.jsx'

// 포인트 created_at: 서버 naive UTC(Z 미부착)로 내려옴 → Z 붙여 로컬(KST)로 변환 표시.
const fmtDate = (s) => {
  if (!s) return ''
  const d = new Date(/[Z+]/.test(s) ? s : `${s}Z`)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export default function PointsPage() {
  const navigate = useNavigate()
  const [balance, setBalance] = useState(0)
  const [history, setHistory] = useState(null)   // null=로딩, []=빈

  useEffect(() => {
    getPointHistory()
      .then(d => { setBalance(d?.balance ?? 0); setHistory(d?.history ?? []) })
      .catch(() => setHistory([]))
  }, [])

  return (
    <MobileFrame header={<Header variant="back" title="내 포인트" onBack={() => navigate(-1)} />} bottomNav={<BottomNav />} contentBg="white">
      <div className="px-5 pt-5 space-y-4">

        {/* 잔액 카드 — 앱 컨벤션(흰 카드 + Primary 숫자) */}
        <div className="bg-white rounded-[14px] border border-[#E4E4E7] p-5 shadow-sm">
          <p className="text-[13px] text-[#71717A]">보유 포인트</p>
          <p className="text-[30px] font-bold text-primary mt-1 leading-none">{balance.toLocaleString()}<span className="text-[18px] font-bold ml-1">P</span></p>
        </div>

        {history && history.length > 0 && (
          <div className="bg-white rounded-[14px] border border-[#E4E4E7] overflow-hidden shadow-sm">
            {history.map((h, i) => (
              <div key={i} className={`flex items-center justify-between px-4 py-3.5 ${i < history.length - 1 ? 'border-b border-[#F4F4F5]' : ''}`}>
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-[#09090B] truncate">{h.description || h.event_type}</p>
                  <p className="text-[12px] text-[#A1A1AA] mt-0.5">{fmtDate(h.created_at)}</p>
                </div>
                <span className={`text-[14px] font-bold shrink-0 ml-3 ${h.amount >= 0 ? 'text-primary' : 'text-[#71717A]'}`}>
                  {h.amount >= 0 ? '+' : ''}{h.amount} P
                </span>
              </div>
            ))}
          </div>
        )}

        {history && history.length === 0 && (
          /* 빈 상태 */
          <div className="flex flex-col items-center justify-center pt-16 text-center">
            <div className="w-16 h-16 rounded-full bg-primarySoft flex items-center justify-center">
              <FontAwesomeIcon icon={faStar} className="text-primary/40 text-[24px]" />
            </div>
            <p className="text-[16px] font-bold text-[#18181B] mt-4">아직 적립 내역이 없어요</p>
            <p className="text-[13px] text-[#71717A] mt-1.5">출석체크로 첫 포인트를 받아보세요</p>
            <button onClick={() => { resetAttendanceCheckSession(); navigate('/home') }}
              className="mt-6 px-7 h-12 bg-primary text-white text-[15px] font-bold rounded-xl active:opacity-80">
              출석체크 하러 가기
            </button>
          </div>
        )}
      </div>
    </MobileFrame>
  )
}
