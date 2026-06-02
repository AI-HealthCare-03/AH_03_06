// 버튼 공유 컴포넌트 (가이드 v0.3 §5.3)
// primary=진한 파란 채움 · secondary=흰+파란 보더 · danger=빨강 텍스트 · ghost=텍스트 링크
// 비활성은 variant 무관하게 회색 채움(--subtle)으로 통일 (A-4)
const VARIANTS = {
  primary: 'bg-primary hover:bg-primaryDark text-white',
  secondary: 'bg-white border border-primary text-primary',
  danger: 'bg-white border border-error text-error',
  ghost: 'bg-transparent text-primary font-[600]',
}

function Button({
  variant = 'primary',
  full = false,
  disabled = false,
  type = 'button',
  onClick,
  children,
  className = '',
}) {
  const width = full ? 'w-full' : ''
  const shape = variant === 'ghost' ? '' : 'h-12 rounded-[10px] px-4'
  const tone = disabled
    ? 'bg-borderLight text-mute cursor-not-allowed'
    : VARIANTS[variant] || VARIANTS.primary

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center text-[14px] font-[700] transition-colors ${shape} ${width} ${tone} ${className}`}
    >
      {children}
    </button>
  )
}

export default Button
