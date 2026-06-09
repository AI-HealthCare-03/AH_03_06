import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/Header.jsx'
import BottomNav from '../../components/BottomNav.jsx'
import MobileFrame from '../../components/MobileFrame.jsx'
import { listSleepGuides, getSleepGuide } from '../../api/sleepGuides.js'
import { listDietGuideDates, getDietGuideByDate } from '../../api/dietGuides.js'
import { sleepDescFrom, dietDescFrom, pickGuideDate } from '../../utils/guideSummary.js'
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
  const [sleepDesc, setSleepDesc] = useState(null)   // null=하드코딩 폴백
  const [dietDesc, setDietDesc] = useState(null)

  useEffect(() => {
    // 수면: 최신 가이드 weekly_goal → 취침·기상 시각
    listSleepGuides()
      .then(d => { const latest = (d?.guides ?? [])[0]; if (latest) return getSleepGuide(latest.guide_id) })
      .then(g => { const desc = sleepDescFrom(g?.weekly_goal); if (desc) setSleepDesc(desc) })
      .catch(() => {})
    // 식단: 최신 가이드 meal_plan_type → 한글 유형 권장
    listDietGuideDates()
      .then(d => { const date = pickGuideDate(d?.dates); if (date) return getDietGuideByDate(date) })
      .then(g => { const dd = dietDescFrom(g?.meal_plan_type); if (dd) setDietDesc(dd) })
      .catch(() => {})
  }, [])

  return (
    <MobileFrame
      header={<Header variant="default" title="가이드" />}
      bottomNav={<BottomNav />}
    >
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
            {guides.map(({ title, desc, icon, path }) => {
              // 식단·수면만 실데이터로 교체(없으면 하드코딩 폴백). 운동·복약은 그대로.
              const realDesc = title === '식단 가이드' ? (dietDesc ?? desc)
                : title === '수면 가이드' ? (sleepDesc ?? desc)
                : desc
              return (
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
                  <p className="text-[13px] text-subtext mt-0.5 truncate">{realDesc}</p>
                </div>
                <FontAwesomeIcon icon={faChevronRight} className="text-[14px] text-mute shrink-0" />
              </button>
              )
            })}
          </div>

        </main>
    </MobileFrame>
  )
}

export default GuideHubPage
