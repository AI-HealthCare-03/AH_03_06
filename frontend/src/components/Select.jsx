import { useState, useRef, useEffect } from 'react'

// 네이티브 select 대체용 커스텀 드롭다운 (옵션 글자 크기·디자인 직접 제어)
// value/onChange는 값(이벤트 아님)으로 동작: onChange(nextValue)
// className=트리거 버튼 스타일, wrapperClassName=바깥 relative 박스 레이아웃(flex-1 등)
function Select({ value, onChange, options, className = '', wrapperClassName = '', placeholder = '선택', disabled = false }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const selected = options.find(o => String(o.value) === String(value))

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className={`relative ${wrapperClassName}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className={`${className} flex items-center justify-between gap-1.5 text-left appearance-none cursor-pointer disabled:cursor-not-allowed`}
      >
        <span className={`truncate ${selected ? '' : 'text-[#A1A1AA]'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <svg className={`w-4 h-4 shrink-0 text-[#A1A1AA] transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <ul role="listbox"
          className="absolute z-50 left-0 min-w-full w-max max-w-[calc(100vw-2.5rem)] top-[calc(100%+4px)] max-h-60 overflow-y-auto bg-white border border-[#E4E4E7] rounded-[12px] shadow-lg py-1">
          {options.map(o => {
            const isSel = String(o.value) === String(value)
            return (
              <li key={String(o.value)} role="option" aria-selected={isSel}
                onClick={() => { onChange(o.value); setOpen(false) }}
                className={`flex items-center gap-2 px-4 py-2.5 text-[15px] whitespace-nowrap cursor-pointer ${isSel ? 'bg-[#EFF6FF] text-primary font-semibold' : 'text-[#18181B] hover:bg-[#F4F4F5]'}`}>
                <span className="w-4 shrink-0 text-primary text-center">{isSel ? '✓' : ''}</span>
                <span>{o.label}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default Select
