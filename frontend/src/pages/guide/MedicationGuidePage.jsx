import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Header from '../../components/Header.jsx'
import MedicationGuideButton from '../../components/MedicationGuideButton.jsx'
import FoldableMarkdown from '../../components/FoldableMarkdown.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faWandMagicSparkles,
  faCircleInfo,
  faTriangleExclamation,
  faBan,
  faTrash,
} from '@fortawesome/free-solid-svg-icons'
import {
  getMedicationGuide,
  deleteMedicationGuide,
} from '../../api/medicationGuides.js'


function formatCreatedAt(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}


function MedicationGuidePage() {
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
    getMedicationGuide(guideId)
      .then((data) => { if (!cancelled) setGuide(data) })
      .catch((err) => { if (!cancelled) setError(err?.message ?? '가이드를 불러오지 못했어요.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [guideId])

  const handleDelete = async () => {
    if (!guide) return
    if (!window.confirm('이 복약 가이드를 삭제할까요?')) return
    try {
      await deleteMedicationGuide(guideId)
      navigate('/medication-guides')
    } catch (err) {
      window.alert(err?.message ?? '삭제에 실패했어요.')
    }
  }

  return (
    <div className="bg-white md:bg-[#F4F4F5] w-full min-h-[100dvh] flex justify-center">
      <div className="w-full bg-white relative flex flex-col min-h-[100dvh] mx-auto md:max-w-[480px] md:rounded-[24px] md:shadow-2xl md:my-8 pb-10">

        <Header variant="back" title="복약 가이드" />

        <main className="px-5 pt-5 pb-2 space-y-4">

          {loading && (
            <p className="text-[13px] text-mute text-center py-10">불러오는 중…</p>
          )}

          {!loading && error && (
            <p className="text-[13px] text-error text-center py-10">{error}</p>
          )}

          {!loading && !error && guide && (
            <>
              {/* drug_name 제목 + created_at + 삭제 버튼 */}
              <div className="pt-1 flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h1 className="text-[20px] font-[700] text-textHeading leading-tight">
                    {guide.drug_name || '복약 가이드'}
                  </h1>
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

              {/* 안전 카드 (조건부) — 위험도 최상위, 절대 접지 않음 */}
              {guide.safety_block && (
                <section className="bg-white border border-error/40 rounded-[10px] p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <FontAwesomeIcon icon={faBan} className="text-error text-[16px]" />
                    <h2 className="text-[14px] font-[700] text-error">차단 안내</h2>
                  </div>
                  <p className="text-[14px] font-[500] text-textBody leading-relaxed">{guide.safety_block}</p>
                </section>
              )}

              {guide.safety_warn && (
                <section className="bg-white border border-warning/40 rounded-[10px] p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <FontAwesomeIcon icon={faTriangleExclamation} className="text-warning text-[16px]" />
                    <h2 className="text-[14px] font-[700] text-warning">안전 경고</h2>
                  </div>
                  <p className="text-[14px] font-[500] text-textBody leading-relaxed">{guide.safety_warn}</p>
                </section>
              )}

              {guide.safety_info && (
                <section className="bg-white border border-primary/30 rounded-[10px] p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <FontAwesomeIcon icon={faCircleInfo} className="text-primary text-[16px]" />
                    <h2 className="text-[14px] font-[700] text-primary">안내</h2>
                  </div>
                  <p className="text-[14px] font-[500] text-textBody leading-relaxed">{guide.safety_info}</p>
                </section>
              )}

              {/* 본문 — fallback 분기 (빨강 금지, primarySoft 톤). 아코디언 미적용 (짧고 평이) */}
              {guide.is_fallback ? (
                <section className="bg-primarySoft border border-primary/20 rounded-[10px] p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <FontAwesomeIcon icon={faCircleInfo} className="text-primary text-[16px]" />
                    <h2 className="text-[14px] font-[700] text-primary">
                      안내드릴 정보가 부족해요
                    </h2>
                  </div>
                  <p className="text-[13px] text-textBody leading-relaxed">
                    {guide.main_content}
                  </p>
                </section>
              ) : (
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
                    {/* 복약 안내 — 본문 한 덩어리를 \n\n 블록 단위로 접기.
                        기본 첫 2블록(인용+보충)만 보이고, 나머지는 '더보기' 클릭 시 펼침.
                        블록 ≤2면 토글 숨기고 전체 그대로 표시. 원문 보존(요약·절단 없음). */}
                    <div className="px-5 py-4">
                      <h3 className="text-[11px] font-[700] text-mute mb-2 tracking-wider uppercase">
                        복약 안내
                      </h3>
                      <FoldableMarkdown content={guide.main_content} />
                    </div>

                    {guide.references && (
                      <div className="px-5 py-4">
                        <h3 className="text-[11px] font-[700] text-mute mb-2 tracking-wider uppercase">
                          출처
                        </h3>
                        <p className="text-[12px] text-subtext leading-relaxed">{guide.references}</p>
                      </div>
                    )}

                    {guide.safety_recommendations && (
                      <div className="px-5 py-4">
                        <h3 className="text-[11px] font-[700] text-mute mb-2 tracking-wider uppercase">
                          안전 권고
                        </h3>
                        <p className="text-[12px] text-subtext leading-relaxed">
                          {guide.safety_recommendations}
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* 재생성 CTA — 공통 버튼 컴포넌트. medication_id 없으면 자동으로 렌더 안 됨 */}
              <MedicationGuideButton
                medicationId={guide.medication_id}
                medicationName={guide.drug_name}
                label="가이드 다시 받기"
              />

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
