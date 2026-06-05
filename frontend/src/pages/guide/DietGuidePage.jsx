import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createChatSession } from '../../api/chat.js'
import Header from '../../components/Header.jsx'
import GuideGeneratingSteps from '../../components/GuideGeneratingSteps.jsx'
import { DIET_GENERATING } from '../../components/guideGeneratingPresets.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faWandMagicSparkles, faCircleInfo, faChevronDown,
  faRotateRight, faComments, faEllipsisVertical,
} from '@fortawesome/free-solid-svg-icons'
import { getDietGuideByDate, regenerateDietGuide, deleteDietGuide } from '../../api/dietGuides.js'
import { listHealthCheckups } from '../../api/healthCheckup.js'

const MEAL_PLAN_KO = {
  'Balanced Diet':               '균형 식단',
  'Low-Sodium Diet':             '저염 식단',
  'Low-Carb Diet':               '저탄수화물 식단',
  'Low-Calorie Diet':            '저칼로리 식단',
  'Low-Carb Low-Sodium Diet':    '저탄수화물·저염 식단',
  'Low-Calorie Low-Sodium Diet': '저칼로리·저염 식단',
  'Low-Carb Low-Calorie Diet':   '저탄수화물·저칼로리 식단',
  'Therapeutic Diet':            '치료 식단',
}

function NutrientBar({ label, value, unit }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[13px] text-subtext">{label}</span>
      <span className="text-[13px] font-[600] text-textHeading">{value} {unit}</span>
    </div>
  )
}

function MealSection({ title, content }) {
  const [expanded, setExpanded] = useState(false)
  if (!content) return null
  const lines   = content.replace(/^[-•]\s*/gm, '').trim().split('\n').filter(Boolean)
  const preview = lines.slice(0, 2)
  const rest    = lines.slice(2)
  const hasFold = rest.length > 0
  return (
    <div className="px-5 py-4">
      <h3 className="text-[11px] font-[700] text-mute mb-2 tracking-wider uppercase">{title}</h3>
      <div className="space-y-1">
        {preview.map((line, i) => (
          <div key={i} className="flex items-start gap-2 text-[14px] text-textBody leading-relaxed">
            <span className="mt-2 w-1 h-1 rounded-full bg-mute flex-shrink-0" />
            <span>{line}</span>
          </div>
        ))}
        {hasFold && expanded && rest.map((line, i) => (
          <div key={i} className="flex items-start gap-2 text-[14px] text-textBody leading-relaxed">
            <span className="mt-2 w-1 h-1 rounded-full bg-mute flex-shrink-0" />
            <span>{line}</span>
          </div>
        ))}
        {hasFold && (
          <div className="mt-2 flex justify-center">
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] text-mute hover:text-textBody transition-colors"
            >
              <span>{expanded ? '접기' : '더보기'}</span>
              <FontAwesomeIcon icon={faChevronDown} className={`text-[10px] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function DietGuidePage() {
  const { date }   = useParams()
  const navigate   = useNavigate()
  const [guide,        setGuide]        = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [regenerating, setRegenerating] = useState(false)
  const [showMenu,     setShowMenu]     = useState(false)

  useEffect(() => {
    if (!date) return
    let cancelled = false
    setLoading(true)
    setError('')
    getDietGuideByDate(date)
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
      await regenerateDietGuide(checkups[0].id, date)
      const poll = setInterval(async () => {
        try {
          const newGuide = await getDietGuideByDate(date)
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

  const handleDelete = async () => {
    if (!window.confirm('이 날짜의 식단 가이드를 삭제할까요?')) return
    setShowMenu(false)
    try {
      await deleteDietGuide(date)
      navigate(-1)
    } catch (err) {
      window.alert(err?.message ?? '삭제에 실패했어요.')
    }
  }

  const handleChat = async () => {
    if (!guide) return
    try {
      const data = await createChatSession('DIET_GUIDE', guide.id)
      navigate(`/chat/${data.id}?context_type=DIET_GUIDE&guide_date=${guide.guide_date}`)
    } catch {
      window.alert('채팅 세션 생성에 실패했어요.')
    }
  }

  return (
    <div className="bg-white md:bg-[#F4F4F5] w-full min-h-[100dvh] flex justify-center">
      <div className="w-full bg-white relative flex flex-col min-h-[100dvh] mx-auto md:max-w-[480px] md:rounded-[24px] md:shadow-2xl md:my-8 pb-10">

        <Header
          variant="back"
          title="식단 가이드"
          rightAction={
            guide ? (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(v => !v)}
                  className="w-10 h-10 flex items-center justify-center text-textHeading"
                >
                  <FontAwesomeIcon icon={faEllipsisVertical} className="text-[16px]" />
                </button>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 top-10 z-50 bg-white rounded-[10px] shadow-lg border border-borderHairline overflow-hidden w-[140px]">
                      <button
                        onClick={handleDelete}
                        className="w-full px-5 py-3 text-[14px] font-[500] text-error text-left hover:bg-bgSubtle"
                      >
                        가이드 삭제
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : null
          }
        />

        <main className="px-5 pt-5 pb-2 space-y-4">

          {loading && (
            <p className="text-[13px] text-mute text-center py-10">불러오는 중…</p>
          )}

          {!loading && error && (
            <p className="text-[13px] text-error text-center py-10">{error}</p>
          )}

          {regenerating && (
            <div className="flex flex-col items-center justify-center py-16">
              <GuideGeneratingSteps {...DIET_GENERATING} />
            </div>
          )}

          {!loading && !error && guide && !regenerating && (
            <>
              <div className="pt-1">
                <h1 className="text-[20px] font-[700] text-textHeading leading-tight">
                  {MEAL_PLAN_KO[guide.meal_plan_type] ?? guide.meal_plan_type}
                </h1>
                {guide.guide_date && (
                  <p className="text-[11px] text-mute mt-1">{guide.guide_date}</p>
                )}
              </div>

              <section className="bg-white border border-borderHairline rounded-[10px] shadow-soft overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-borderHairline">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faWandMagicSparkles} className="text-primary text-[14px]" />
                    <h2 className="text-[14px] font-[700] text-textHeading">오늘의 AI 식단 가이드</h2>
                  </div>
                  <span className="px-2 py-0.5 bg-primarySoft text-primary text-[10px] font-[700] rounded tracking-wider">AI</span>
                </div>

                <div className="divide-y divide-borderHairline">
                  <div className="px-5 py-4">
                    <h3 className="text-[11px] font-[700] text-mute mb-2 tracking-wider uppercase">영양소 기준</h3>
                    <NutrientBar label="칼로리"   value={guide.nutrient_standard?.recommended_calories} unit="kcal" />
                    <NutrientBar label="탄수화물" value={guide.nutrient_standard?.recommended_carbs}    unit="g" />
                    <NutrientBar label="단백질"   value={guide.nutrient_standard?.recommended_protein}  unit="g" />
                    <NutrientBar label="지방"     value={guide.nutrient_standard?.recommended_fat}      unit="g" />
                  </div>
                  <MealSection title="아침" content={guide.breakfast} />
                  <MealSection title="점심" content={guide.lunch} />
                  <MealSection title="저녁" content={guide.dinner} />
                  {guide.recommended_foods && (
                    <div className="px-5 py-4">
                      <h3 className="text-[11px] font-[700] text-mute mb-2 tracking-wider uppercase">권장 식품</h3>
                      <p className="text-[13px] text-textBody leading-relaxed">{guide.recommended_foods.replace(/^[-•]\s*/gm, '').trim()}</p>
                    </div>
                  )}
                  {guide.restricted_foods && (
                    <div className="px-5 py-4">
                      <h3 className="text-[11px] font-[700] text-mute mb-2 tracking-wider uppercase">제한 식품</h3>
                      <p className="text-[13px] text-textBody leading-relaxed">{guide.restricted_foods.replace(/^[-•]\s*/gm, '').trim()}</p>
                    </div>
                  )}
                </div>
              </section>

              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className="w-full h-12 bg-primary hover:bg-primaryDark text-white text-[14px] font-[700] rounded-[12px] transition-colors disabled:bg-mute disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <FontAwesomeIcon icon={faRotateRight} />
                <span>가이드 다시 받기</span>
              </button>

              <button
                onClick={handleChat}
                className="w-full h-12 bg-white border border-primary text-primary text-[14px] font-[700] rounded-[12px] flex items-center justify-center gap-2 hover:bg-primarySoft transition-colors"
              >
                <FontAwesomeIcon icon={faComments} className="text-[14px]" />
                <span>AI에게 질문하기</span>
              </button>

              <p className="text-[11px] text-mute leading-relaxed pt-2 pb-2 flex items-start gap-1.5">
                <FontAwesomeIcon icon={faCircleInfo} className="mt-0.5 text-[10px]" />
                <span>본 서비스는 일반적인 정보 제공 목적이며, 의학적 진단·치료를 대체하지 않습니다. 실제 식단 결정은 반드시 의사·영양사와 상담하시기 바랍니다.</span>
              </p>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default DietGuidePage