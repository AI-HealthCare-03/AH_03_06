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
  faLightbulb,
} from '@fortawesome/free-solid-svg-icons'
import {
  getMedicationGuide,
  deleteMedicationGuide,
} from '../../api/medicationGuides.js'


// scope 가 '전체'류면 칩 생략(약 전체 적용은 굳이 표시 안 함), 특정 환자군일 때만 파랑 칩
const isAllScope = (s) => !s || ['전체', '이 약 전체', '약 전체'].includes(s.trim())

// 칩은 '임부·소아·간질환자' 같은 짧은 환자군 라벨일 때만.
// 모델이 scope에 상황 문구("투여 중지 후 …사용 시")를 넣으면 길어져 제목을 잘라먹으므로 숨김.
const SCOPE_SITUATIONAL = /사용|복용|투여|경우/
const showScopeChip = (s) => {
  const v = (s || '').trim()
  return !!v && !isAllScope(v) && v.length <= 10 && !SCOPE_SITUATIONAL.test(v)
}


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

              {/* 본문 — fallback 이면 안내 카드, 아니면 구조화 섹션 카드 */}
              {guide.is_fallback ? (
                <section className="bg-primarySoft border border-primary/20 rounded-[10px] p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <FontAwesomeIcon icon={faCircleInfo} className="text-primary text-[16px]" />
                    <h2 className="text-[14px] font-[700] text-primary">
                      안내드릴 정보가 부족해요
                    </h2>
                  </div>
                  <p className="text-[13px] text-textBody leading-relaxed">
                    {guide.fallback_message}
                  </p>
                </section>
              ) : (guide.key_point || guide.sections?.length) ? (
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
                    {/* 핵심 요약 — 수면 가이드와 동일하게 '지금 가장 중요한 포인트' 제목+전구 */}
                    {guide.key_point && (
                      <div className="px-5 py-4">
                        <div className="flex items-center gap-2 mb-2">
                          <FontAwesomeIcon icon={faLightbulb} className="text-primary text-[13px]" />
                          <h3 className="text-[13px] font-[700] text-textHeading">지금 가장 중요한 포인트</h3>
                        </div>
                        <p className="text-[15px] font-[500] text-textBody leading-[1.7]">{guide.key_point}</p>
                      </div>
                    )}

                    {/* 주제별 섹션 — scope 칩 + 풀이 + '근거 보기'(발췌 원문) */}
                    {guide.sections?.map((s, i) => (
                      <div key={i} className="px-5 py-4">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          {/* 섹션 아이콘 제거: 매 섹션 반복되던 파란 ⓘ가 본문 파랑 노이즈였음. 검은 굵은 제목만 유지(수면과 동일 닻) */}
                          <h3 className="min-w-0 text-[13px] font-[700] text-textHeading truncate">{s.title}</h3>
                          {/* scope 칩: 짧은 환자군 라벨일 때만 제목 줄 오른쪽에 표시(전체·상황문구는 숨김) */}
                          {showScopeChip(s.scope) && (
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-[600] bg-primarySoft text-primary">
                              {s.scope}
                            </span>
                          )}
                        </div>
                        <p className="text-[14px] text-textBody leading-[1.7]">{s.gloss}</p>
                        {s.quote_display && (
                          <details className="mt-2 border-t border-borderHairline pt-2">
                            <summary className="cursor-pointer text-[12px] font-[600] text-mute hover:text-textBody transition-colors marker:content-none">근거 보기</summary>
                            <blockquote className="mt-2 border-l-[3px] border-borderHairline bg-bgSubtle rounded-r-[8px] px-3 py-2 text-[12.5px] text-textBody leading-relaxed not-italic">
                              "{s.quote_display}"
                            </blockquote>
                            {s.source && <p className="text-[11px] text-mute mt-1">{s.source}</p>}
                          </details>
                        )}
                      </div>
                    ))}

                    {/* 안전사용 안내 */}
                    {guide.safety_note && (
                      <div className="px-5 py-4">
                        <div className="flex items-center gap-2 mb-2">
                          <FontAwesomeIcon icon={faLightbulb} className="text-primary text-[13px]" />
                          <h3 className="text-[13px] font-[700] text-textHeading">안전사용 안내</h3>
                        </div>
                        <p className="text-[13px] text-subtext leading-relaxed">{guide.safety_note}</p>
                      </div>
                    )}
                  </div>
                </section>
              ) : (
                /* 레거시(구조화 이전, 마크다운 main_content) 폴백 */
                <section className="bg-white border border-borderHairline rounded-[10px] shadow-soft overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-borderHairline">
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faWandMagicSparkles} className="text-primary text-[14px]" />
                      <h2 className="text-[14px] font-[700] text-textHeading">오늘의 AI 복약 가이드</h2>
                    </div>
                    <span className="px-2 py-0.5 bg-primarySoft text-primary text-[10px] font-[700] rounded tracking-wider">AI</span>
                  </div>
                  <div className="px-5 py-4">
                    <FoldableMarkdown content={guide.main_content} />
                  </div>
                </section>
              )}

              {/* 참고 자료 — 검색된 출처 목록 (수면 가이드와 동일 형식) */}
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
