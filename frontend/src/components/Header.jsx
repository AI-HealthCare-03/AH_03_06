import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBell, faChevronLeft } from '@fortawesome/free-solid-svg-icons'

function Header({ variant = 'default', title, nickname, showDivider = true, rightAction, onBack }) {
  const navigate = useNavigate()

  if (variant === 'home') {
    return (
      <header className={`sticky top-0 z-40 bg-white ${showDivider ? 'border-b border-[#F4F4F5]' : ''} px-5 h-[72px] flex items-center justify-between`}>
        <div>
          <h1 className="text-[17px] font-[700] text-[#18181B] leading-tight tracking-tight">안녕하세요, {nickname}님 👋</h1>
          <p className="text-[12px] text-[#52525B] mt-0.5">오늘도 건강한 하루 보내세요</p>
        </div>
        <button className="relative w-11 h-11 flex items-center justify-center text-[#09090B] rounded-[8px]">
          <FontAwesomeIcon icon={faBell} className="text-[18px]" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
        </button>
      </header>
    )
  }

  if (variant === 'back') {
    return (
      <header className={`sticky top-0 z-40 bg-white ${showDivider ? 'border-b border-[#F4F4F5]' : ''} px-5 h-[72px] flex items-center justify-between`}>
        <button onClick={onBack || (() => navigate(-1))} className="w-11 h-11 flex items-center justify-start">
          <FontAwesomeIcon icon={faChevronLeft} className="text-[#18181B] text-[18px]" />
        </button>
        <h1 className="text-[16px] font-[700] text-[#18181B] tracking-tight">{title}</h1>
        {rightAction ? rightAction : <div className="w-11" />}
      </header>
    )
  }

  return (
    <header className={`sticky top-0 z-40 bg-white ${showDivider ? 'border-b border-[#F4F4F5]' : ''} px-5 h-[72px] flex items-center justify-center`}>
      <h1 className="text-[16px] font-[700] text-[#18181B] tracking-tight">{title}</h1>
    </header>
  )
}

export default Header