// 복약 가이드 "생성 중" 화면 — 블로킹 생성(5~10초) 후 guide_id 로 저장된 상세로 이동.
// 대기 UX 는 식단·수면·운동과 동일한 GuideGeneratingSteps(단계 진행) 사용.
// 진입: /medication-guides/generate?medication_id=<id>&drug_name=<name>

import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Header from '../../components/Header.jsx'
import GuideGeneratingSteps from '../../components/GuideGeneratingSteps.jsx'
import { MEDICATION_GENERATING } from '../../components/guideGeneratingPresets.js'
import { generateMedicationGuide } from '../../api/medicationGuides.js'

export default function MedicationGuideGenerating() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const medicationId = searchParams.get('medication_id')
  const drugName = searchParams.get('drug_name') ?? ''
  const [error, setError] = useState('')
  const startedRef = useRef(false)  // 중복 생성 가드 (이중 마운트 시 가이드 2개 저장 방지)

  useEffect(() => {
    if (!medicationId) {
      setError('처방 정보가 없어요.')
      return
    }
    if (startedRef.current) return
    startedRef.current = true

    generateMedicationGuide(Number(medicationId))
      .then((res) => {
        if (res?.guide_id) navigate(`/medication-guides/${res.guide_id}`, { replace: true })
        else setError('생성 결과를 받지 못했어요.')
      })
      .catch((err) => setError(err?.message ?? 'AI 가이드 생성에 실패했어요.'))
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
            <div className="flex flex-col items-center justify-center py-16">
              <GuideGeneratingSteps {...MEDICATION_GENERATING} />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
