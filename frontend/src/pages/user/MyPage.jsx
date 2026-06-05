import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAccessToken, getRefreshToken } from '../../utils/token.js'
import { logout } from '../../App.jsx'
import Header from '../../components/Header.jsx'
import BottomNav from '../../components/BottomNav.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChevronRight,
  faUserPen,
  faBullseye,
  faNotesMedical,
  faArrowRightFromBracket,
  faUserXmark,
} from '@fortawesome/free-solid-svg-icons'

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

  useEffect(() => {
    apiFetch('/users/me')
      .then(setUser)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
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
    <div className="bg-white md:bg-[#F4F4F5] w-full min-h-[100dvh] flex justify-center">
      <div className="w-full bg-white relative flex flex-col min-h-[100dvh] mx-auto md:max-w-[480px] md:rounded-[24px] md:shadow-2xl md:my-8 pb-24">

        <Header variant="default" title="마이페이지" />

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
                    <div className="w-12 h-12 rounded-full bg-[#EFF6FF] flex items-center justify-center">
                      <span className="text-[18px] font-bold text-primary">{initial}</span>
                    </div>
                    <div className="text-left">
                      <h2 className="text-[15px] font-bold text-[#18181B] tracking-tight">{nickname}</h2>
                      <p className="text-[12px] font-medium text-[#52525B] mt-0.5">{email}</p>
                    </div>
                  </div>
                  <FontAwesomeIcon icon={faChevronRight} className="text-[#A1A1AA] text-[13px]" />
                </button>
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

        <BottomNav />
      </div>
    </div>
  )
}

export default MyPage