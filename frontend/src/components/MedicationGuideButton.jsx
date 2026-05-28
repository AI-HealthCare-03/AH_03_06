import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons'
import { generateMedicationGuide } from '../api/medicationGuides.js'


const VARIANT_CLASSES = {
  primary: 'w-full h-12 text-[14px] rounded-[10px] gap-2',
  compact: 'h-8 px-3 text-[12px] rounded-md gap-1.5',
}


function MedicationGuideButton({
  medicationId,
  medicationName,
  variant = 'primary',
  label,
  onSuccess,
  onError,
  className = '',
}) {
  const [loading, setLoading] = useState(false)

  if (!medicationId) return null

  const handleClick = async () => {
    setLoading(true)
    try {
      const res = await generateMedicationGuide(medicationId, false)
      if (onSuccess) onSuccess(res, { medicationId, medicationName })
    } catch (err) {
      if (onError) onError(err)
      else window.alert(err?.message ?? 'AI 가이드 생성에 실패했어요.')
    } finally {
      setLoading(false)
    }
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
      disabled={loading}
      aria-label={`${medicationName ?? '약품'} AI 복약 가이드 생성`}
      className={`${baseClass} ${variantClass} ${className}`}
    >
      <FontAwesomeIcon
        icon={faWandMagicSparkles}
        className={variant === 'compact' ? 'text-[11px]' : 'text-[13px]'}
      />
      {loading ? '생성 중…' : finalLabel}
    </button>
  )
}

export default MedicationGuideButton
