// 칩 공유 컴포넌트
// action  = 액션 트리거(각진·진한 파란 채움·흰 텍스트): 누르면 즉시 동작
// option  = 폼 옵션(알약·옅은 파랑·진한 파랑 텍스트): 폼 안 선택 상태 표시
function Chip({ variant = 'option', selected = false, onClick, children, className = '' }) {
  const base = 'inline-flex items-center justify-center text-[13px] font-[500] transition-colors'

  let toneClass
  if (variant === 'action') {
    // 선택 시 진한 파란 채움, 미선택은 중립 회색
    toneClass = `rounded-md px-3 py-1.5 ${
      selected ? 'bg-primary text-white' : 'bg-borderLight text-subtext hover:bg-borderHairline'
    }`
  } else {
    // option (pill)
    toneClass = `rounded-full px-3.5 py-1.5 border ${
      selected
        ? 'bg-primarySoft text-primary border-primary'
        : 'bg-white text-subtext border-borderHairline'
    }`
  }

  return (
    <button type="button" onClick={onClick} className={`${base} ${toneClass} ${className}`}>
      {children}
    </button>
  )
}

export default Chip
