// MedicationGuidePreview — 데모용 페이지.
// drug_name 자동완성(필수) + user_query preset 칩(선택) → /preview 호출.
// 추후 medication_id 흐름과 통합 예정.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import Header from '../../components/Header.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faWandMagicSparkles,
  faCircleInfo,
  faTriangleExclamation,
  faBan,
} from '@fortawesome/free-solid-svg-icons'
import {
  previewMedicationGuide,
  fetchDrugSuggest,
} from '../../api/medicationGuides.js'

const DEFAULT_DRUG_NAME = '어린이타이레놀산160밀리그램(아세트아미노펜)'
const DEFAULT_USER_QUERY = '이 약 부작용이 뭐예요?'

const QUERY_PRESETS = [
  { label: '부작용', value: '이 약 부작용이 뭐예요?' },
  { label: '효능', value: '약 효능을 알고 싶어요' },
  { label: '주의사항', value: '주의사항이 있나요?' },
  { label: '복용법', value: '복용법을 알려주세요' },
  { label: '보관법', value: '보관법을 알려주세요' },
]

// 마크다운 → 시안 토큰 매핑 (Tailwind typography 플러그인 없이 ReactMarkdown components 만 사용)
const markdownComponents = {
  h1: ({ children }) => (
    <h2 className="text-[15px] font-[700] text-textHeading mt-4 mb-2">{children}</h2>
  ),
  h2: ({ children }) => (
    <h2 className="text-[14px] font-[700] text-textHeading mt-4 mb-2">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-[13px] font-[700] text-textHeading mt-3 mb-1">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-[14px] text-textBody leading-[1.85] my-3">{children}</p>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-primary bg-primarySoft py-3 px-4 mt-6 mb-3 text-[14px] text-textBody leading-relaxed not-italic">
      {children}
    </blockquote>
  ),
  ul: ({ children }) => <ul className="list-none space-y-1.5 my-2">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 my-2 text-[14px] text-textBody">{children}</ol>,
  li: ({ children }) => (
    <li className="flex items-start gap-2 text-[14px] text-textBody leading-relaxed">
      <span className="mt-2 w-1 h-1 rounded-full bg-mute flex-shrink-0"></span>
      <span>{children}</span>
    </li>
  ),
  strong: ({ children }) => <strong className="text-textHeading font-[700]">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ children }) => (
    <code className="bg-borderLight px-1 py-0.5 rounded text-[12px] font-mono">{children}</code>
  ),
  hr: () => <hr className="border-borderHairline my-3" />,
}

function MedicationGuidePreview() {
  const [searchParams] = useSearchParams()
  const [drugName, setDrugName] = useState(searchParams.get('drug_name') ?? DEFAULT_DRUG_NAME)
  const [userQuery, setUserQuery] = useState(searchParams.get('user_query') ?? DEFAULT_USER_QUERY)

  // 자동완성용 약품 목록 (서버사이드 디바운스로 갱신)
  const [drugList, setDrugList] = useState([])
  const [drugListTotal, setDrugListTotal] = useState(0)

  // 결과 상태
  const [guide, setGuide] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 디바운스 + AbortController refs — race condition 가드
  const debounceRef = useRef(null)
  const abortRef = useRef(null)

  // 마운트 시 1회 — 총 약품 수만 가져옴(라벨용). drugs 는 디폴트 drug_name 으로 별도 fetch.
  useEffect(() => {
    fetchDrugSuggest({ q: '', limit: 1 })
      .then((data) => setDrugListTotal(data.total ?? 0))
      .catch(() => {})
  }, [])

  // drug_name 변경 시 서버에 자동완성 질의 (250ms 디바운스 + AbortController).
  // 빈 입력이면 질의 생략. 자동완성 실패해도 페이지는 동작(수동 입력 가능).
  useEffect(() => {
    const q = drugName.trim()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    abortRef.current?.abort()
    if (!q) {
      setDrugList([])
      return
    }
    const ctrl = new AbortController()
    abortRef.current = ctrl
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await fetchDrugSuggest({ q, limit: 30 }, ctrl.signal)
        if (!ctrl.signal.aborted) setDrugList(data.drugs ?? [])
      } catch (err) {
        if (err?.name !== 'AbortError') {
          // 네트워크 에러 등 — datalist 만 비우고 페이지는 계속 동작
          setDrugList([])
        }
      }
    }, 250)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [drugName])

  // drug_name 입력이 목록의 어떤 약과 정확히 일치하면 그 item_seq 를 자동 추출.
  const matchedDrug = useMemo(
    () => drugList.find((d) => d.drug_name === drugName.trim()),
    [drugList, drugName],
  )
  const resolvedItemSeq = matchedDrug?.item_seq ?? ''

  const handleSubmit = async () => {
    if (!drugName.trim()) return
    setLoading(true)
    setError('')
    setGuide(null)
    try {
      const data = await previewMedicationGuide({
        item_seq: resolvedItemSeq,
        drug_name: drugName.trim(),
        user_query: userQuery.trim() || null,
      })
      setGuide(data)
    } catch (err) {
      setError(err?.message ?? '가이드 생성에 실패했어요.')
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = !loading && drugName.trim().length > 0

  return (
    <div className="bg-white md:bg-[#F4F4F5] w-full min-h-[100dvh] flex justify-center">
      <div className="w-full bg-white relative flex flex-col min-h-[100dvh] mx-auto md:max-w-[480px] md:rounded-[24px] md:shadow-2xl md:my-8 pb-10">

        {/* 상세 화면 컨벤션: 뒤로가기 헤더, BottomNav 없음 (기존 MedicationGuidePage 와 동일) */}
        <Header variant="back" title="복약 가이드 (데모)" />

        <main className="px-5 pt-5 pb-2 space-y-4">

          {/* 데모용 입력 카드 — 추후 medication_id 흐름 통합 시 제거 */}
          <section className="bg-bgSubtle border border-borderHairline rounded-[10px] p-4 space-y-4">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faCircleInfo} className="text-primary text-[13px]" />
              <h2 className="text-[12px] font-[700] text-textHeading">약품 검색 (데모)</h2>
            </div>

            {/* 약 이름 — 자동완성 (datalist) + 검색 가능 범위 안내 */}
            <div>
              <label className="text-[11px] font-[500] text-subtext block mb-1">
                약 이름 <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={drugName}
                onChange={(e) => setDrugName(e.target.value)}
                list="drug-suggest-list"
                placeholder="예: 타이레놀, 아스피린"
                className="w-full h-10 px-3 border border-borderHairline rounded-[8px] text-[13px] text-textBody placeholder:text-mute focus:border-primary focus:outline-none"
              />
              <datalist id="drug-suggest-list">
                {drugList.map((d) => (
                  <option key={d.item_seq} value={d.drug_name} />
                ))}
              </datalist>

              <div className="mt-1 space-y-0.5">
                <p className="text-[11px] text-mute">
                  {drugListTotal > 0
                    ? `검색 가능 ${drugListTotal}종 (복약 가이드 제공 약품 · 입력 시 자동완성)`
                    : '검색 가능 목록을 불러오는 중…'}
                </p>
                {matchedDrug && (
                  <p className="text-[11px] text-primary">
                    매칭됨 · item_seq={matchedDrug.item_seq}
                  </p>
                )}
                {drugName.trim() && !matchedDrug && drugList.length > 0 && (
                  <p className="text-[11px] text-warning flex items-center gap-1">
                    <FontAwesomeIcon icon={faTriangleExclamation} className="text-[10px]" />
                    검색 목록에 없는 약품 — 결과가 부정확하거나 폴백으로 표시될 수 있어요
                  </p>
                )}
              </div>
            </div>

            {/* 질문 유형 — preset 칩 + 자유 입력 (칩 누르면 input 에 자동 채워짐, 다시 누르면 해제) */}
            <div>
              <label className="text-[11px] font-[500] text-subtext block mb-2">
                질문 유형 <span className="text-mute font-[400]">(선택)</span>
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {QUERY_PRESETS.map((preset) => {
                  const active = userQuery === preset.value
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setUserQuery(active ? '' : preset.value)}
                      className={`px-2.5 py-1 rounded-md text-[12px] font-[500] border transition-colors ${
                        active
                          ? 'bg-primarySoft border-primary text-primary'
                          : 'bg-white border-borderHairline text-textBody hover:border-borderStrong'
                      }`}
                    >
                      {preset.label}
                    </button>
                  )
                })}
              </div>
              <input
                type="text"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="직접 입력하거나 위 칩 선택"
                className="w-full h-10 px-3 border border-borderHairline rounded-[8px] text-[13px] text-textBody placeholder:text-mute focus:border-primary focus:outline-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full h-10 bg-primary hover:bg-primaryDark text-white text-[13px] font-[700] rounded-[8px] transition-colors disabled:bg-mute disabled:cursor-not-allowed"
            >
              {loading ? '생성 중…' : '가이드 받기'}
            </button>
          </section>

          {/* 로딩 — 5~10초 걸리는 LLM 응답을 대기하는 안내 */}
          {loading && (
            <p className="text-[13px] text-mute text-center py-10">
              AI가 복약 안내를 생성하고 있어요…
            </p>
          )}

          {/* 호출 자체 실패 (서버 5xx, 네트워크 끊김 등) — fallback 과 구분 */}
          {!loading && error && (
            <p className="text-[13px] text-error text-center py-10">{error}</p>
          )}

          {/* 가이드 결과 */}
          {!loading && !error && guide && (
            <>
              {/* drug_name 본문 상단 제목 (고정 Header 아님 — 디자인 규칙) */}
              {guide.drug_name && (
                <h1 className="text-[20px] font-[700] text-textHeading leading-tight pt-1">
                  {guide.drug_name}
                </h1>
              )}

              {/* 안전 카드 (조건부) — DUR 연결 후 채워질 슬롯. 현재 셋 다 null. */}
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

              {/* 본문: fallback 분기 — 빨강(error) 금지, primarySoft 톤으로 차분하게 */}
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

                    {/* 복약 안내 본문 — 마크다운 렌더 (발췌 blockquote, 📚/💡/ⓘ 섹션 헤더 포함) */}
                    <div className="px-5 py-4">
                      <h3 className="text-[11px] font-[700] text-mute mb-2 tracking-wider uppercase">
                        복약 안내
                      </h3>
                      <div>
                        <ReactMarkdown components={markdownComponents}>
                          {guide.main_content}
                        </ReactMarkdown>
                      </div>
                    </div>

                    {/* 출처 (조건부, 현재 항상 null — DUR 연결 후 구조화) */}
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

                    {/* 안전 권고 (조건부) */}
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

              {/* (예약) "함께 복용 시 주의" — 다약 상호작용(DUR) 섹션 슬롯. 현재 데이터 없음. */}

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

export default MedicationGuidePreview
