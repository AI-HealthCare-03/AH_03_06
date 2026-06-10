// 홈·가이드허브 공용 — 가이드 카드 한 줄 요약 생성.

// 수면 weekly_goal 텍스트 → "취침 HH:MM · 기상 HH:MM 권장".
// 키워드("취침"·"기상") 인접 시각 우선(앞·뒤 가장자리 간격 — "22:30에 취침"·"취침 22:30" 둘 다 대응),
// 실패 시 등장 순 2개, 1개 이하면 null(호출부가 폴백 문구 사용).
const _timeNear = (text, kw) => {
  const i = text.indexOf(kw)
  if (i < 0) return null
  const start = Math.max(0, i - 14)
  const win = text.slice(start, i + kw.length + 14)
  const kS = i - start, kE = kS + kw.length
  let best = null, bestGap = Infinity
  for (const m of win.matchAll(/([01]?\d|2[0-3]):[0-5]\d/g)) {
    const gap = Math.max(0, kS - (m.index + m[0].length), m.index - kE)
    if (gap < bestGap) { bestGap = gap; best = m[0] }
  }
  return best
}

export const sleepDescFrom = (weeklyGoal) => {
  if (!weeklyGoal) return null
  const bed = _timeNear(weeklyGoal, '취침')
  const wake = _timeNear(weeklyGoal, '기상')
  if (bed && wake) return `취침 ${bed} · 기상 ${wake} 권장`
  const all = [...weeklyGoal.matchAll(/([01]?\d|2[0-3]):[0-5]\d/g)].map(m => m[0])
  if (all.length >= 2) return `취침 ${all[0]} · 기상 ${all[1]} 권장`
  return null
}

// 식단 meal_plan_type(검진 그룹 기반, diet_service.GROUP_TO_MEAL_PLAN) → "OO 식단 권장" (미매핑이면 null).
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

export const dietDescFrom = (mealPlanType) => {
  const ko = MEAL_PLAN_KO[mealPlanType]
  return ko ? `${ko} 권장` : null
}

// 운동 cvd_range(4단계: low/moderate/high/very_high) → 개인화 한 줄 요약. 미매핑이면 null(폴백).
const EXERCISE_DESC_KO = {
  low:       '고강도 운동 가능',
  moderate:  '중강도 유산소 권장',
  high:      '저강도 운동 권장',
  very_high: '운동 제한 · 의료진 상담',
}

export const exerciseDescFrom = (cvdRange) => EXERCISE_DESC_KO[cvdRange] ?? null

// 로컬(KST) 오늘 "YYYY-MM-DD"
export const localToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// dates 목록에서 표시 기준 날짜 — 오늘이 있으면 오늘, 없으면 최신.
export const pickGuideDate = (dates) => {
  const list = dates ?? []
  const today = localToday()
  return list.includes(today) ? today : list.slice().sort().reverse()[0]
}
