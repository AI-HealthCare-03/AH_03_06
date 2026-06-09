import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getAccessToken } from '../../utils/token.js'
import FormLayout from '../../components/FormLayout.jsx'

const base = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

// OCR 평균 소요시간을 남기는 로그/계측이 없어 상한값으로 60초를 둔다.
// (정상 요청은 훨씬 빨라 끊기지 않음. 업로드 구간·서버 행으로 인한 무한 스피너 방지가 목적.)
const OCR_TIMEOUT_MS = 60000

export default function PrescriptionOCRProcessing() {
  const navigate = useNavigate()
  const { state } = useLocation()

  useEffect(() => {
    if (!state?.file) {
      navigate('/medical-records/ocr', { replace: true })
      return
    }

    const controller = new AbortController()
    let timedOut = false
    const timeoutId = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, OCR_TIMEOUT_MS)

    async function callOcr(file) {
      try {
        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch(`${base}/ocr/prescription`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${getAccessToken()}` },
          body: formData,
          signal: controller.signal,
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data?.detail ?? '처방전을 인식하지 못했어요.')

        clearTimeout(timeoutId)
        navigate('/medical-records/ocr/result', {
          replace: true,
          state: { ocrData: data, previewUrl: state.previewUrl },
        })
      } catch (e) {
        clearTimeout(timeoutId)
        if (e.name === 'AbortError') {
          // 타임아웃으로 끊은 경우에만 안내하며 업로드 화면으로 복귀.
          // 화면 이탈(언마운트)에 의한 취소면 아무 동작도 하지 않는다.
          if (timedOut) {
            navigate('/medical-records/ocr', {
              replace: true,
              state: { error: '처방전 인식이 너무 오래 걸려요. 잠시 후 다시 시도해 주세요.' },
            })
          }
          return
        }
        navigate('/medical-records/ocr', {
          replace: true,
          state: { error: e.message ?? '처방전을 인식하지 못했어요. 다시 시도해 주세요.' },
        })
      }
    }

    callOcr(state.file)

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [])

  return (
    <FormLayout
      title="사진으로 진료기록 추가"
      nextLabel="인식 중..."
      nextDisabled={true}
    >
      <div className="flex items-start gap-3 bg-blue-50 rounded-2xl px-4 py-3.5 mb-4 shrink-0">
        <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-blue-700 leading-relaxed">
          처방전 사진을 찍으면 진료 정보를 자동으로 입력해 드려요.
          인식 결과를 확인하고 필요한 항목만 수정해 주세요.
        </p>
      </div>

      <div
        className="flex-1 relative rounded-3xl overflow-hidden bg-neutral-100"
        style={{ backgroundImage: state?.previewUrl ? `url(${state.previewUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-white/40 border-t-white rounded-full animate-spin" />
          <p className="text-sm font-semibold text-white">처방전 인식 중...</p>
          <p className="text-xs text-white/70">잠시만 기다려 주세요</p>
        </div>
      </div>
    </FormLayout>
  )
}