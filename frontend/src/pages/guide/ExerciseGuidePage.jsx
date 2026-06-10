import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Header from '../../components/Header.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faEllipsisVertical,
  faGaugeHigh,
  faCalendar,
  faHeartPulse,
  faDumbbell,
  faTriangleExclamation,
  faWandMagicSparkles,
  faChevronDown,
  faCircleInfo,
  faRotateRight,
} from '@fortawesome/free-solid-svg-icons'
import { getExerciseGuideByDate, generateExerciseGuide } from '../../api/exerciseGuides.js'
import { listHealthCheckups } from '../../api/healthCheckup.js'

const CVD_RANGE_KO = {
  low:       '저위험',
  moderate:  '중위험',
  high:      '고위험',
  very_high: '초고위험',
}

const CVD_RANGE_COLOR = {
  low:       'bg-[#ECFDF5] text-[#16A34A]',
  moderate:  'bg-primarySoft text-primary',
  high:      'bg-warning/10 text-warning',
  very_high: 'bg-error/10 text-error',
}

// LLM이 생성한 텍스트를 섹션별로 파싱
function parseGuideText(text) {
  if (!text) return {}
  const sections = {}
  const matches = text.matchAll(/\[([^\]]+)\]\s*([\s\S]*?)(?=\[[^\]]+\]|$)/g)
  for (const m of matches) {
    sections[m[1].trim()] = m[2].trim()
  }
  return sections
}

function GuideSection({ title, content, icon, iconBg, iconColor }) {
  const [expanded, setExpanded] = useState(false)
  if (!content) return null
  const lines   = content.split('\n').filter(Boolean)
  const preview = lines.slice(0, 3)
  const rest    = lines.slice(3)

  return (
    <section className="px-5 pb-5">
      <div className="bg-white rounded-[12px] border border-borderHairline p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center`}>
            <FontAwesomeIcon icon={icon} className={`${iconColor} text-[12px]`} />
          </div>
          <h3 className="text-[14px] font-[600] text-textHeading">{title}</h3>
        </div>
        <div className="space-y-2">
          {preview.map((line, i) => (
            <p key={i} className="text-[13px] text-textBody leading-relaxed">{line}</p>
          ))}
          {expanded && rest.map((line, i) => (
            <p key={i} className="text-[13px] text-textBody leading-relaxed">{line}</p>
          ))}
        </div>
        {rest.length > 0 && (
          <div className="mt-3 flex justify-center">
            <button
              onClick={() => setExpanded(v => !v)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] text-mute hover:text-textBody transition-colors"
            >
              <span>{expanded ? '접기' : '더보기'}</span>
              <FontAwesomeIcon icon={faChevronDown} className={`text-[10px] transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

function ExerciseGuidePage() {
  const { date }   = useParams()
  const navigate   = useNavigate()
  const [guide,        setGuide]        = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [regenerating, setRegenerating] = useState(false)

  useEffect(() => {
    if (!date) return
    let cancelled = false
    setLoading(true)
    setError('')
    getExerciseGuideByDate(date)
      .then(data => { if (!cancelled) setGuide(data) })
      .catch(err  => { if (!cancelled) setError(err?.message ?? '가이드를 불러오지 못했어요.') })
      .finally(()  => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [date])

  const handleRegenerate = async () => {
    try {
      const data     = await listHealthCheckups()
      const checkups = Array.isArray(data?.checkups) ? data.checkups : []
      if (checkups.length === 0) {
        window.alert('등록된 건강검진 기록이 없어요.')
        return
      }
      setRegenerating(true)
      await generateExerciseGuide(checkups[0].id, date)
      const poll = setInterval(async () => {
        try {
          const newGuide = await getExerciseGuideByDate(date)
          if (newGuide) {
            setGuide(newGuide)
            setRegenerating(false)
            clearInterval(poll)
          }
        } catch {}
      }, 3000)
    } catch (err) {
      setRegenerating(false)
      window.alert(err?.message ?? '가이드 재생성 요청에 실패했어요.')
    }
  }

  const sections = guide ? parseGuideText(guide.exercise_guide) : {}

  return (
    <div className="bg-white md:bg-[#F4F4F5] w-full min-h-[100dvh] flex justify-center">
      <div className="w-full bg-white relative flex flex-col min-h-[100dvh] mx-auto md:max-w-[480px] md:rounded-[24px] md:shadow-2xl md:my-8 md:overflow-hidden">

        <Header
          variant="back"
          title="운동 가이드"
          rightAction={
            <button className="w-10 h-10 flex items-center justify-center text-mute" aria-label="더보기">
              <FontAwesomeIcon icon={faEllipsisVertical} className="text-[16px]" />
            </button>
          }
        />

        <main className="flex-1 overflow-y-auto">

          {loading && (
            <p className="text-[13px] text-mute text-center py-10">불러오는 중…</p>
          )}

          {!loading && error && (
            <p className="text-[13px] text-error text-center py-10">{error}</p>
          )}

          {regenerating && (
            <div className="bg-primarySoft border border-primary/20 rounded-[12px] mx-5 mt-4 px-4 py-3">
              <p className="text-[12px] text-primary text-center animate-pulse">가이드를 다시 생성하고 있어요. 잠시만 기다려 주세요…</p>
            </div>
          )}

          {!loading && !error && guide && !regenerating && (
            <>
              {/* 제목 블록 */}
              <section className="px-5 pt-4 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[12px] font-[500] text-primary mb-1">맞춤 운동 플랜</p>
                    <h2 className="text-[22px] font-[700] text-textHeading leading-tight">
                      {guide.intensity_label} 운동 플랜
                    </h2>
                  </div>
                  <span className="shrink-0 mt-1 inline-flex items-center gap-1 rounded-full bg-primarySoft text-primary px-2.5 py-1 text-[12px] font-[600]">
                    <FontAwesomeIcon icon={faGaugeHigh} className="text-[10px]" />강도 · {guide.intensity_label}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-3 text-[12px] text-subtext">
                  <span className="inline-flex items-center gap-1">
                    <FontAwesomeIcon icon={faCalendar} className="text-mute text-[11px]" />{guide.guide_date} 생성
                  </span>
                </div>
              </section>

              {/* 위험도 */}
              <section className="px-5 pb-5">
                <div className="flex items-center gap-2 rounded-[12px] border border-borderHairline bg-bgSubtle px-3.5 py-3">
                  <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[12px] font-[600] ${CVD_RANGE_COLOR[guide.cvd_range] ?? 'bg-bgSubtle text-subtext'}`}>
                    {CVD_RANGE_KO[guide.cvd_range] ?? guide.cvd_range}
                  </span>
                  <p className="text-[13px] text-subtext">
                    CVD 점수 <span className="text-textHeading font-[600]">{guide.cvd_score}</span>
                    {guide.conditions?.length > 0 && (
                      <span> · {guide.conditions.join(', ')}</span>
                    )}
                  </p>
                </div>
              </section>

              {/* CVD 점수 카드 */}
              <section className="px-5 pb-5">
                <div className="bg-white rounded-[12px] border border-borderHairline p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-primarySoft flex items-center justify-center">
                      <FontAwesomeIcon icon={faHeartPulse} className="text-primary text-[15px]" />
                    </div>
                    <h3 className="text-[14px] font-[600] text-textHeading">심혈관 위험도 평가</h3>
                    <span className="ml-auto text-[18px] font-[700] text-primary">{guide.cvd_score}</span>
                  </div>
                  <div className="relative h-2.5 rounded-full bg-borderLight overflow-hidden">
                    <div
                      className="absolute top-0 bottom-0 left-0 rounded-full bg-primary"
                      style={{ width: `${Math.min(guide.cvd_score * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5 text-[10px] text-mute">
                    <span>저위험 0.0</span>
                    <span>초고위험 1.0</span>
                  </div>
                </div>
              </section>

              {/* 운동 강도 섹션 */}
              <GuideSection
                title="운동 강도"
                content={sections['운동 강도']}
                icon={faGaugeHigh}
                iconBg="bg-primarySoft"
                iconColor="text-primary"
              />

              {/* 권장 운동 종류 */}
              <GuideSection
                title="권장 운동 종류"
                content={sections['권장 운동 종류']}
                icon={faDumbbell}
                iconBg="bg-primarySoft"
                iconColor="text-primary"
              />

              {/* 운동 시간 및 빈도 */}
              <GuideSection
                title="운동 시간 및 빈도"
                content={sections['운동 시간 및 빈도']}
                icon={faHeartPulse}
                iconBg="bg-primarySoft"
                iconColor="text-primary"
              />

              {/* 주의사항 */}
              <GuideSection
                title="주의사항"
                content={sections['주의사항']}
                icon={faTriangleExclamation}
                iconBg="bg-warning/10"
                iconColor="text-warning"
              />

              {/* 전체 가이드 텍스트 (파싱 안 된 경우 폴백) */}
              {Object.keys(sections).length === 0 && (
                <section className="px-5 pb-5">
                  <div className="bg-white rounded-[12px] border border-borderHairline p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-primarySoft flex items-center justify-center">
                        <FontAwesomeIcon icon={faWandMagicSparkles} className="text-primary text-[12px]" />
                      </div>
                      <h3 className="text-[14px] font-[600] text-textHeading">AI 운동 가이드</h3>
                    </div>
                    <p className="text-[13px] text-textBody leading-[1.85] whitespace-pre-line">{guide.exercise_guide}</p>
                  </div>
                </section>
              )}

              {/* 재생성 버튼 */}
              <div className="px-5 pb-4">
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className="w-full h-12 bg-primary hover:bg-primaryDark text-white text-[14px] font-[700] rounded-[12px] transition-colors disabled:bg-mute disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <FontAwesomeIcon icon={faRotateRight} />
                  <span>가이드 다시 받기</span>
                </button>
              </div>

              {/* 면책 고지 */}
              <section className="px-5 pb-6">
                <div className="flex items-start gap-2 rounded-[12px] bg-bgSubtle border border-borderHairline px-3.5 py-3">
                  <FontAwesomeIcon icon={faCircleInfo} className="text-mute text-[12px] mt-0.5" />
                  <p className="text-[11px] text-mute leading-relaxed">
                    본 운동 가이드는 참고용이며 의학적 진단을 대체하지 않습니다. 심장 질환·고혈압·당뇨 등 기저질환이 있는 경우 전문 의료진과 상담 후 운동을 시작하십시오.
                  </p>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default ExerciseGuidePage