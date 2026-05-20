import { useState, useEffect } from 'react'
import { getAccessToken } from '../../utils/token.js'
import BottomNav from '../../components/BottomNav.jsx'
import Header from '../../components/Header.jsx'

// FontAwesome imports
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPills,          // PillIcon
  faUtensils,       // ForkIcon
  faPersonRunning,  // RunIcon
  faMoon,           // MoonIcon
  faStethoscope,    // StethoscopeIcon
  faHospital,       // HospitalIcon
  faWandMagicSparkles,       // SparkleIcon (Pro) or faStars
  faChevronRight,   // ChevronRight
  faCircleInfo,     // InfoIcon
} from '@fortawesome/free-solid-svg-icons'

const base = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

function Home() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    fetch(`${base}/users/me`, {
      headers: { Authorization: `Bearer ${getAccessToken()}` }
    })
      .then(res => res.json())
      .then(data => setUser(data))
      .catch(err => console.log('error:', err))
  }, [])

  const nickname = user?.nickname ?? '...'

  return (
    <div className="bg-white md:bg-[#F4F4F5] w-full min-h-[100dvh] flex justify-center">
      <div className="w-full bg-white relative flex flex-col min-h-[100dvh] mx-auto md:max-w-[480px] md:rounded-[24px] md:shadow-2xl md:my-8 pb-24">

        <Header variant="home" nickname={nickname} />

        <main className="px-5 pt-5 pb-2 space-y-4">

          {/* 오늘의 복약 */}
          <button className="w-full text-left bg-white border border-[#E4E4E7] rounded-[10px] shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-[8px] bg-[#EFF6FF] flex items-center justify-center">
                  <FontAwesomeIcon icon={faPills} className="text-[#2563EB] text-sm" />
                </div>
                <h2 className="text-[14px] font-[700] text-[#18181B]">오늘의 복약</h2>
              </div>
              <FontAwesomeIcon icon={faChevronRight} className="text-[#A1A1AA] text-[11px]" />
            </div>
            <div className="flex items-end gap-2 mb-3">
              <span className="text-[30px] font-[700] text-[#09090B] leading-none tracking-tight">3 / 4</span>
              <span className="text-[13px] text-[#52525B] font-[500] mb-1">75%</span>
            </div>
            <div className="w-full h-1.5 bg-[#F4F4F5] rounded-full overflow-hidden mb-3">
              <div className="h-full bg-primary rounded-full" style={{width: '75%'}}></div>
            </div>
            <p className="text-[12px] text-[#52525B] font-[500]">저녁 약 1개 남았어요</p>
          </button>

          {/* 최근 건강 수치 */}
          <section className="bg-white border border-[#E4E4E7] rounded-[10px] shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F4F4F5]">
              <h2 className="text-[14px] font-[700] text-[#18181B]">최근 건강 수치</h2>
              <span className="text-[12px] text-primary font-[700] cursor-pointer flex items-center gap-1">
                전체 보기 <FontAwesomeIcon icon={faChevronRight} className="text-[#2563EB] text-[10px]" />
              </span>
            </div>
            <div className="grid grid-cols-2 divide-x divide-y divide-[#F4F4F5]">
              {[
                { label: '수축기 혈압', value: '120', unit: 'mmHg', status: '주의', statusColor: 'text-yellow-500 border-yellow-200' },
                { label: '이완기 혈압', value: '80', unit: 'mmHg', status: '주의', statusColor: 'text-yellow-500 border-yellow-200' },
                { label: '공복혈당', value: '95', unit: 'mg/dL', status: '정상', statusColor: 'text-green-600 border-green-200' },
                { label: 'BMI', value: '23.5', unit: '', status: '주의', statusColor: 'text-yellow-500 border-yellow-200' },
              ].map(({ label, value, unit, status, statusColor }) => (
                <div key={label} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[11px] text-[#52525B] font-[500] tracking-tight">{label}</span>
                    <span className={`px-1.5 py-0.5 bg-white text-[10px] font-[700] rounded border ${statusColor}`}>{status}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[20px] font-[700] text-[#09090B] leading-tight">{value}</span>
                    {unit && <span className="text-[10px] text-[#A1A1AA] font-[500]">{unit}</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 오늘의 AI 가이드 */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between px-1 pt-1">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faWandMagicSparkles} className="text-[#2563EB] text-sm" />
                <h2 className="text-[14px] font-[700] text-[#18181B]">오늘의 AI 가이드</h2>
              </div>
              <span className="px-2 py-0.5 bg-[#EFF6FF] text-primary text-[10px] font-[700] rounded tracking-wider">AI</span>
            </div>
            <div className="space-y-2">
              {[
                { icon: faUtensils,       title: '식단 가이드', desc: '혈압 관리 저염식 권장' },
                { icon: faPersonRunning,  title: '운동 가이드', desc: '중간 강도 유산소 30분' },
                { icon: faMoon,           title: '수면 가이드', desc: '취침 전 카페인 회피' },
              ].map(({ icon, title, desc }) => (
                <button key={title} className="w-full text-left bg-white border border-[#E4E4E7] rounded-[10px] shadow-sm p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[8px] bg-white border border-[#E4E4E7] flex items-center justify-center">
                      <FontAwesomeIcon icon={icon} className="text-[#2563EB] text-sm" />
                    </div>
                    <div>
                      <p className="text-[14px] font-[700] text-[#09090B] leading-tight">{title}</p>
                      <p className="text-[12px] text-[#52525B] mt-0.5">{desc}</p>
                    </div>
                  </div>
                  <FontAwesomeIcon icon={faChevronRight} className="text-[#A1A1AA] text-[11px]" />
                </button>
              ))}
            </div>
          </section>

          {/* 최근 진료기록 */}
          <section className="bg-white border border-[#E4E4E7] rounded-[10px] shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F4F4F5]">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faStethoscope} className="text-[#2563EB] text-sm" />
                <h2 className="text-[14px] font-[700] text-[#18181B]">최근 진료기록</h2>
              </div>
              <span className="text-[12px] text-primary font-[700] cursor-pointer flex items-center gap-1">
                전체 보기 <FontAwesomeIcon icon={faChevronRight} className="text-[#2563EB] text-[10px]" />
              </span>
            </div>
            <button className="w-full text-left px-5 py-4">
              <p className="text-[11px] text-[#A1A1AA] font-[500] mb-1 tracking-tight">2026.05.02 (목)</p>
              <h3 className="text-[15px] font-[700] text-[#09090B] mb-1.5">감기·몸살</h3>
              <p className="text-[12px] text-[#52525B] font-[500] flex items-center gap-1.5">
                <FontAwesomeIcon icon={faHospital} className="text-[#52525B] text-[11px]" />
                서울내과의원 · 내과
              </p>
            </button>
          </section>

          {/* 면책 문구 */}
          <p className="text-[11px] text-[#A1A1AA] py-2 text-center">
            본 정보는 일반적인 권고이며 의학적 진단을 대체하지 않습니다.
          </p>

        </main>

        <BottomNav />

      </div>
    </div>
  )
}

export default Home