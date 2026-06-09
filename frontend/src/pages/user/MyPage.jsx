import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAccessToken, getRefreshToken } from '../../utils/token.js'
import { logout } from '../../App.jsx'
import Header from '../../components/Header.jsx'
import BottomNav from '../../components/BottomNav.jsx'
import MobileFrame from '../../components/MobileFrame.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChevronRight,
  faUserPen,
  faBullseye,
  faNotesMedical,
  faArrowRightFromBracket,
  faUserXmark,
  faStar,
  faCalendarCheck,
  faImage,
} from '@fortawesome/free-solid-svg-icons'
import { getPointBalance } from '../../api/point.js'
import { getAttendanceStatus } from '../../api/attendance.js'
import { getProfileItems, resolveProfileImage } from '../../api/profile.js'

const base = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

async function apiFetch(path, options = {}) {
  const token = getAccessToken()
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error(data?.detail ?? res.statusText)
  return data
}

function MyPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pointBalance, setPointBalance] = useState(null)   // null=미표시
  const [streak, setStreak] = useState(null)
  const [avatar, setAvatar] = useState(null)   // 선택한 프로필 image_url

  useEffect(() => {
    apiFetch('/users/me')
      .then(setUser)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
    getPointBalance().then(d => setPointBalance(d?.balance ?? 0)).catch(() => {})
    getProfileItems().then(d => {
      const items = d?.items ?? []
      // 선택한 프로필 우선, 없으면 기본 프로필, 그것도 없으면 이니셜 폴백
      setAvatar((items.find(i => i.is_selected) || items.find(i => i.is_default))?.image_url ?? null)
    }).catch(() => {})
    getAttendanceStatus().then(s => setStreak(s?.current_streak ?? 0)).catch(() => {})
  }, [])

  const handleLogout = async () => {
    try {
      const refreshToken = getRefreshToken()
      await fetch(`${base}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
    } finally {
      logout()
    }
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm('정말 탈퇴하시겠어요? 모든 데이터가 삭제됩니다.')) return
    try {
      await apiFetch('/users/me', { method: 'DELETE', body: JSON.stringify({}) })
      logout()
    } catch (err) {
      alert(err.message)
    }
  }

  // 라우트·화면 미구현 메뉴 — 빈 화면 대신 안내 (구현되면 navigate 로 교체)

  const nickname = user?.nickname ?? '...'
  const email = user?.email ?? '...'
  const initial = nickname.charAt(0)

  return (
    <MobileFrame
      header={<Header variant="default" title="마이페이지" />}
      bottomNav={<BottomNav />}
    >
        <div className="px-5 pt-5 pb-6 space-y-6">

          {loading && (
            <div className="flex items-center justify-center py-10">
              <p className="text-[13px] text-[#A1A1AA]">불러오는 중...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-[10px] px-4 py-3">
              <p className="text-[13px] text-red-500">{error}</p>
            </div>
          )}

          {!loading && user && (
            <>
              {/* 프로필 카드 */}
              <section>
                <button
                  onClick={() => navigate('/user/profile/edit')}
                  className="w-full bg-white rounded-[10px] border border-[#E4E4E7] p-4 flex items-center justify-between active:bg-[#FAFAFA] transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    {avatar ? (
                      <img src={resolveProfileImage(avatar)} alt="프로필" className="w-12 h-12 rounded-full bg-[#F4F4F5] object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#EFF6FF] flex items-center justify-center">
                        <span className="text-[18px] font-bold text-primary">{initial}</span>
                      </div>
                    )}
                    <div className="text-left">
                      <h2 className="text-[15px] font-bold text-[#18181B] tracking-tight">{nickname}</h2>
                      <p className="text-[12px] font-medium text-[#52525B] mt-0.5">{email}</p>
                    </div>
                  </div>
                  <FontAwesomeIcon icon={faChevronRight} className="text-[#A1A1AA] text-[13px]" />
                </button>
              </section>

              {/* 혜택 */}
              <section>
                <h3 className="text-[11px] font-bold text-[#A1A1AA] mb-2 px-1 tracking-wider uppercase">혜택</h3>
                <div className="bg-white rounded-[10px] border border-[#E4E4E7] overflow-hidden">
                  <button onClick={() => navigate('/user/points')} className="w-full h-14 px-4 flex items-center justify-between border-b border-[#F4F4F5] active:bg-[#FAFAFA] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primarySoft flex items-center justify-center shrink-0">
                        <FontAwesomeIcon icon={faStar} className="text-primary text-[14px]" />
                      </div>
                      <span className="text-[14px] font-medium text-[#09090B]">내 포인트</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {pointBalance != null && <span className="text-[13px] font-bold text-primary">{pointBalance.toLocaleString()} P</span>}
                      <FontAwesomeIcon icon={faChevronRight} className="text-[#A1A1AA] text-[12px]" />
                    </div>
                  </button>
                  <button onClick={() => navigate('/user/attendance')} className="w-full h-14 px-4 flex items-center justify-between active:bg-[#FAFAFA] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primarySoft flex items-center justify-center shrink-0">
                        <FontAwesomeIcon icon={faCalendarCheck} className="text-primary text-[14px]" />
                      </div>
                      <span className="text-[14px] font-medium text-[#09090B]">출석 기록</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {streak != null && <span className="text-[13px] font-medium text-[#71717A]">연속 {streak}일</span>}
                      <FontAwesomeIcon icon={faChevronRight} className="text-[#A1A1AA] text-[12px]" />
                    </div>
                  </button>
                </div>
              </section>

              {/* 계정 관리 */}
              <section>
                <h3 className="text-[11px] font-bold text-[#A1A1AA] mb-2 px-1 tracking-wider uppercase">계정 관리</h3>
                <div className="bg-white rounded-[10px] border border-[#E4E4E7] overflow-hidden">
                  <button onClick={() => navigate('/user/profile/edit')} className="w-full h-14 px-4 flex items-center justify-between border-b border-[#F4F4F5] active:bg-[#FAFAFA] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primarySoft flex items-center justify-center shrink-0">
                        <FontAwesomeIcon icon={faUserPen} className="text-primary text-[14px]" />
                      </div>
                      <span className="text-[14px] font-medium text-[#09090B]">프로필 수정</span>
                    </div>
                    <FontAwesomeIcon icon={faChevronRight} className="text-[#A1A1AA] text-[12px]" />
                  </button>
                  <button onClick={() => navigate('/user/profile/select')} className="w-full h-14 px-4 flex items-center justify-between border-b border-[#F4F4F5] active:bg-[#FAFAFA] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primarySoft flex items-center justify-center shrink-0">
                        <FontAwesomeIcon icon={faImage} className="text-primary text-[14px]" />
                      </div>
                      <span className="text-[14px] font-medium text-[#09090B]">프로필 변경</span>
                    </div>
                    <FontAwesomeIcon icon={faChevronRight} className="text-[#A1A1AA] text-[12px]" />
                  </button>
                  <button onClick={() => navigate('/user/profile/edit')} className="w-full h-14 px-4 flex items-center justify-between border-b border-[#F4F4F5] active:bg-[#FAFAFA] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primarySoft flex items-center justify-center shrink-0">
                        <FontAwesomeIcon icon={faBullseye} className="text-primary text-[14px]" />
                      </div>
                      <span className="text-[14px] font-medium text-[#09090B]">건강 목표 설정</span>
                    </div>
                    <FontAwesomeIcon icon={faChevronRight} className="text-[#A1A1AA] text-[12px]" />
                  </button>
                  <button onClick={() => navigate('/health-checkup')} className="w-full h-14 px-4 flex items-center justify-between active:bg-[#FAFAFA] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primarySoft flex items-center justify-center shrink-0">
                        <FontAwesomeIcon icon={faNotesMedical} className="text-primary text-[14px]" />
                      </div>
                      <span className="text-[14px] font-medium text-[#09090B]">건강검진 입력</span>
                    </div>
                    <FontAwesomeIcon icon={faChevronRight} className="text-[#A1A1AA] text-[12px]" />
                  </button>
                </div>
              </section>

              {/* 계정 */}
              <section>
                <h3 className="text-[11px] font-bold text-[#A1A1AA] mb-2 px-1 tracking-wider uppercase">계정</h3>
                <div className="bg-white rounded-[10px] border border-[#E4E4E7] overflow-hidden">
                  <button onClick={handleLogout} className="w-full h-14 px-4 flex items-center justify-start border-b border-[#F4F4F5] active:bg-[#FAFAFA] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primarySoft flex items-center justify-center shrink-0">
                        <FontAwesomeIcon icon={faArrowRightFromBracket} className="text-primary text-[14px]" />
                      </div>
                      <span className="text-[14px] font-medium text-[#09090B]">로그아웃</span>
                    </div>
                  </button>
                  <button onClick={handleDeleteAccount} className="w-full h-14 px-4 flex items-center justify-start active:bg-[#FAFAFA] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                        <FontAwesomeIcon icon={faUserXmark} className="text-red-500 text-[14px]" />
                      </div>
                      <span className="text-[14px] font-medium text-red-500">회원 탈퇴</span>
                    </div>
                  </button>
                </div>
              </section>

              <p className="text-[11px] text-[#A1A1AA] text-center pt-2">Viva v1.0.0</p>
            </>
          )}
        </div>
    </MobileFrame>
  )
}

export default MyPage