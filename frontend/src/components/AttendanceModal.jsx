// 홈 출석체크 모달 — 미출석 시 노출. 체크 전/후 2상태.
// 포인트 규칙(백엔드 point_service.POINT_RULES): 출석 +10, 연속 7일 +50, 30일 +100.
import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faXmark, faCircleCheck, faStar } from '@fortawesome/free-solid-svg-icons'
import { getAttendanceStatus, checkInAttendance } from '../api/attendance.js'

// 같은 세션에서 닫으면 재진입 전까지 다시 안 띄움 (sessionStorage 대신 모듈 변수)
let dismissedThisSession = false

// 로그아웃·계정전환 시, 또는 "출석하러 가기" 진입 시 플래그를 풀어 모달을 다시 뜨게 한다.
export function resetAttendanceCheckSession() { dismissedThisSession = false }

const POINT_ATTENDANCE = 10
const POINT_BONUS_7 = 50
const POINT_BONUS_30 = 100

export default function AttendanceModal() {
  const [visible, setVisible] = useState(false)
  const [status, setStatus] = useState(null)     // {today_checked, current_streak}
  const [result, setResult] = useState(null)     // 체크인 응답 {message, current_streak}
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (dismissedThisSession) return
    getAttendanceStatus()
      .then(s => { if (s && !s.today_checked) { setStatus(s); setVisible(true) } })
      .catch(() => {})   // 실패 시 홈을 막지 않음
  }, [])

  const close = () => { dismissedThisSession = true; setVisible(false) }

  const handleCheckIn = async () => {
    setChecking(true); setError('')
    try {
      setResult(await checkInAttendance())
    } catch {
      setError('출석 체크에 실패했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setChecking(false)
    }
  }

  if (!visible) return null

  const already = result?.message === '이미 출석했습니다'
  const streak = result?.current_streak ?? status?.current_streak ?? 0
  const bonus7 = result && !already && streak % 7 === 0 ? POINT_BONUS_7 : 0
  const bonus30 = result && !already && streak % 30 === 0 ? POINT_BONUS_30 : 0
  const total = POINT_ATTENDANCE + bonus7 + bonus30
  const hasBonus = bonus7 > 0 || bonus30 > 0
  const now = new Date()
  const dateStr = `${now.getMonth() + 1}월 ${now.getDate()}일`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6" onClick={close}>
      <div className="w-full max-w-[340px] bg-white rounded-2xl p-6 relative" onClick={e => e.stopPropagation()}>
        <button onClick={close} aria-label="닫기"
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-[#F4F4F5] flex items-center justify-center active:bg-[#E4E4E7]">
          <FontAwesomeIcon icon={faXmark} className="text-[#71717A] text-[13px]" />
        </button>

        {!result ? (
          /* 체크 전 */
          <div className="text-center pt-3">
            <p className="text-[13px] text-[#71717A]">{dateStr}</p>
            <p className="text-[18px] font-bold text-[#18181B] mt-1.5">
              연속 출석 <span className="text-primary">{streak}일째</span>
            </p>
            <p className="text-[13px] text-[#71717A] mt-3">출석체크하고 {POINT_ATTENDANCE}P 받으세요</p>
            {error && <p className="text-[12px] text-red-500 mt-3">{error}</p>}
            <button onClick={handleCheckIn} disabled={checking}
              className="w-full mt-5 h-12 bg-primary text-white text-[15px] font-bold rounded-xl active:opacity-80 disabled:opacity-60">
              {checking ? '체크 중…' : '출석 체크하기'}
            </button>
          </div>
        ) : already ? (
          /* 이미 출석 */
          <div className="text-center pt-3">
            <div className="w-16 h-16 rounded-full bg-primary mx-auto flex items-center justify-center">
              <FontAwesomeIcon icon={faCheck} className="text-white text-[26px]" />
            </div>
            <p className="text-[17px] font-bold text-[#18181B] mt-4">오늘은 이미 출석했어요</p>
            <p className="text-[13px] text-[#71717A] mt-1.5">내일 또 출석체크 해주세요</p>
            <button onClick={close}
              className="w-full mt-5 h-12 bg-primary text-white text-[15px] font-bold rounded-xl active:opacity-80">확인</button>
          </div>
        ) : (
          /* 체크 완료 */
          <div className="text-center pt-3">
            <div className="w-16 h-16 rounded-full bg-primary mx-auto flex items-center justify-center">
              <FontAwesomeIcon icon={faCheck} className="text-white text-[26px]" />
            </div>
            <p className="text-[18px] font-bold text-[#18181B] mt-4">출석 완료!</p>
            <p className="text-[15px] font-bold text-primary mt-1">+{total}P 적립</p>

            {hasBonus && (
              <div className="bg-primarySoft rounded-xl p-3.5 mt-4 text-left">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[13px] text-[#52525B]">
                    <FontAwesomeIcon icon={faCircleCheck} className="text-primary text-[14px]" /> 오늘 출석 포인트
                  </span>
                  <span className="text-[13px] font-bold text-primary">+{POINT_ATTENDANCE}P</span>
                </div>
                {bonus7 > 0 && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="flex items-center gap-2 text-[13px] text-[#52525B]">
                      <FontAwesomeIcon icon={faCircleCheck} className="text-primary text-[14px]" /> 연속 7일 보너스
                    </span>
                    <span className="text-[13px] font-bold text-primary">+{POINT_BONUS_7}P</span>
                  </div>
                )}
                {bonus30 > 0 && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="flex items-center gap-2 text-[13px] text-[#52525B]">
                      <FontAwesomeIcon icon={faCircleCheck} className="text-primary text-[14px]" /> 연속 30일 보너스
                    </span>
                    <span className="text-[13px] font-bold text-primary">+{POINT_BONUS_30}P</span>
                  </div>
                )}
                <div className="border-t border-white/70 mt-2.5 pt-2.5 flex items-center gap-2">
                  <FontAwesomeIcon icon={faStar} className="text-primary text-[13px]" />
                  <span className="text-[13px] text-[#52525B]">총 <span className="text-primary font-bold">+{total}P</span> 가 적립되었습니다</span>
                </div>
              </div>
            )}
            {hasBonus && <p className="text-[13px] font-bold text-primary mt-3">{streak}일 연속 출석 달성!</p>}

            <button onClick={close}
              className="w-full mt-5 h-12 bg-primary text-white text-[15px] font-bold rounded-xl active:opacity-80">확인</button>
          </div>
        )}
      </div>
    </div>
  )
}
