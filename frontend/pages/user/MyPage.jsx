import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAccessToken, getRefreshToken, clearTokens } from '../../utils/token.js'

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
      clearTokens()
      navigate('/login', { replace: true })
    }
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm('정말 탈퇴하시겠어요? 모든 데이터가 삭제됩니다.')) return
    try {
      await apiFetch('/users/me', { method: 'DELETE', body: JSON.stringify({}) })
      clearTokens()
      navigate('/login', { replace: true })
    } catch (err) {
      alert(err.message)
    }
  }

  const nickname = user?.nickname ?? '...'
  const email = user?.email ?? '...'
  const initial = nickname.charAt(0)

  return (
    <div className="bg-white md:bg-[#F4F4F5] w-full min-h-[100dvh] flex justify-center">
      <div className="w-full bg-white relative flex flex-col min-h-[100dvh] mx-auto md:max-w-[480px] md:rounded-[24px] md:shadow-2xl md:my-8 pb-24">

        {/* 헤더 */}
        <header className="sticky top-0 z-40 bg-white border-b border-[#F4F4F5] px-5 h-14 flex items-center justify-center">
          <h1 className="text-[15px] font-bold text-[#18181B] tracking-tight">마이페이지</h1>
        </header>

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
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </button>
              </section>

              {/* 계정 관리 */}
              <section>
                <h3 className="text-[11px] font-bold text-[#A1A1AA] mb-2 px-1 tracking-wider uppercase">계정 관리</h3>
                <div className="bg-white rounded-[10px] border border-[#E4E4E7] overflow-hidden">
                  <button
                    onClick={() => navigate('/user/profile/edit')}
                    className="w-full h-14 px-4 flex items-center justify-between border-b border-[#F4F4F5] active:bg-[#FAFAFA] transition-colors"
                  >
                    <span className="text-[14px] font-medium text-[#09090B]">프로필 수정</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => navigate('/user/health-goals')}
                    className="w-full h-14 px-4 flex items-center justify-between border-b border-[#F4F4F5] active:bg-[#FAFAFA] transition-colors"
                  >
                    <span className="text-[14px] font-medium text-[#09090B]">건강 목표 설정</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => navigate('/health-checkup')}
                    className="w-full h-14 px-4 flex items-center justify-between active:bg-[#FAFAFA] transition-colors"
                  >
                    <span className="text-[14px] font-medium text-[#09090B]">건강검진 입력</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                  </button>
                </div>
              </section>

              {/* 알림 */}
              <section>
                <h3 className="text-[11px] font-bold text-[#A1A1AA] mb-2 px-1 tracking-wider uppercase">알림</h3>
                <div className="bg-white rounded-[10px] border border-[#E4E4E7] overflow-hidden">
                  <button
                    onClick={() => navigate('/user/notifications')}
                    className="w-full h-14 px-4 flex items-center justify-between active:bg-[#FAFAFA] transition-colors"
                  >
                    <span className="text-[14px] font-medium text-[#09090B]">알림 설정</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                  </button>
                </div>
              </section>

              {/* 계정 */}
              <section>
                <h3 className="text-[11px] font-bold text-[#A1A1AA] mb-2 px-1 tracking-wider uppercase">계정</h3>
                <div className="bg-white rounded-[10px] border border-[#E4E4E7] overflow-hidden">
                  <button
                    onClick={() => navigate('/user/social')}
                    className="w-full h-14 px-4 flex items-center justify-between border-b border-[#F4F4F5] active:bg-[#FAFAFA] transition-colors"
                  >
                    <span className="text-[14px] font-medium text-[#09090B]">소셜 로그인 연동</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full h-14 px-4 flex items-center justify-start border-b border-[#F4F4F5] active:bg-[#FAFAFA] transition-colors"
                  >
                    <span className="text-[14px] font-medium text-[#09090B]">로그아웃</span>
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    className="w-full h-14 px-4 flex items-center justify-start active:bg-[#FAFAFA] transition-colors"
                  >
                    <span className="text-[14px] font-medium text-red-500">회원 탈퇴</span>
                  </button>
                </div>
              </section>

              <p className="text-[11px] text-[#A1A1AA] text-center pt-2">Viva v1.0.0</p>
            </>
          )}
        </div>

        {/* 하단 네비게이션 */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full md:max-w-[480px] bg-white border-t border-[#E4E4E7] z-50">
          <div className="flex justify-around py-2">
            {[
              { icon: '🏠', label: '홈', path: '/home' },
              { icon: '📋', label: '진료기록', path: '/medical-record' },
              { icon: '💊', label: '가이드', path: '/guide' },
              { icon: '👤', label: '마이', path: '/user' },
            ].map(({ icon, label, path }) => (
              <button
                key={label}
                onClick={() => navigate(path)}
                className="flex flex-col items-center gap-1 px-4 py-1"
              >
                <span className="text-[20px]">{icon}</span>
                <span className={`text-[10px] font-medium ${label === '마이' ? 'text-primary' : 'text-[#A1A1AA]'}`}>{label}</span>
              </button>
            ))}
          </div>
        </nav>

      </div>
    </div>
  )
}

export default MyPage