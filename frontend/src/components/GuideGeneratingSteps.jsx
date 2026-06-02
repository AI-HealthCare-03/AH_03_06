// components/GuideGeneratingSteps.jsx
// 가이드 "생성 중" 단계 진행 UX (공통).
// 출력이 구조화(JSON)라 토큰 스트리밍이 불가한 가이드(수면·식단·운동·복약)에서,
// 대기 동안 단계 진행 애니메이션으로 진행 인상을 준다(실제 진행 이벤트 아님, 타이머 기반).
//
// 사용 (가이드별 프리셋은 ./guideGeneratingPresets):
//   import GuideGeneratingSteps from '../../components/GuideGeneratingSteps.jsx'
//   import { DIET_GENERATING } from '../../components/guideGeneratingPresets.js'
//   <GuideGeneratingSteps {...DIET_GENERATING} />

import { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

const DEFAULT_NOTE = '맞춤 가이드를 만들고 있어요\n보통 10~20초 정도 걸려요'

export default function GuideGeneratingSteps({ steps = [], icon, note = DEFAULT_NOTE, intervalMs = 2200 }) {
  const [stepIdx, setStepIdx] = useState(0)

  useEffect(() => {
    if (steps.length <= 1) return
    const t = setInterval(() => {
      setStepIdx((i) => Math.min(i + 1, steps.length - 1))
    }, intervalMs)
    return () => clearInterval(t)
  }, [steps.length, intervalMs])

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {icon && (
        <div className="w-14 h-14 rounded-full bg-primarySoft flex items-center justify-center">
          <FontAwesomeIcon icon={icon} className="text-primary text-[20px] animate-pulse" />
        </div>
      )}
      <div className="w-full max-w-[260px] space-y-3">
        {steps.map((label, i) => {
          const state = i < stepIdx ? 'done' : i === stepIdx ? 'active' : 'pending'
          return (
            <div key={i} className="flex items-center gap-3">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                  state === 'done'
                    ? 'bg-primary text-white'
                    : state === 'active'
                      ? 'border-2 border-primary text-primary'
                      : 'border border-borderHairline text-mute'
                }`}
              >
                {state === 'done' ? '✓' : i + 1}
              </span>
              <span className={`text-[13px] ${state === 'pending' ? 'text-mute' : 'text-textBody font-[500]'}`}>
                {label}
              </span>
            </div>
          )
        })}
      </div>
      {note && (
        <p className="text-[12px] text-mute text-center leading-relaxed whitespace-pre-line">{note}</p>
      )}
    </div>
  )
}
