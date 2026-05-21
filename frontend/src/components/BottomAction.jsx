function BottomAction({ label = '다음', onClick, disabled = false, subText, onSubText }) {
  return (
    <div className="sticky bottom-0 bg-white px-6 pt-4 border-t border-gray-100">
      <button
        disabled={disabled}
        onClick={onClick}
        className={`w-full h-[56px] rounded-[14px] text-[16px] font-bold transition-all ${!disabled ? 'bg-primary text-white' : 'bg-[#E4E4E7] text-[#A1A1AA] cursor-not-allowed'}`}
      >
        {label}
      </button>
      <div className={`flex justify-center mt-4 pb-8 ${subText ? 'visible' : 'invisible'}`}>
        <span onClick={subText ? onSubText : undefined} className="text-[13px] text-[#71717A] cursor-pointer">
          {subText ?? '건너뛰기'}
        </span>
      </div>
    </div>
  )
}

export default BottomAction