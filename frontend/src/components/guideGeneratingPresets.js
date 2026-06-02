// components/guideGeneratingPresets.js
// 가이드별 "생성 중" 단계 프리셋 (아이콘·단계 문구). GuideGeneratingSteps 와 함께 사용.
// 아이콘은 GuideHubPage 컨벤션과 동일: 식단=utensils, 운동=running, 수면=moon, 복약=pills.
//
//   <GuideGeneratingSteps {...DIET_GENERATING} />

import { faUtensils, faPersonRunning, faMoon, faPills } from '@fortawesome/free-solid-svg-icons'

export const DIET_GENERATING = {
  icon: faUtensils,
  steps: [
    '건강검진 결과를 분석하고 있어요',
    '영양 가이드라인을 검토하고 있어요',
    '맞춤 식단을 작성하고 있어요',
  ],
}

export const EXERCISE_GENERATING = {
  icon: faPersonRunning,
  steps: [
    '건강 상태를 분석하고 있어요',
    '운동 가이드라인을 검토하고 있어요',
    '맞춤 운동 코칭을 작성하고 있어요',
  ],
}

export const SLEEP_GENERATING = {
  icon: faMoon,
  steps: [
    '수면 패턴을 분석하고 있어요',
    '임상 가이드라인을 검토하고 있어요',
    '맞춤 수면 코칭을 작성하고 있어요',
  ],
}

export const MEDICATION_GENERATING = {
  icon: faPills,
  steps: [
    '처방 정보를 확인하고 있어요',
    '식약처 자료를 검토하고 있어요',
    '맞춤 복약 안내를 작성하고 있어요',
  ],
}
