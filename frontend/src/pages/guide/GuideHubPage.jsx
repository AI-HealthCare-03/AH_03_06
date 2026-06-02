import { useNavigate } from 'react-router-dom'
import Header from '../../components/Header.jsx'
import BottomNav from '../../components/BottomNav.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faWandMagicSparkles,
  faUtensils,
  faPersonRunning,
  faMoon,
  faPills,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons'

// TODO: 각 가이드의 한 줄 요약(desc)은 추후 '오늘의 가이드' 응답에서 받아 채움.
//       path는 각 가이드 진입 경로
const guides = [
  { title: '식단 가이드', desc: '혈압 관리 저염식 권장', icon: faUtensils, path: '/diet-guides' },
  { title: '운동 가이드', desc: '중간 강도 유산소 30분', icon: faPersonRunning, path: '/exercise-guides' },
  { title: '수면 가이드', desc: '내 수면 패턴 AI 분석·코칭', icon: faMoon, path: '/sleep-guides' },
  { title: '복약 가이드', desc: '내 처방약별 AI 복약 안내', icon: faPills, path: '/medication-guides' },
]

function GuideHubPage() {
  const navigate = useNavigate()

  return (
    <div className="bg-white md:bg-[#F4F4F5] w-full min-h-[100dvh] flex justify-center">
      <div className="w-full bg-white relative flex flex-col min-h-[100dvh] mx-auto md:max-w-[480px] md:rounded-[24px] md:shadow-2xl md:my-8 pb-24">

        {/* 탭 최상위 화면: 좌측 정렬 제목 헤더 (뒤로가기 없음 — 마이페이지와 동일 규칙) */}
        <Header variant="default" title="가이드" />

        <main className="px-5 pt-5 pb-2 space-y-4">

          {/* 섹션 헤더 — 홈의 '오늘의 AI 가이드'와 동일 톤 */}
          <div className="flex items-center gap-2 mt-1">
            <FontAwesomeIcon icon={faWandMagicSparkles} className="text-primary text-[15px]" />
            <h2 className="text-[16px] font-[700] text-textHeading">오늘의 AI 가이드</h2>
            <span className="ml-auto px-2 py-0.5 bg-primarySoft text-primary text-[10px] font-[700] rounded tracking-wider">
              AI
            </span>
          </div>

          {/* 가이드 진입 카드 — 홈 화면 카드와 동일 구조 (아이콘 박스 + 제목/요약 + chevron) */}
          <div className="space-y-3">
            {guides.map(({ title, desc, icon, path }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="w-full bg-white border border-borderHairline rounded-[10px] p-4 flex items-center gap-3 active:bg-bgSubtle transition-colors"
              >
                <div className="w-11 h-11 rounded-[10px] bg-borderLight flex items-center justify-center shrink-0">
                  <FontAwesomeIcon icon={icon} className="text-[18px] text-textHeading" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <h3 className="text-[15px] font-[700] text-textHeading">{title}</h3>
                  <p className="text-[13px] text-subtext mt-0.5 truncate">{desc}</p>
                </div>
                <FontAwesomeIcon icon={faChevronRight} className="text-[14px] text-mute shrink-0" />
              </button>
            ))}
          </div>

        </main>

        <BottomNav />
      </div>
    </div>
  )
}

export default GuideHubPage
