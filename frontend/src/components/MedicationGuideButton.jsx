import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons'
import { useNavigate } from 'react-router-dom'


const VARIANT_CLASSES = {
  primary: 'w-full h-12 text-[14px] rounded-[10px] gap-2',
  compact: 'h-8 px-3 text-[12px] rounded-md gap-1.5',
}


// 클릭 시 "생성 중" 스트리밍 화면으로 이동 — 토큰 라이브 표시 후 저장본으로 자동 이동.
function MedicationGuideButton({
  medicationId,
  medicationName,
  variant = 'primary',
  label,
  className = '',
}) {
  const navigate = useNavigate()

  if (!medicationId) return null

  const handleClick = () => {
    const params = new URLSearchParams({ medication_id: String(medicationId) })
    if (medicationName) params.set('drug_name', medicationName)
    navigate(`/medication-guides/generate?${params.toString()}`)
  }

  const variantClass = VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary
  const baseClass =
    'inline-flex items-center justify-center font-[700] transition-colors ' +
    'bg-primary hover:bg-primaryDark text-white ' +
    'disabled:bg-mute disabled:cursor-not-allowed'
  const finalLabel = label || 'AI 가이드 생성'

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`${medicationName ?? '약품'} AI 복약 가이드 생성`}
      className={`${baseClass} ${variantClass} ${className}`}
    >
      <FontAwesomeIcon
        icon={faWandMagicSparkles}
        className={variant === 'compact' ? 'text-[11px]' : 'text-[13px]'}
      />
      {finalLabel}
    </button>
  )
}

export default MedicationGuideButton
