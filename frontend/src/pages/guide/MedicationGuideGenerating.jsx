// 복약 가이드 "생성 중" 화면 — /generate-stream 토큰을 라이브로 받아 표시하고,
// done 이벤트의 guide_id 로 저장된 가이드 상세로 이동한다.
// 진입: /medication-guides/generate?medication_id=<id>&drug_name=<name>

import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Header from '../../components/Header.jsx'
import FoldableMarkdown from '../../components/FoldableMarkdown.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons'
import { generateMedicationGuideStream } from '../../api/medicationGuides.js'

export default function MedicationGuideGenerating() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const medicationId = searchParams.get('medication_id')

  const [drugName, setDrugName] = useState(searchParams.get('drug_name') ?? '')
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const startedRef = useRef(false)  // 스트림 중복 시작 가드 (이중 마운트 시 가이드 2개 저장 방지)

  useEffect(() => {
    if (!medicationId) {
      setError('처방 정보가 없어요.')
      return
    }
    if (startedRef.current) return
    startedRef.current = true

    generateMedicationGuideStream(Number(medicationId), {
      onMeta: (m) => { if (m.drug_name) setDrugName(m.drug_name) },
      onToken: (t) => setContent((prev) => prev + t),
      onDone: (evt) => {
        if (evt?.guide_id) navigate(`/medication-guides/${evt.guide_id}`, { replace: true })
      },
    }).catch((err) => setError(err?.message ?? 'AI 가이드 생성에 실패했어요.'))
  }, [medicationId, navigate])

  return (
    <div className="bg-white md:bg-[#F4F4F5] w-full min-h-[100dvh] flex justify-center">
      <div className="w-full bg-white relative flex flex-col min-h-[100dvh] mx-auto md:max-w-[480px] md:rounded-[24px] md:shadow-2xl md:my-8 pb-10">

        <Header variant="back" title="복약 가이드 생성" />

        <main className="px-5 pt-5 pb-2 space-y-4">
          {drugName && (
            <h1 className="text-[20px] font-[700] text-textHeading leading-tight pt-1">{drugName}</h1>
          )}

          {error ? (
            <div className="bg-bgSubtle border border-borderHairline rounded-[12px] p-6 text-center mt-6">
              <p className="text-[13px] text-error mb-3">{error}</p>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="text-[13px] font-[700] text-primary"
              >
                돌아가기
              </button>
            </div>
          ) : (
            <section className="bg-white border border-borderHairline rounded-[10px] shadow-soft overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-borderHairline">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faWandMagicSparkles} className="text-primary text-[14px]" />
                  <h2 className="text-[14px] font-[700] text-textHeading">오늘의 AI 복약 가이드</h2>
                </div>
                <span className="px-2 py-0.5 bg-primarySoft text-primary text-[10px] font-[700] rounded tracking-wider">AI</span>
              </div>

              <div className="px-5 py-4">
                {content ? (
                  // 스트리밍 중엔 fold 끔 — 완료 후 저장본(MedicationGuidePage)에서 접힘 적용됨
                  <FoldableMarkdown content={content} foldEnabled={false} />
                ) : (
                  <div className="flex items-center gap-3 py-2">
                    <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
                    <p className="text-[13px] text-mute">AI가 식약처 자료를 찾아 가이드를 작성하고 있어요…</p>
                  </div>
                )}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  )
}
