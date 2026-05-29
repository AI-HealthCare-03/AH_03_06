// src/pages/all/All.jsx
// 변경: 바로가기 섹션에 '복약 기록' 항목 추가

import { useNavigate } from 'react-router-dom'
import BottomNav from '../../components/BottomNav.jsx'
import Header from '../../components/Header.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faStethoscope,
  faHeartPulse,
  faPrescriptionBottleMedical,
  faListCheck,
  faBookMedical,
  faClipboardList,   // ✅ 복약 기록 아이콘 추가
  faBell,
  faCircleQuestion,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons'

const MENU = [
  {
    category: '건강 기록',
    items: [
      { icon: faStethoscope,  title: '진료기록',      desc: '진료받은 기록 모아보기',   path: '/medical-records', primary: true },
      { icon: faHeartPulse,   title: '건강검진 결과', desc: '혈압·혈당 등 수치 확인',   path: '/health-checkup',  primary: true },
    ]
  },
  {
    category: '바로가기',
    items: [
      { icon: faPrescriptionBottleMedical, title: '복약 관리', desc: '복약 목록 관리하기', path: '/medication', primary: true },
      { icon: faListCheck,                 title: '오늘의 체크', desc: '오늘 복용한 약 체크하기',   path: '/medication',        primary: true },
      { icon: faClipboardList,             title: '복약 기록',  desc: '날짜별 복약 기록 확인하기', path: '/medication/record', primary: true },  // ✅ 추가
      { icon: faBookMedical,               title: '가이드 모음', desc: '식단·운동·수면 가이드 보기', path: '/guide',            primary: true },
    ]
  },
  {
    category: '기타',
    items: [
      { icon: faBell,           title: '알림',   desc: '알림 설정 관리', path: '/notifications', primary: false },
      { icon: faCircleQuestion, title: '도움말', desc: '자주 묻는 질문', path: '/help',          primary: false },
    ]
  },
]

function All() {
  const navigate = useNavigate()

  return (
    <div className="bg-[#FAFAFA] w-full min-h-[100dvh] flex justify-center">
      <div className="w-full bg-[#FAFAFA] relative flex flex-col min-h-[100dvh] mx-auto md:max-w-[480px] pb-24">

        <Header variant="default" title="전체" />

        <main className="px-5 pt-6 pb-2 space-y-6">
          {MENU.map(({ category, items }) => (
            <section key={category}>
              <h2 className="text-[13px] font-[700] text-[#52525B] mb-3 px-1 tracking-tight">{category}</h2>
              <div className="bg-white border border-[#E4E4E7] rounded-[12px] shadow-sm overflow-hidden">
                {items.map(({ icon, title, desc, path, primary }, idx) => (
                  <button
                    key={title}
                    onClick={() => navigate(path)}
                    className={`w-full text-left px-5 py-4 flex items-center justify-between hover:bg-[#FAFAFA] transition-colors ${idx < items.length - 1 ? 'border-b border-[#F4F4F5]' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center
                        ${primary ? 'bg-[#EFF6FF]' : 'bg-[#F4F4F5]'}`}>
                        <FontAwesomeIcon
                          icon={icon}
                          className={`text-[16px] ${primary ? 'text-[#2563EB]' : 'text-[#A1A1AA]'}`}
                        />
                      </div>
                      <div>
                        <p className="text-[14px] font-[600] text-[#09090B]">{title}</p>
                        <p className="text-[12px] text-[#A1A1AA] mt-0.5">{desc}</p>
                      </div>
                    </div>
                    <FontAwesomeIcon icon={faChevronRight} className="text-[13px] text-[#D4D4D8]" />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </main>

        <BottomNav />
      </div>
    </div>
  )
}

export default All
