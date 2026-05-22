import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Header from '../../components/Header.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faWandMagicSparkles,
  faCircleExclamation,
  faCircleInfo,
} from '@fortawesome/free-solid-svg-icons'
import {
  getMedicationGuide,
  generateMedicationGuide,
} from '../../api/medicationGuides.js'

// 응답 스키마 (참고용):
//   guide_id, safety_block, safety_warn, safety_info, main_content,
//   references, safety_recommendations, is_fallback, created_at,
//   disclaimer, medication_id, drug_name
// → 본 화면은 safety_warn / main_content / references / disclaimer 4개만 표시.
//   block/info/recommendations/drug_name 시각화는 다음 단계로 미룸 (응답 객체는 전체 보관).

function MedicationGuidePage() {
  const { guideId } = useParams()
  const [guide, setGuide] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [regenerating, setRegenerating] = useState(false)

  useEffect(() => {
    if (!guideId) return
    let cancelled = false
    setLoading(true)
    setError('')
    getMedicationGuide(guideId)
      .then(data => { if (!cancelled) setGuide(data) })
      .catch(err => { if (!cancelled) setError(err.message ?? '가이드를 불러오지 못했어요.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [guideId])

  // Phase 1: BE가 "medication_guide_generating" 메시지만 즉시 응답 → 본 화면은 그대로 유지.
  // Phase 2: BackgroundTask 완료 후 새 guide_id로 redirect 또는 polling으로 setGuide 갱신.
  const handleRegenerate = async () => {
    if (!guide?.medication_id) return
    setRegenerating(true)
    try {
      await generateMedicationGuide(guide.medication_id, true)
    } catch (err) {
      setError(err.message ?? '재생성 요청에 실패했어요.')
    } finally {
      setRegenerating(false)
    }
  }

  const buttonDisabled = loading || regenerating || !guide?.medication_id

  return (
    <div className="bg-white md:bg-[#F4F4F5] w-full min-h-[100dvh] flex justify-center">
      <div className="w-full bg-white relative flex flex-col min-h-[100dvh] mx-auto md:max-w-[480px] md:rounded-[24px] md:shadow-2xl md:my-8 pb-10">

        {/* 상세 화면: 뒤로가기 헤더 (탭바 없음 — 뒤로가기로 빠져나옴) */}
        <Header variant="back" title="복약 가이드" />

        <main className="px-5 pt-5 pb-2 space-y-4">

          {loading && (
            <p className="text-[13px] text-mute text-center py-10">불러오는 중...</p>
          )}

          {!loading && error && (
            <p className="text-[13px] text-error text-center py-10">{error}</p>
          )}

          {!loading && !error && guide && (
            <>
              {/* 안전 경고 — 약물 상호작용은 고위험 정보이므로 error 토큰 사용.
                  단 시안 상태카드 패턴(흰 톤 + 색 테두리)을 따라 과한 빨강 채움은 지양 */}
              {guide.safety_warn && (
                <section className="bg-error/5 border border-error/30 rounded-[10px] p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <FontAwesomeIcon icon={faCircleExclamation} className="text-error text-[16px]" />
                    <h2 className="text-[14px] font-[700] text-error">안전 경고</h2>
                  </div>
                  <p className="text-[14px] font-[500] text-textBody leading-relaxed">
                    {guide.safety_warn}
                  </p>
                </section>
              )}

              {/* AI 복약 가이드 카드 — 식단/운동/수면 가이드와 동일한 AI 카드 구조 */}
              <section className="bg-white border border-borderHairline rounded-[10px] shadow-soft overflow-hidden">

                <div className="flex items-center justify-between px-5 py-4 border-b border-borderHairline">
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faWandMagicSparkles} className="text-primary text-[14px]" />
                    <h2 className="text-[14px] font-[700] text-textHeading">오늘의 AI 복약 가이드</h2>
                  </div>
                  <span className="px-2 py-0.5 bg-primarySoft text-primary text-[10px] font-[700] rounded tracking-wider">
                    AI
                  </span>
                </div>

                <div className="divide-y divide-borderHairline">

                  {/* 복약 안내 본문 */}
                  <div className="px-5 py-4">
                    <h3 className="text-[11px] font-[700] text-mute mb-2 tracking-wider uppercase">
                      복약 안내
                    </h3>
                    <p className="text-[14px] text-textBody leading-[1.7] whitespace-pre-line">
                      {guide.main_content}
                    </p>
                  </div>

                  {/* 출처 */}
                  {guide.references && (
                    <div className="px-5 py-4">
                      <h3 className="text-[11px] font-[700] text-mute mb-2 tracking-wider uppercase">
                        출처
                      </h3>
                      <p className="text-[12px] text-subtext leading-relaxed">
                        {guide.references}
                      </p>
                    </div>
                  )}

                </div>
              </section>

              {/* Primary CTA — 로딩/재생성/medication_id 부재 시 비활성 */}
              <button
                onClick={handleRegenerate}
                disabled={buttonDisabled}
                className="w-full h-12 bg-primary hover:bg-primaryDark text-white text-[14px] font-[700] rounded-[10px] transition-colors disabled:bg-mute disabled:cursor-not-allowed"
              >
                {regenerating ? '재생성 요청 중…' : '가이드 다시 받기'}
              </button>

              {/* 면책 — 시안과 동일하게 info 아이콘 + 좌측 정렬 */}
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

export default MedicationGuidePage
