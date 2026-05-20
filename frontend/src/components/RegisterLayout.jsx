import { useNavigate } from 'react-router-dom'

function RegisterLayout({ step, total = 7, title, subtitle, children, onNext, nextLabel = '다음', nextDisabled = false, subText, onSubText }) {
  const navigate = useNavigate()

  return (
    <div className="bg-white md:bg-[#F4F4F5] w-full min-h-[100dvh] flex justify-center items-center">
      <div className="w-full min-h-[100dvh] bg-white flex flex-col mx-auto md:max-w-[480px] md:min-h-[760px] md:rounded-[24px] md:shadow-2xl md:overflow-hidden md:my-8">

        {/* 상단 고정 */}
        <div className="sticky top-0 z-50 bg-white border-b border-gray-100">
          <header className="px-5 h-14 flex items-center justify-between">
            <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-start">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#18181B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
            <div className="w-10" />
          </header>
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
          {/* 제목 + 설명 */}
          <div className="px-6 pb-6">
            <h1 className="text-[24px] font-bold text-[#18181B] leading-tight mb-2">{title}</h1>
            {subtitle && <p className="text-[14px] text-[#71717A] leading-relaxed">{subtitle}</p>}
          </div>
        </div>

        {/* 스크롤 콘텐츠 */}
        <div className="flex-1 overflow-y-auto px-6 pt-4 pb-4">
          {children}
        </div>

        {/* 하단 고정 */}
        <div className="sticky bottom-0 bg-white px-6 pt-4 border-t border-gray-100">
          <button
            disabled={nextDisabled}
            onClick={onNext}
            className={`w-full h-[56px] rounded-[14px] text-[16px] font-bold transition-all ${!nextDisabled ? 'bg-primary text-white' : 'bg-[#E4E4E7] text-[#A1A1AA] cursor-not-allowed'}`}
          >
            {nextLabel}
          </button>
          <div className={`flex justify-center mt-4 pb-8 ${subText ? 'visible' : 'invisible'}`}>
            <span onClick={subText ? onSubText : undefined} className="text-[13px] text-[#71717A] cursor-pointer">
              {subText ?? '건너뛰기'}
            </span>
          </div>
        </div>

      </div>
    </div>
  )
}

export default RegisterLayout