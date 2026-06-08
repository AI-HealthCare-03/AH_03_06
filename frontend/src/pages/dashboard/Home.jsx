import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAccessToken } from '../../utils/token.js'
import { getTodayMedication } from '../../api/medication.js'
import { listMedicalRecords } from '../../api/medicalRecord'
import { listHealthCheckups, getHealthCheckupByYear } from '../../api/healthCheckup.js'
import { listSleepGuides, getSleepGuide } from '../../api/sleepGuides.js'
import { listDietGuideDates, getDietGuideByDate } from '../../api/dietGuides.js'
import { logout } from '../../App.jsx'
import BottomNav from '../../components/BottomNav.jsx'
import Header from '../../components/Header.jsx'
import MobileFrame from '../../components/MobileFrame.jsx'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPills,
  faUtensils,
  faPersonRunning,
  faMoon,
  faStethoscope,
  faHospital,
  faWandMagicSparkles,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons'

const base = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

const DEPT_MAP = {
  1: '내과', 2: '외과', 3: '정형외과', 4: '치과', 5: '안과', 6: '이비인후과',
  7: '피부과', 8: '산부인과', 9: '소아청소년과', 10: '신경과', 11: '정신건강의학과', 12: '비뇨기과',
}

// 건강검진 상태 분류 (HealthCheckResults와 동일 기준)
const HEALTH_STATUS_COLOR = {
  '정상': 'text-green-600 border-green-200',
  '주의': 'text-yellow-500 border-yellow-200',
  '위험': 'text-red-500 border-red-200',
}
const classifyBp = (s, d) => (s <= 120 && d <= 80) ? '정상' : (s < 130 && d < 80) ? '주의' : '위험'
const classifyGlucose = (v) => v < 100 ? '정상' : v < 126 ? '주의' : '위험'
const classifyBmi = (h, w) => {
  const bmi = (w / ((h / 100) ** 2)).toFixed(1)
  return { bmi, status: bmi < 23 ? '정상' : bmi < 25 ? '주의' : '위험' }
}

// 수면 weekly_goal 텍스트 → "권장 취침 HH:MM · 기상 HH:MM" (B안 정규식).
// 키워드("취침"·"기상") 인접 시각 우선(앞·뒤 모두 — "22:30에 취침"·"취침 22:30" 둘 다 대응),
// 실패 시 등장 순 2개, 1개 이하면 null(폴백 문구).
const _timeNear = (text, kw) => {
  const i = text.indexOf(kw)
  if (i < 0) return null
  const start = Math.max(0, i - 14)
  const win = text.slice(start, i + kw.length + 14)
  const kS = i - start, kE = kS + kw.length
  let best = null, bestGap = Infinity
  for (const m of win.matchAll(/([01]?\d|2[0-3]):[0-5]\d/g)) {
    const gap = Math.max(0, kS - (m.index + m[0].length), m.index - kE)  // 가장자리 간격
    if (gap < bestGap) { bestGap = gap; best = m[0] }
  }
  return best
}
// 식단 meal_plan_type(검진 그룹 기반, diet_service.GROUP_TO_MEAL_PLAN) → 카드용 한글.
const MEAL_PLAN_KO = {
  'Balanced Diet':                '균형 잡힌 일반 식단',
  'Low-Sodium Diet':             '저염 식단',
  'Low-Carb Diet':               '저탄수 식단',
  'Low-Calorie Diet':            '저칼로리 식단',
  'Low-Carb Low-Sodium Diet':    '저염·저탄수 식단',
  'Low-Calorie Low-Sodium Diet': '저염·저칼로리 식단',
  'Low-Carb Low-Calorie Diet':   '저탄수·저칼로리 식단',
  'Therapeutic Diet':            '맞춤 집중 관리 식단',
}

// 끼니 텍스트("**\n- 흑미밥 1/2공기 (100g)\n- 아욱국…") → "흑미밥 1/2공기 (100g), 아욱국…" (마크다운 제거)
const parseMealItems = (text) =>
  (text || '').split('\n')
    .map(s => s.replace(/\*+/g, '').replace(/^[-•\s]+/, '').trim())
    .filter(Boolean)
    .join(', ')
// 로컬(KST) 오늘 "YYYY-MM-DD"
const localToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const sleepDescFrom = (weeklyGoal) => {
  if (!weeklyGoal) return null
  const bed = _timeNear(weeklyGoal, '취침')
  const wake = _timeNear(weeklyGoal, '기상')
  if (bed && wake) return `취침 ${bed} · 기상 ${wake} 권장`
  const all = [...weeklyGoal.matchAll(/([01]?\d|2[0-3]):[0-5]\d/g)].map(m => m[0])
  if (all.length >= 2) return `취침 ${all[0]} · 기상 ${all[1]} 권장`
  return null
}

function Home() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [today, setToday] = useState(null)
  const [recentRecord, setRecentRecord] = useState(null)
  const [checkup, setCheckup] = useState(null)
  const [sleepDesc, setSleepDesc] = useState(null)   // null=폴백 문구 사용
  const [dietDesc, setDietDesc] = useState(null)
  const [dietMeals, setDietMeals] = useState([])   // 오늘 가이드일 때만 채움(아침/점심/저녁)

  useEffect(() => {
    fetch(`${base}/users/me`, {
      headers: { Authorization: `Bearer ${getAccessToken()}` }
    })
      .then(res => {
        if (res.status === 401) {
          logout()
          return
        }
        return res.json()
      })
      .then(data => data && setUser(data))
      .catch(err => console.error('error:', err))

    getTodayMedication()
      .then(res => setToday(res?.data ?? res))
      .catch(() => {})

    listMedicalRecords({ sort: 'latest' })
      .then(d => setRecentRecord((d?.medical_records ?? [])[0] ?? null))
      .catch(() => {})

    listHealthCheckups()
      .then(d => {
        const latest = (d?.checkups ?? []).slice().sort((a, b) => b.checkup_year - a.checkup_year)[0]
        if (latest) return getHealthCheckupByYear(latest.checkup_year)
      })
      .then(detail => detail && setCheckup(detail))
      .catch(() => {})

    // 수면: 최신 가이드 weekly_goal에서 취침·기상 시각 추출(없으면 폴백 유지)
    listSleepGuides()
      .then(d => {
        const latest = (d?.guides ?? [])[0]
        if (latest) return getSleepGuide(latest.guide_id)
      })
      .then(g => { const desc = sleepDescFrom(g?.weekly_goal); if (desc) setSleepDesc(desc) })
      .catch(() => {})

    // 식단: 최신 가이드의 meal_plan_type(백엔드가 검진 그룹으로 산정) → 한글 매핑(없으면 폴백)
    listDietGuideDates()
      .then(d => {
        const latest = (d?.dates ?? []).slice().sort().reverse()[0]
        if (latest) return getDietGuideByDate(latest).then(g => ({ g, date: latest }))
      })
      .then(res => {
        if (!res) return
        const ko = MEAL_PLAN_KO[res.g?.meal_plan_type]
        if (ko) setDietDesc(`${ko} 권장`)
        // 최신 가이드가 '오늘'일 때만 끼니 목록(어제 식단을 오늘처럼 보여주지 않음)
        if (res.date === localToday()) {
          const meals = [
            { label: '아침', items: parseMealItems(res.g?.breakfast) },
            { label: '점심', items: parseMealItems(res.g?.lunch) },
            { label: '저녁', items: parseMealItems(res.g?.dinner) },
          ].filter(m => m.items)   // 파싱 실패한 끼니는 그 줄만 생략
          if (meals.length) setDietMeals(meals)
        }
      })
      .catch(() => {})
  }, [])

  const nickname = user?.nickname ?? '...'

  // 오늘의 복약 요약 (실데이터)
  const medTotal = today?.totalCount ?? 0
  const medDone = today?.completedCount ?? 0
  const medRate = today?.completionRate ?? 0
  const nextPending = (today?.groups || []).find(g => g.entries?.some(e => e.completionStatus !== '완료'))
  const nextRemain = nextPending ? nextPending.entries.filter(e => e.completionStatus !== '완료').length : 0
  const medHint = medTotal === 0 ? '오늘 예정된 복약이 없어요'
    : medDone >= medTotal ? '오늘 복약 다 했어요 👏'
    : nextPending ? `${nextPending.mealTime} 약 ${nextRemain}개 남았어요`
    : `${medTotal - medDone}개 남았어요`

  // 최근 건강 수치 (실데이터 — 최신 검진)
  const bpStatus = (checkup?.bp_systolic != null && checkup?.bp_diastolic != null) ? classifyBp(checkup.bp_systolic, checkup.bp_diastolic) : null
  const glucoseStatus = checkup?.fasting_glucose != null ? classifyGlucose(checkup.fasting_glucose) : null
  const bmiResult = (checkup?.height && checkup?.weight) ? classifyBmi(checkup.height, checkup.weight) : null
  const healthMetrics = checkup ? [
    { label: '수축기 혈압', value: checkup.bp_systolic ?? '-', unit: 'mmHg', status: bpStatus },
    { label: '이완기 혈압', value: checkup.bp_diastolic ?? '-', unit: 'mmHg', status: bpStatus },
    { label: '공복혈당', value: checkup.fasting_glucose ?? '-', unit: 'mg/dL', status: glucoseStatus },
    { label: 'BMI', value: bmiResult?.bmi ?? '-', unit: '', status: bmiResult?.status },
  ] : []

  return (
    <MobileFrame
      header={<Header variant="home" nickname={nickname} />}
      bottomNav={<BottomNav />}
    >
        <main className="px-5 pt-5 pb-2 space-y-4">

          {/* 오늘의 복약 */}
          <button onClick={() => navigate('/medication?view=today')} className="w-full text-left bg-white border border-[#E4E4E7] rounded-[10px] shadow-sm p-5">
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
              <span className="text-[30px] font-[700] text-[#09090B] leading-none tracking-tight">{medDone} / {medTotal}</span>
              <span className="text-[13px] text-[#52525B] font-[500] mb-1">{medRate}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#F4F4F5] rounded-full overflow-hidden mb-3">
              <div className="h-full bg-primary rounded-full transition-all" style={{width: `${medRate}%`}}></div>
            </div>
            <p className="text-[12px] text-[#52525B] font-[500]">{medHint}</p>
          </button>

          {/* 최근 건강 수치 */}
          <section className="bg-white border border-[#E4E4E7] rounded-[10px] shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F4F4F5]">
              <h2 className="text-[14px] font-[700] text-[#18181B]">최근 건강 수치</h2>
              <button onClick={() => navigate('/health-checkup')} className="text-[12px] text-primary font-[700] cursor-pointer flex items-center gap-1">
                전체 보기 <FontAwesomeIcon icon={faChevronRight} className="text-[#2563EB] text-[10px]" />
              </button>
            </div>
            {healthMetrics.length > 0 ? (
            <div className="grid grid-cols-2 divide-x divide-y divide-[#F4F4F5]">
              {healthMetrics.map(({ label, value, unit, status }) => (
                <div key={label} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[11px] text-[#52525B] font-[500] tracking-tight">{label}</span>
                    {status && <span className={`px-1.5 py-0.5 bg-white text-[10px] font-[700] rounded border ${HEALTH_STATUS_COLOR[status]}`}>{status}</span>}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[20px] font-[700] text-[#09090B] leading-tight">{value}</span>
                    {unit && <span className="text-[10px] text-[#A1A1AA] font-[500]">{unit}</span>}
                  </div>
                </div>
              ))}
            </div>
            ) : (
              <p className="px-5 py-6 text-[13px] text-[#A1A1AA] text-center">건강검진 기록이 없어요</p>
            )}
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
                { icon: faUtensils,      title: '식단 가이드', desc: dietDesc ?? '건강 맞춤 식단 권장', path: '/diet-guides', meals: dietMeals },
                { icon: faPersonRunning, title: '운동 가이드', desc: '중간 강도 유산소 30분', path: '/exercise-guides' },
                { icon: faMoon,          title: '수면 가이드', desc: sleepDesc ?? '취침 전 카페인 회피', path: '/sleep-guides' },
              ].map(({ icon, title, desc, path, meals }) => (
                <button key={title} onClick={() => navigate(path)} className="w-full text-left bg-white border border-[#E4E4E7] rounded-[10px] shadow-sm p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-[8px] bg-white border border-[#E4E4E7] flex items-center justify-center shrink-0">
                      <FontAwesomeIcon icon={icon} className="text-[#2563EB] text-sm" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-[700] text-[#09090B] leading-tight">{title}</p>
                      <p className="text-[12px] text-[#52525B] mt-0.5 truncate">{desc}</p>
                      {/* 오늘 식단 끼니 목록(식단 카드만, 오늘 가이드일 때) — 끼니 라벨 mute·음식 subtext, 3줄 상한 */}
                      {meals?.map(m => (
                        <p key={m.label} className="text-[11px] mt-0.5 truncate">
                          <span className="text-[#71717A] font-[600]">{m.label}</span>
                          <span className="text-[#A1A1AA]"> · {m.items}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                  <FontAwesomeIcon icon={faChevronRight} className="text-[#A1A1AA] text-[11px] shrink-0 ml-2" />
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
              <button onClick={() => navigate('/medical-records')} className="text-[12px] text-primary font-[700] cursor-pointer flex items-center gap-1">
                전체 보기 <FontAwesomeIcon icon={faChevronRight} className="text-[#2563EB] text-[10px]" />
              </button>
            </div>
            {recentRecord ? (
              <button onClick={() => navigate(`/medical-records/${recentRecord.id}`)} className="w-full text-left px-5 py-4">
                <p className="text-[11px] text-[#A1A1AA] font-[500] mb-1 tracking-tight">{(recentRecord.visit_date ?? '').replace(/-/g, '.')}</p>
                <h3 className="text-[15px] font-[700] text-[#09090B] mb-1.5">{recentRecord.diagnosis_name}</h3>
                <p className="text-[12px] text-[#52525B] font-[500] flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faHospital} className="text-[#52525B] text-[11px]" />
                  {[recentRecord.hospital_name, DEPT_MAP[recentRecord.department_id]].filter(Boolean).join(' · ')}
                </p>
              </button>
            ) : (
              <p className="px-5 py-6 text-[13px] text-[#A1A1AA] text-center">최근 진료기록이 없어요</p>
            )}
          </section>

          <p className="text-[11px] text-[#A1A1AA] py-2 text-center">
            본 정보는 일반적인 권고이며 의학적 진단을 대체하지 않습니다.
          </p>

        </main>
    </MobileFrame>
  )
}

export default Home