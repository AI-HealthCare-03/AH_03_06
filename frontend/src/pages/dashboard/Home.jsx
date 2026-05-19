import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAccessToken } from '../../utils/token.js'

const base = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

function Home() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)

  useEffect(() => {
    console.log('base:', base)
    console.log('token:', getAccessToken())
    fetch(`${base}/users/me`, {
      headers: { Authorization: `Bearer ${getAccessToken()}` }
    })
      .then(res => {
        console.log('status:', res.status)
        return res.json()
      })
      .then(data => {
        console.log('user data:', data)
        setUser(data)
      })
      .catch(err => console.log('error:', err))
  }, [])

  const nickname = user?.nickname ?? '...'

  return (
    <div className="bg-white md:bg-[#F4F4F5] w-full min-h-[100dvh] flex justify-center">
      <div className="w-full bg-white relative flex flex-col min-h-[100dvh] mx-auto md:max-w-[480px] md:rounded-[24px] md:shadow-2xl md:my-8 pb-24">

        {/* 헤더 */}
        <header className="sticky top-0 z-40 bg-white border-b border-[#F4F4F5] px-5 h-[72px] flex items-center justify-between">
          <div>
            <h1 className="text-[17px] font-bold text-[#18181B] leading-tight tracking-tight">안녕하세요, {nickname}님 👋</h1>
            <p className="text-[12px] text-[#52525B] mt-0.5">오늘도 건강한 하루 보내세요</p>
          </div>
          <button className="relative w-10 h-10 flex items-center justify-center text-[#09090B] rounded-[8px]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
          </button>
        </header>

        {/* 메인 */}
        <main className="px-5 pt-5 pb-2 space-y-4">

          {/* 오늘의 복약 */}
          <button className="w-full text-left bg-white border border-[#E4E4E7] rounded-[10px] shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-[8px] bg-[#EFF6FF] flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                  </svg>
                </div>
                <h2 className="text-[14px] font-bold text-[#18181B]">오늘의 복약</h2>
              </div>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </div>
            <div className="flex items-end gap-2 mb-3">
              <span className="text-[30px] font-bold text-[#09090B] leading-none tracking-tight">3 / 4</span>
              <span className="text-[13px] text-[#52525B] font-medium mb-1">75%</span>
            </div>
            <div className="w-full h-1.5 bg-[#F4F4F5] rounded-full overflow-hidden mb-3">
              <div className="h-full bg-primary rounded-full" style={{width: '75%'}}></div>
            </div>
            <p className="text-[12px] text-[#52525B] font-medium">저녁 약 1개 남았어요</p>
          </button>

          {/* 최근 건강 수치 */}
          <section className="bg-white border border-[#E4E4E7] rounded-[10px] shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F4F4F5]">
              <h2 className="text-[14px] font-bold text-[#18181B]">최근 건강 수치</h2>
              <span className="text-[12px] text-primary font-bold cursor-pointer">전체 보기 →</span>
            </div>
            <div className="grid grid-cols-2 divide-x divide-y divide-[#F4F4F5]">
              {[
                { label: '수축기 혈압', value: '120', unit: 'mmHg', status: '주의', color: 'text-yellow-500 border-yellow-200' },
                { label: '이완기 혈압', value: '80', unit: 'mmHg', status: '주의', color: 'text-yellow-500 border-yellow-200' },
                { label: '공복혈당', value: '95', unit: 'mg/dL', status: '정상', color: 'text-green-600 border-green-200' },
                { label: 'BMI', value: '23.5', unit: '', status: '주의', color: 'text-yellow-500 border-yellow-200' },
              ].map(({ label, value, unit, status, color }) => (
                <div key={label} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[11px] text-[#52525B] font-medium">{label}</span>
                    <span className={`px-1.5 py-0.5 bg-white text-[10px] font-bold rounded border ${color}`}>{status}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[20px] font-bold text-[#09090B] leading-tight">{value}</span>
                    {unit && <span className="text-[10px] text-[#A1A1AA] font-medium">{unit}</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 오늘의 AI 가이드 */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[14px] font-bold text-[#18181B]">오늘의 AI 가이드</h2>
              <span className="px-2 py-0.5 bg-[#EFF6FF] text-primary text-[11px] font-bold rounded">AI</span>
            </div>
            <div className="space-y-2">
              {[
                { icon: '🍽️', title: '식단 가이드', desc: '혈압 관리 저염식 권장' },
                { icon: '🏃', title: '운동 가이드', desc: '중간 강도 유산소 30분' },
                { icon: '🌙', title: '수면 가이드', desc: '취침 전 카페인 회피' },
              ].map(({ icon, title, desc }) => (
                <button key={title} className="w-full text-left bg-white border border-[#E4E4E7] rounded-[10px] shadow-sm p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[10px] bg-[#F4F4F5] flex items-center justify-center text-[18px]">{icon}</div>
                    <div>
                      <p className="text-[14px] font-bold text-[#18181B]">{title}</p>
                      <p className="text-[12px] text-[#52525B]">{desc}</p>
                    </div>
                  </div>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </button>
              ))}
            </div>
          </section>

          {/* 최근 진료기록 */}
          <section className="bg-white border border-[#E4E4E7] rounded-[10px] shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F4F4F5]">
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
                <h2 className="text-[14px] font-bold text-[#18181B]">최근 진료기록</h2>
              </div>
              <span className="text-[12px] text-primary font-bold cursor-pointer">전체 보기 →</span>
            </div>
            <div className="px-5 py-4">
              <p className="text-[11px] text-[#52525B] mb-1">2026.05.02 (목)</p>
              <p className="text-[15px] font-bold text-[#18181B] mb-1">감기·몸살</p>
              <p className="text-[12px] text-[#52525B]">🏥 서울내과의원 · 내과</p>
            </div>
          </section>

          {/* 면책 문구 */}
          <p className="text-[11px] text-[#A1A1AA] text-center py-2">ⓘ 본 정보는 일반적인 권고이며 의학적 진단을 대체하지 않습니다.</p>

        </main>

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
                <span className={`text-[10px] font-medium ${label === '홈' ? 'text-primary' : 'text-[#A1A1AA]'}`}>{label}</span>
              </button>
            ))}
          </div>
        </nav>

      </div>
    </div>
  )
}

export default Home