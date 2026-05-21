import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons'
import BottomAction from './BottomAction.jsx'

function FormLayout({ step, total = 7, title, subtitle, children, onNext, nextLabel = '다음', nextDisabled = false, subText, onSubText, showProgress = false }) {
  const navigate = useNavigate()

  return (
    <div className="bg-white md:bg-[#F4F4F5] w-full min-h-[100dvh] flex justify-center items-center">
      <div className="w-full min-h-[100dvh] bg-white flex flex-col mx-auto md:max-w-[480px] md:min-h-[760px] md:rounded-[24px] md:shadow-2xl md:overflow-hidden md:my-8">

        <div className="sticky top-0 z-50 bg-white border-b border-gray-100">
          <header className="px-5 h-14 flex items-center justify-between">
            <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-start">
              <FontAwesomeIcon icon={faChevronLeft} className="text-[#18181B] text-[18px]" />
            </button>
            <div className="w-10" />
          </header>
          {showProgress && (
            <div className="px-5 pt-2 pb-4">
              <div className="flex gap-1.5 h-1.5 w-full">
                {Array.from({ length: total }, (_, i) => (
                  <div key={i} className={`h-full flex-1 rounded-full ${i < step ? 'bg-primary' : 'bg-[#E4E4E7]'}`} />
                ))}
              </div>
              <div className="flex justify-end mt-2">
                <span className="text-[12px] font-medium text-[#71717A]">{step}/{total} 단계</span>
              </div>
            </div>
          )}
          <div className="px-6 pb-6">
            <h1 className="text-[24px] font-bold text-[#18181B] leading-tight mb-2">{title}</h1>
            {subtitle && <p className="text-[14px] text-[#71717A] leading-relaxed">{subtitle}</p>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pt-4 pb-4">
          {children}
        </div>

        <BottomAction
          label={nextLabel}
          onClick={onNext}
          disabled={nextDisabled}
          subText={subText}
          onSubText={onSubText}
        />

      </div>
    </div>
  )
}

export default FormLayout