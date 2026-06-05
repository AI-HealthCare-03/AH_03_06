// 복약 가이드 미리보기 — 진료기록에서 약 탭 시 진입. drug_name 자동완성 + 질문 preset → /preview.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Header from '../../components/Header.jsx'
import GuideGeneratingSteps from '../../components/GuideGeneratingSteps.jsx'
import { MEDICATION_GENERATING } from '../../components/guideGeneratingPresets.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faWandMagicSparkles,
  faCircleInfo,
  faTriangleExclamation,
  faBan,
  faLightbulb,
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

// scope 가 '전체'류면 칩 생략(약 전체 적용은 굳이 표시 안 함), 특정 환자군일 때만 파랑 칩
const isAllScope = (s) => !s || ['전체', '이 약 전체', '약 전체'].includes(s.trim())

// 칩은 '임부·소아·간질환자' 같은 짧은 환자군 라벨일 때만.
// 모델이 scope에 상황 문구("투여 중지 후 …사용 시")를 넣으면 길어져 제목을 잘라먹으므로 숨김.
const SCOPE_SITUATIONAL = /사용|복용|투여|경우/
const showScopeChip = (s) => {
  const v = (s || '').trim()
  return !!v && !isAllScope(v) && v.length <= 10 && !SCOPE_SITUATIONAL.test(v)
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
  // 처방 카드 등에서 item_seq 를 직접 넘긴 경우(약명 정확 일치 불필요) 그 값을 우선 사용.
  // 단 URL 의 item_seq 는 약명을 그대로 둔 동안만 유효 — 약명을 바꾸면 stale item_seq 를 버린다
  // (다른 약명 입력 시 이전 약의 item_seq 가 재사용돼 엉뚱한 약 데이터가 그 이름표로 나오는 것 방지).
  const urlDrugName = searchParams.get('drug_name') ?? DEFAULT_DRUG_NAME
  const resolvedItemSeq =
    matchedDrug?.item_seq ||
    (drugName.trim() === urlDrugName.trim() ? (searchParams.get('item_seq') ?? '') : '')

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
        <Header variant="back" title="복약 가이드" />

        <main className="px-5 pt-5 pb-2 space-y-4">

          <section className="bg-bgSubtle border border-borderHairline rounded-[10px] p-4 space-y-4">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faCircleInfo} className="text-primary text-[13px]" />
              <h2 className="text-[12px] font-[700] text-textHeading">약품 검색</h2>
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

          {/* 생성 중(블로킹 5~10초) — 식단·수면과 동일 단계 대기화면 */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <GuideGeneratingSteps {...MEDICATION_GENERATING} />
            </div>
          )}

          {/* 호출 자체 실패 (서버 5xx, 네트워크 끊김 등) — fallback 과 구분 */}
          {!loading && error && (
            <p className="text-[13px] text-error text-center py-10">{error}</p>
          )}

          {/* 가이드 결과 (블로킹 완료 후) */}
          {!loading && !error && guide && (
            <>
              {/* drug_name 본문 상단 제목 (고정 Header 아님 — 디자인 규칙) */}
              {guide.drug_name && (
                <h1 className="text-[20px] font-[700] text-textHeading leading-tight pt-1">
                  {guide.drug_name}
                </h1>
              )}

              {/* 안전 카드 (조건부) */}
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

              {/* 본문 — fallback 이면 안내 카드, 아니면 구조화 섹션 카드 (MedicationGuidePage 와 동일) */}
              {guide.is_fallback ? (
                <section className="bg-primarySoft border border-primary/20 rounded-[10px] p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <FontAwesomeIcon icon={faCircleInfo} className="text-primary text-[16px]" />
                    <h2 className="text-[14px] font-[700] text-primary">안내드릴 정보가 부족해요</h2>
                  </div>
                  <p className="text-[13px] text-textBody leading-relaxed">{guide.fallback_message}</p>
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
                    {guide.key_point && (
                      <div className="px-5 py-4">
                        <div className="flex items-center gap-2 mb-2">
                          <FontAwesomeIcon icon={faLightbulb} className="text-primary text-[13px]" />
                          <h3 className="text-[13px] font-[700] text-textHeading">지금 가장 중요한 포인트</h3>
                        </div>
                        <p className="text-[15px] font-[500] text-textBody leading-[1.7]">{guide.key_point}</p>
                      </div>
                    )}

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
