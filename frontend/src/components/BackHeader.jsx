import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons'

function BackHeader({ title, subtitle }) {
  const navigate = useNavigate()

  return (
    <div className="sticky top-0 z-50 bg-white border-b border-gray-100">
      <header className="px-5 h-14 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-start">
          <FontAwesomeIcon icon={faChevronLeft} className="text-[#18181B] text-[18px]" />
        </button>
        <div className="w-10" />
      </header>
      {title && (
        <div className="px-6 pb-6">
          <h1 className="text-[24px] font-bold text-[#18181B] leading-tight mb-2">{title}</h1>
          {subtitle && <p className="text-[14px] text-[#71717A] leading-relaxed">{subtitle}</p>}
        </div>
      )}
    </div>
  )
}

export default BackHeader