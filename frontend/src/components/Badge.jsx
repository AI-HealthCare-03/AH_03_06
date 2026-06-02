import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

// 상태 뱃지 공유 컴포넌트
// tone: 의미 색 / variant: fill(기본·채움) · outline(예외·강조 단독 항목)
const TONES = {
  normal: {
    fill: 'bg-successSoft text-success',
    outline: 'bg-white text-success border border-success/30',
  },
  warning: {
    fill: 'bg-warning/10 text-warning',
    outline: 'bg-white text-warning border border-warning/40',
  },
  danger: {
    fill: 'bg-error/10 text-error',
    outline: 'bg-white text-error border border-error/40',
  },
  info: {
    fill: 'bg-primarySoft text-primary',
    outline: 'bg-white text-primary border border-primary/30',
  },
  neutral: {
    fill: 'bg-borderLight text-subtext',
    outline: 'bg-white text-subtext border border-borderHairline',
  },
}

function Badge({
  tone = 'neutral',
  variant = 'fill',
  pill = false,
  icon,
  children,
  className = '',
}) {
  const toneClass = (TONES[tone] || TONES.neutral)[variant] || TONES.neutral.fill
  const radius = pill ? 'rounded-full' : 'rounded-md'

  return (
    <span
      className={`inline-flex items-center gap-1 ${radius} px-2 py-0.5 text-[12px] font-[600] leading-none ${toneClass} ${className}`}
    >
      {icon && <FontAwesomeIcon icon={icon} className="text-[11px]" />}
      {children}
    </span>
  )
}

export default Badge
