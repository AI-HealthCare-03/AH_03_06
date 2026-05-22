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
  faBell,
  faCircleQuestion,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons'

const MENU = [
  {
    category: '건강 기록',
    items: [
      { icon: faStethoscope,               title: '진료기록',      desc: '진료받은 기록 모아보기',   path: '/medical-records', primary: true },
      { icon: faHeartPulse,                title: '건강검진 결과', desc: '혈압·혈당 등 수치 확인',   path: '/health-checkup', primary: true },

    ]
  },
  {
    category: '바로가기',
    items: [
      { icon: faPrescriptionBottleMedical, title: '복약 등록',   desc: '새로운 약 추가하기',         path: '/medication', primary: true },
      { icon: faListCheck,                 title: '오늘의 체크', desc: '오늘 복용한 약 체크하기',    path: '/medication', primary: true },
      { icon: faBookMedical,               title: '가이드 모음', desc: '식단·운동·수면 가이드 보기', path: '/guide',      primary: true },
    ]
  },
  {
    category: '기타',
    items: [
      { icon: faBell,           title: '알림',   desc: '알림 설정 관리하기',  path: '/notifications', primary: false },
      { icon: faCircleQuestion, title: '도움말', desc: '자주 묻는 질문 보기', path: '/help',          primary: false },
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
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 ${primary ? 'bg-[#EFF6FF]' : 'bg-[#FAFAFA]'}`}>
                        <FontAwesomeIcon icon={icon} className={`text-[16px] ${primary ? 'text-[#2563EB]' : 'text-[#52525B]'}`} />
                      </div>
                      <div>
                        <h3 className="text-[14px] font-[700] text-[#09090B] leading-tight">{title}</h3>
                        <p className="text-[12px] text-[#52525B] font-[500] mt-0.5">{desc}</p>
                      </div>
                    </div>
                    <FontAwesomeIcon icon={faChevronRight} className="text-[#A1A1AA] text-[11px]" />
                  </button>
                ))}
              </div>
            </section>
          ))}

          <p className="text-[11px] text-[#A1A1AA] pt-4 pb-2 text-center">
            본 정보는 일반적인 권고이며 의학적 진단을 대체하지 않습니다.
          </p>

        </main>

        <BottomNav />
      </div>
    </div>
  )
}

export default All