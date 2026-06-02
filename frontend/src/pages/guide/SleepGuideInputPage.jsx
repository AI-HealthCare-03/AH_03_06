import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/Header.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMinus, faPlus, faMoon } from '@fortawesome/free-solid-svg-icons'
import { generateSleepGuide, fetchCaffeineTypes } from '../../api/sleepGuides.js'
import GuideGeneratingSteps from '../../components/GuideGeneratingSteps.jsx'
import { SLEEP_GENERATING } from '../../components/guideGeneratingPresets.js'

const TOTAL_STEPS = 5

// 단축 수면 설문 5문항 (PSQI-K 기반 자체 단축형)
const BRIEF_QUESTIONS = [
  '지난 1주일간, 잠드는 데 30분 이상 걸린 적이 있었나요?',
  '지난 1주일간, 자는 중간에 깬 뒤 다시 잠들기 어려웠나요?',
  '지난 1주일간, 원했던 시간보다 너무 일찍 깨어 다시 잠들기 어려웠나요?',
  '지난 1주일간, 전반적인 수면의 질은 어땠나요?',
  '지난 1주일간, 졸림이나 피로가 낮 활동에 지장을 주었나요?',
]
const BRIEF_OPTIONS = ['없음', '주 1회 미만', '주 1~2회', '주 3회 이상']
const BRIEF_OPTIONS_Q4 = ['매우 좋음', '좋음', '나쁨', '매우 나쁨']  // 4번 문항 전용

// 수면 방해 원인 8개 (시안 라벨)
const DISTURBANCE_CAUSES = [
  '스트레스·걱정', '소음·환경', '스마트폰·화면', '통증·신체 불편',
  '카페인 섭취', '온도·습도', '불규칙한 일정', '기타',
]

// ESS 졸림 척도 8문항
const ESS_QUESTIONS = [
  '앉아서 책을 읽을 때',
  'TV를 볼 때',
  '공공장소에서 가만히 앉아 있을 때 (회의·영화관 등)',
  '차에서 1시간 동안 쉬지 않고 동승했을 때',
  '오후에 쉬려고 누워 있을 때',
  '앉아서 누군가와 이야기할 때',
  '점심 식사 후 (술 없이) 조용히 앉아 있을 때',
  '운전 중 신호 대기로 잠시 멈췄을 때',
]
const ESS_OPTIONS = ['전혀 없음', '약간 있음', '보통', '많이 있음']


function ProgressBar({ step }) {
  return (
    <div className="px-5 pt-2 pb-1">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-mute font-medium">수면 가이드</span>
        <span className="text-xs font-semibold text-primary">{step} / {TOTAL_STEPS}</span>
      </div>
      <div className="flex gap-1.5 h-1.5 w-full">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div
            key={i}
            className={`h-full flex-1 rounded-full transition-colors ${i < step ? 'bg-primary' : 'bg-[#E4E4E7]'}`}
          />
        ))}
      </div>
    </div>
  )
}


function TimeField({ label, value, onChange }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-textHeading">{label}</span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 px-3 border border-borderHairline rounded-[10px] text-[15px] text-textBody focus:border-primary focus:outline-none focus:ring-2 focus:ring-primarySoft transition-all"
      />
    </label>
  )
}


function ChoiceRow({ options, value, onSelect }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((opt, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => onSelect(idx)}
          className={
            value === idx
              ? 'h-11 rounded-[10px] text-[13px] font-semibold bg-primarySoft border border-primary text-primary transition-colors'
              : 'h-11 rounded-[10px] text-[13px] font-medium bg-white border border-borderHairline text-textBody transition-colors'
          }
        >
          {opt}
        </button>
      ))}
    </div>
  )
}


// 수면 가이드 "생성 중" 화면 — 공통 GuideGeneratingSteps 로 단계 UX 위임 (SLEEP_GENERATING 프리셋).
function SleepGeneratingScreen() {
  return (
    <div className="bg-white md:bg-[#F4F4F5] w-full min-h-[100dvh] flex justify-center">
      <div className="w-full bg-white relative flex flex-col min-h-[100dvh] mx-auto md:max-w-[480px] md:rounded-[24px] md:shadow-2xl md:my-8">
        <Header variant="back" title="수면 가이드 생성" />
        <main className="flex-1 flex flex-col items-center justify-center px-8">
          <GuideGeneratingSteps {...SLEEP_GENERATING} />
        </main>
      </div>
    </div>
  )
}


function SleepGuideInputPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)

  // 1단계: 수면 시각 (주중·주말)
  const [weekdayBedtime, setWeekdayBedtime] = useState('23:30')
  const [weekdayWakeup, setWeekdayWakeup] = useState('07:00')
  const [weekendBedtime, setWeekendBedtime] = useState('00:00')
  const [weekendWakeup, setWeekendWakeup] = useState('08:00')

  // 2단계: 단축 설문 5문항 (각 0~3, null=미선택)
  const [brief, setBrief] = useState([null, null, null, null, null])

  // 3단계: 카페인 (id → cups)
  const [caffeineTypes, setCaffeineTypes] = useState([])
  const [caffeineCounts, setCaffeineCounts] = useState({})

  // 4단계: 방해 원인 (복수 선택)
  const [causes, setCauses] = useState([])

  // 5단계: ESS 8문항 (각 0~3, null=미선택)
  const [ess, setEss] = useState(Array(8).fill(null))

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchCaffeineTypes().then(setCaffeineTypes).catch(() => {})
  }, [])

  // q5(주간 지장) ≥ 2 면 ESS 권유
  const essRecommended = brief[4] !== null && brief[4] >= 2
  const essAnswered = ess.every((v) => v !== null)

  const setBriefAnswer = (qIdx, val) => {
    setBrief((prev) => prev.map((v, i) => (i === qIdx ? val : v)))
  }
  const setEssAnswer = (qIdx, val) => {
    setEss((prev) => prev.map((v, i) => (i === qIdx ? val : v)))
  }
  const adjustCaffeine = (id, delta) => {
    setCaffeineCounts((prev) => {
      const next = Math.max(0, (prev[id] || 0) + delta)
      return { ...prev, [id]: next }
    })
  }
  const toggleCause = (cause) => {
    setCauses((prev) => (prev.includes(cause) ? prev.filter((c) => c !== cause) : [...prev, cause]))
  }

  const canProceed = () => {
    if (step === 1) return weekdayBedtime && weekdayWakeup && weekendBedtime && weekendWakeup
    if (step === 2) return brief.every((v) => v !== null)
    if (step === 3) return true   // 카페인 0잔 허용
    if (step === 4) return true   // 방해 원인 선택 사항
    if (step === 5) return true   // ESS 선택 사항
    return false
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const payload = {
        weekday_bedtime: weekdayBedtime,
        weekday_wakeup: weekdayWakeup,
        weekend_bedtime: weekendBedtime,
        weekend_wakeup: weekendWakeup,
        brief_survey_q1: brief[0],
        brief_survey_q2: brief[1],
        brief_survey_q3: brief[2],
        brief_survey_q4: brief[3],
        brief_survey_q5: brief[4],
        ess_q1: essAnswered ? ess[0] : null,
        ess_q2: essAnswered ? ess[1] : null,
        ess_q3: essAnswered ? ess[2] : null,
        ess_q4: essAnswered ? ess[3] : null,
        ess_q5: essAnswered ? ess[4] : null,
        ess_q6: essAnswered ? ess[5] : null,
        ess_q7: essAnswered ? ess[6] : null,
        ess_q8: essAnswered ? ess[7] : null,
        caffeine_entries: Object.entries(caffeineCounts)
          .filter(([, cups]) => cups > 0)
          .map(([id, cups]) => ({ caffeine_drink_type_id: Number(id), cups })),
        disturbance_causes: causes,
      }
      const { guide_id } = await generateSleepGuide(payload)
      navigate(`/sleep-guides/${guide_id}`)
    } catch (err) {
      setError(err?.message ?? '가이드 생성에 실패했어요.')
      setSubmitting(false)
    }
  }

  const goNext = () => {
    if (step < TOTAL_STEPS) setStep(step + 1)
    else handleSubmit()
  }
  const goPrev = () => {
    if (step > 1) setStep(step - 1)
  }

  // 생성 대기 동안 전용 "생성 중" 화면 (S1). 성공 시 navigate, 실패 시 submitting=false 로 폼 복귀.
  if (submitting) return <SleepGeneratingScreen />

  return (
    <div className="bg-white md:bg-[#F4F4F5] w-full min-h-[100dvh] flex justify-center">
      <div className="w-full bg-white relative flex flex-col min-h-[100dvh] mx-auto md:max-w-[480px] md:rounded-[24px] md:shadow-2xl md:my-8">

        <Header variant="back" title="수면 가이드" />
        <ProgressBar step={step} />

        <main className="flex-1 px-5 pt-3 pb-28 overflow-y-auto">

          {/* 1단계: 수면 시각 */}
          {step === 1 && (
            <section className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-textHeading leading-snug mb-1">
                  평소 수면 시각을 알려주세요
                </h2>
                <p className="text-[13px] text-mute">24시간 형식 · 주중과 주말을 나눠서</p>
              </div>
              <div className="space-y-4">
                <p className="text-[12px] font-semibold text-subtext">주중 (월~금)</p>
                <div className="grid grid-cols-2 gap-3">
                  <TimeField label="취침" value={weekdayBedtime} onChange={setWeekdayBedtime} />
                  <TimeField label="기상" value={weekdayWakeup} onChange={setWeekdayWakeup} />
                </div>
                <p className="text-[12px] font-semibold text-subtext pt-2">주말 (토·일)</p>
                <div className="grid grid-cols-2 gap-3">
                  <TimeField label="취침" value={weekendBedtime} onChange={setWeekendBedtime} />
                  <TimeField label="기상" value={weekendWakeup} onChange={setWeekendWakeup} />
                </div>
              </div>
            </section>
          )}

          {/* 2단계: 단축 설문 5문항 */}
          {step === 2 && (
            <section className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-textHeading leading-snug mb-1">
                  최근 수면은 어땠나요?
                </h2>
                <p className="text-[13px] text-mute">지난 1주일 기준 · 5문항</p>
              </div>
              {BRIEF_QUESTIONS.map((q, idx) => (
                <div key={idx} className="space-y-2">
                  <p className="text-[14px] font-medium text-textBody leading-snug">
                    {idx + 1}. {q}
                  </p>
                  <ChoiceRow
                    options={idx === 3 ? BRIEF_OPTIONS_Q4 : BRIEF_OPTIONS}
                    value={brief[idx]}
                    onSelect={(val) => setBriefAnswer(idx, val)}
                  />
                </div>
              ))}
            </section>
          )}

          {/* 3단계: 카페인 */}
          {step === 3 && (
            <section className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-textHeading leading-snug mb-1">
                  오늘 카페인 음료를 얼마나 드셨나요?
                </h2>
                <p className="text-[13px] text-mute">0잔이면 그대로 두세요</p>
              </div>
              <div className="space-y-3">
                {caffeineTypes.map((drink) => {
                  const count = caffeineCounts[drink.id] || 0
                  return (
                    <div
                      key={drink.id}
                      className={
                        'border rounded-[12px] p-4 flex items-center justify-between transition-colors ' +
                        (count > 0 ? 'border-primary' : 'border-borderHairline')
                      }
                    >
                      <div>
                        <p className="text-[14px] font-semibold text-textBody">{drink.name}</p>
                        <p className="text-[11px] text-mute mt-0.5">{drink.caffeine_mg_per_cup}mg</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => adjustCaffeine(drink.id, -1)}
                          disabled={count === 0}
                          className="w-8 h-8 rounded-full border border-borderHairline flex items-center justify-center text-subtext disabled:opacity-40"
                        >
                          <FontAwesomeIcon icon={faMinus} className="text-[11px]" />
                        </button>
                        <span className="w-6 text-center text-[15px] font-semibold text-textBody">{count}</span>
                        <button
                          type="button"
                          onClick={() => adjustCaffeine(drink.id, 1)}
                          className="w-8 h-8 rounded-full border border-primary bg-primarySoft flex items-center justify-center text-primary"
                        >
                          <FontAwesomeIcon icon={faPlus} className="text-[11px]" />
                        </button>
                      </div>
                    </div>
                  )
                })}
                {caffeineTypes.length === 0 && (
                  <p className="text-[13px] text-mute text-center py-6">음료 목록을 불러오는 중…</p>
                )}
              </div>
            </section>
          )}

          {/* 4단계: 수면 방해 원인 */}
          {step === 4 && (
            <section className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-textHeading leading-snug mb-1">
                  수면을 방해하는 원인이 있나요?
                </h2>
                <p className="text-[13px] text-mute">선택 사항 · 복수 선택 가능</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {DISTURBANCE_CAUSES.map((cause) => {
                  const selected = causes.includes(cause)
                  return (
                    <button
                      key={cause}
                      type="button"
                      onClick={() => toggleCause(cause)}
                      className={
                        'h-14 rounded-[12px] text-[13px] font-semibold transition-colors px-2 ' +
                        (selected
                          ? 'bg-primarySoft border border-primary text-primary'
                          : 'bg-white border border-borderHairline text-textBody')
                      }
                    >
                      {cause}
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {/* 5단계: ESS (선택) */}
          {step === 5 && (
            <section className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-textHeading leading-snug mb-1">
                  낮 동안 졸림은 어떤가요?
                </h2>
                <p className="text-[13px] text-mute">선택 사항 · 졸림 척도 8문항</p>
              </div>
              {essRecommended && (
                <div className="bg-primarySoft border border-primary/30 rounded-[10px] p-3">
                  <p className="text-[12px] text-primary leading-relaxed">
                    낮 졸림이 있다고 답하셨어요. 졸림 척도를 함께 작성하면 더 정확한 안내를 받을 수 있어요.
                  </p>
                </div>
              )}
              <p className="text-[12px] text-mute">각 상황에서 졸게 될 가능성을 골라주세요.</p>
              {ESS_QUESTIONS.map((q, idx) => (
                <div key={idx} className="space-y-2">
                  <p className="text-[14px] font-medium text-textBody leading-snug">
                    {idx + 1}. {q}
                  </p>
                  <ChoiceRow
                    options={ESS_OPTIONS}
                    value={ess[idx]}
                    onSelect={(val) => setEssAnswer(idx, val)}
                  />
                </div>
              ))}
            </section>
          )}

          {error && (
            <p className="text-[13px] text-error text-center mt-4">{error}</p>
          )}
        </main>

        {/* 하단 고정 네비게이션 */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-borderHairline px-5 py-3 flex items-center gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={goPrev}
              disabled={submitting}
              className="h-12 px-5 rounded-[10px] text-[14px] font-medium border border-borderHairline text-textBody disabled:opacity-40"
            >
              이전
            </button>
          )}
          {step === 5 && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="h-12 px-4 rounded-[10px] text-[13px] font-medium text-mute disabled:opacity-40"
            >
              건너뛰기
            </button>
          )}
          <button
            type="button"
            onClick={goNext}
            disabled={!canProceed() || submitting}
            className="flex-1 h-12 rounded-[10px] text-[14px] font-semibold bg-primary text-white hover:bg-primaryDark active:scale-[0.98] transition disabled:bg-mute disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <FontAwesomeIcon icon={faMoon} className="text-[13px] animate-pulse" />
                AI가 가이드를 작성 중이에요…
              </>
            ) : step === TOTAL_STEPS ? '가이드 받기' : '다음'}
          </button>
        </div>

      </div>
    </div>
  )
}

export default SleepGuideInputPage
