import { useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import FormLayout from '../../components/FormLayout.jsx'

export default function PrescriptionOCRUpload() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const fileInputRef = useRef(null)

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const previewUrl = URL.createObjectURL(file)
    navigate('/medical-records/ocr/processing', { state: { file, previewUrl } })
  }

  return (
    <FormLayout
      title="사진으로 진료기록 추가"
      onNext={() => fileInputRef.current?.click()}
      nextLabel="처방전 촬영 또는 업로드"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

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
        onClick={() => fileInputRef.current?.click()}
        className="flex-1 w-full flex flex-col items-center justify-center gap-4 border-2 border-dashed border-neutral-200 rounded-3xl bg-neutral-50 active:bg-neutral-100 transition-colors cursor-pointer"
      >
        <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center">
          <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-neutral-700">처방전 촬영 또는 업로드</p>
          <p className="text-xs text-neutral-400 mt-1">탭하여 카메라를 열거나 갤러리에서 선택</p>
        </div>
      </div>

      {state?.error && (
        <p className="text-xs text-red-500 text-center mt-3 shrink-0">{state.error}</p>
      )}
    </FormLayout>
  )
}