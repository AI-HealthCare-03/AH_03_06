import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Header from '../../components/Header.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faWandMagicSparkles,
  faMoon,
  faTrash,
  faCircleInfo,
  faTriangleExclamation,
  faLightbulb,
  faBullseye,
  faClipboardCheck,
} from '@fortawesome/free-solid-svg-icons'
import { getSleepGuide, deleteSleepGuide } from '../../api/sleepGuides.js'


const STATUS_META = {
  0: { label: '정상', cls: 'text-primary bg-primarySoft border-primary/30' },
  1: { label: '주의', cls: 'text-warning bg-warning/10 border-warning/30' },
  2: { label: '위험', cls: 'text-error bg-error/10 border-error/30' },
}


function hoursToHM(h) {
  if (h == null) return '—'
  const total = Math.round(h * 60)
  const hh = Math.floor(total / 60)
  const mm = total % 60
  return mm === 0 ? `${hh}시간` : `${hh}시간 ${mm}분`
}


function formatCreatedAt(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}


// 본문 섹션 (제목 + 내용)
function Section({ icon, title, children }) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-2 mb-2">
        {icon && <FontAwesomeIcon icon={icon} className="text-primary text-[13px]" />}
        <h3 className="text-[12px] font-[700] text-textHeading">{title}</h3>
      </div>
      {children}
    </div>
  )
}


function SleepGuidePage() {
  const { guideId } = useParams()
  const navigate = useNavigate()
  const [guide, setGuide] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!guideId) return
    let cancelled = false
    setLoading(true)
    setError('')
    getSleepGuide(guideId)
      .then((data) => { if (!cancelled) setGuide(data) })
      .catch((err) => { if (!cancelled) setError(err?.message ?? '가이드를 불러오지 못했어요.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [guideId])

  const handleDelete = async () => {
    if (!guide) return
    if (!window.confirm('이 수면 가이드를 삭제할까요?')) return
    try {
      await deleteSleepGuide(guideId)
      navigate('/sleep-guides')
    } catch (err) {
      window.alert(err?.message ?? '삭제에 실패했어요.')
    }
  }

  const status = guide ? STATUS_META[guide.overall_status] || STATUS_META[0] : null

  return (
    <div className="bg-white md:bg-[#F4F4F5] w-full min-h-[100dvh] flex justify-center">
      <div className="w-full bg-white relative flex flex-col min-h-[100dvh] mx-auto md:max-w-[480px] md:rounded-[24px] md:shadow-2xl md:my-8 pb-10">

        <Header variant="back" title="수면 가이드" />

        <main className="px-5 pt-5 pb-2 space-y-4">

          {loading && (
            <p className="text-[13px] text-mute text-center py-10">불러오는 중…</p>
          )}

          {!loading && error && (
            <p className="text-[13px] text-error text-center py-10">{error}</p>
          )}

          {!loading && !error && guide && (
            <>
              {/* 상단: 제목 + 시각 + 삭제 */}
              <div className="pt-1 flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h1 className="text-[20px] font-[700] text-textHeading leading-tight">수면 분석</h1>
                  {guide.created_at && (
                    <p className="text-[11px] text-mute mt-1">{formatCreatedAt(guide.created_at)}</p>
                  )}
                </div>
                <button
                  onClick={handleDelete}
                  aria-label="가이드 삭제"
                  className="p-2 -mr-2 text-mute hover:text-error transition-colors"
                >
                  <FontAwesomeIcon icon={faTrash} className="text-[14px]" />
                </button>
              </div>

              {/* 현재 상태 카드 */}
              <section className={`border rounded-[12px] p-4 ${status.cls.split(' ').slice(1).join(' ')}`}>
                <div className="flex items-center gap-2 mb-2">
                  <FontAwesomeIcon icon={faMoon} className={status.cls.split(' ')[0]} />
                  <h2 className="text-[14px] font-[700] text-textHeading flex-1">수면 분석 결과</h2>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-[700] ${status.cls}`}>
                    {status.label} 단계
                  </span>
                </div>
                <div className="flex gap-4 text-[12px] text-subtext">
                  <span>평균 수면 <b className="text-textBody">{hoursToHM(guide.sleep_hours_avg)}</b></span>
                  <span>주말 시차 <b className="text-textBody">{hoursToHM(guide.rhythm_diff_hours)}</b></span>
                  {guide.caffeine_mg_daily != null && (
                    <span>카페인 <b className="text-textBody">{guide.caffeine_mg_daily}mg</b></span>
                  )}
                </div>
              </section>

              {/* AI 맞춤 수면 가이드 카드 */}
              <section className="bg-white border border-borderHairline rounded-[10px] shadow-soft overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-borderHairline">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faWandMagicSparkles} className="text-primary text-[14px]" />
                    <h2 className="text-[14px] font-[700] text-textHeading">AI 맞춤 수면 가이드</h2>
                  </div>
                  <span className="px-2 py-0.5 bg-primarySoft text-primary text-[10px] font-[700] rounded tracking-wider">AI</span>
                </div>

                <div className="divide-y divide-borderHairline">
                  {guide.key_point && (
                    <Section icon={faLightbulb} title="지금 가장 중요한 포인트">
                      <p className="text-[14px] text-textBody leading-[1.7]">{guide.key_point}</p>
                    </Section>
                  )}

                  {guide.today_actions && (
                    <Section icon={faClipboardCheck} title="오늘부터 할 일">
                      <ul className="space-y-1.5">
                        {guide.today_actions.split('\n').filter((l) => l.trim()).map((line, i) => (
                          <li key={i} className="text-[14px] text-textBody leading-[1.6]">{line}</li>
                        ))}
                      </ul>
                    </Section>
                  )}

                  {guide.weekly_goal && (
                    <Section icon={faBullseye} title="이번 주 수면 목표">
                      <p className="text-[14px] text-textBody leading-[1.7]">{guide.weekly_goal}</p>
                    </Section>
                  )}

                  {guide.coping_strategy && (
                    <Section title="잠이 잘 오지 않을 때">
                      <p className="text-[14px] text-textBody leading-[1.7]">{guide.coping_strategy}</p>
                    </Section>
                  )}

                  {guide.lifestyle_adjustment && (
                    <Section title="생활습관 조정">
                      <p className="text-[14px] text-textBody leading-[1.7]">{guide.lifestyle_adjustment}</p>
                    </Section>
                  )}

                  {guide.next_checkup_guide && (
                    <Section title="다음 점검 안내">
                      <p className="text-[13px] text-subtext leading-relaxed">{guide.next_checkup_guide}</p>
                    </Section>
                  )}
                </div>
              </section>

              {/* 상담 권장 (조건부) */}
              {guide.consultation_recommendation && (
                <section className="bg-warning/10 border border-warning/30 rounded-[10px] p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <FontAwesomeIcon icon={faTriangleExclamation} className="text-warning text-[16px]" />
                    <h2 className="text-[14px] font-[700] text-warning">상담을 권장드려요</h2>
                  </div>
                  <p className="text-[14px] text-textBody leading-relaxed">{guide.consultation_recommendation}</p>
                </section>
              )}

              {/* 참고 자료 */}
              {guide.references && guide.references.length > 0 && (
                <section className="px-1">
                  <p className="text-[11px] font-[700] text-mute mb-1 tracking-wider uppercase">참고 자료</p>
                  <ul className="space-y-0.5">
                    {guide.references.map((ref, i) => (
                      <li key={i} className="text-[11px] text-subtext leading-relaxed">· {ref}</li>
                    ))}
                  </ul>
                </section>
              )}

              {/* 가이드 다시 받기 */}
              <button
                onClick={() => navigate('/sleep-guides/new')}
                className="w-full h-12 bg-primary hover:bg-primaryDark text-white text-[14px] font-[700] rounded-[10px] transition-colors"
              >
                가이드 다시 받기
              </button>

              {/* 면책 */}
              {guide.disclaimer && (
                <p className="text-[11px] text-mute leading-relaxed pt-2 pb-2 flex items-start gap-1.5">
                  <FontAwesomeIcon icon={faCircleInfo} className="mt-0.5 text-[10px]" />
                  <span>{guide.disclaimer}</span>
                </p>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default SleepGuidePage
