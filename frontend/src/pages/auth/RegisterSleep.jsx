import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import RegisterLayout from '../../components/RegisterLayout.jsx'

function RegisterSleep() {
  const navigate = useNavigate()
  const location = useLocation()
  const prevState = location.state || {}

  const [sleepHours, setSleepHours] = useState('')
  const [sleepQuality, setSleepQuality] = useState('')
  const [sleepDisorder, setSleepDisorder] = useState('none')

  const qualityBtnClass = (selected) =>
    selected
      ? 'flex-1 aspect-square max-h-[56px] rounded-[12px] text-[15px] font-bold bg-[#EFF6FF] border border-primary text-primary transition-colors'
      : 'flex-1 aspect-square max-h-[56px] rounded-[12px] text-[15px] font-medium bg-white border border-[#E4E4E7] text-[#18181B] transition-colors'

  const disorderBtnClass = (selected) =>
    selected
      ? 'flex-1 h-[52px] rounded-[12px] text-[15px] font-bold bg-[#EFF6FF] border border-primary text-primary transition-colors'
      : 'flex-1 h-[52px] rounded-[12px] text-[15px] font-medium bg-white border border-[#E4E4E7] text-[#18181B] transition-colors'

  const handleNext = () => navigate('/register/health', {
    state: {
      ...prevState,
      sleep_hours: sleepHours ? parseFloat(sleepHours) : null,
      sleep_quality: sleepQuality ? parseInt(sleepQuality) : null,
      sleep_disorder: sleepDisorder || null,
    }
  })

  const handleSkip = () => navigate('/register/health', {
    state: {
      ...prevState,
      sleep_hours: null,
      sleep_quality: null,
      sleep_disorder: null,
    }
  })

  return (
    <RegisterLayout
      step={6}
      title="평소 수면은 어떠세요?"
      subtitle="수면 가이드 정확도를 높이는 데 도움이 돼요"
      onNext={handleNext}
    >
      <div className="space-y-8">

        {/* 평소 평균 수면 시간 */}
        <div className="space-y-2">
          <label className="block text-[14px] font-medium text-[#18181B]">
            평소 평균 수면 시간 <span className="text-[13px] text-[#A1A1AA] font-normal">(선택)</span>
          </label>
          <div className="relative flex items-center bg-[#F5F5F5] border border-transparent rounded-[12px] h-[56px] transition-all focus-within:border-primary focus-within:bg-white focus-within:shadow-[0_0_0_1px_#2563EB]">
            <input
              type="number"
              value={sleepHours}
              onChange={e => setSleepHours(e.target.value)}
              placeholder="예: 7"
              min="0" max="24" step="0.5"
              className="w-full h-full bg-transparent px-4 text-[15px] font-medium text-[#18181B] placeholder:text-[#A1A1AA] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="absolute right-4 text-[15px] font-medium text-[#71717A] pointer-events-none">시간</span>
          </div>
        </div>

        {/* 수면 질 */}
        <div className="space-y-3">
          <label className="block text-[14px] font-medium text-[#18181B]">
            수면 질 <span className="text-[13px] text-[#A1A1AA] font-normal">(선택)</span>
          </label>
          <div className="flex gap-2">
            {[1,2,3,4,5].map(q => (
              <button
                key={q}
                type="button"
                onClick={() => setSleepQuality(String(q))}
                className={qualityBtnClass(sleepQuality === String(q))}
              >
                {q}
              </button>
            ))}
          </div>
          <div className="flex justify-between px-1">
            <span className="text-[12px] font-medium text-[#A1A1AA]">매우 나쁨</span>
            <span className="text-[12px] font-medium text-[#A1A1AA]">매우 좋음</span>
          </div>
        </div>

        {/* 수면 장애 여부 */}
        <div className="space-y-3">
          <label className="block text-[14px] font-medium text-[#18181B]">
            수면 장애 여부 <span className="text-[13px] text-[#A1A1AA] font-normal">(선택)</span>
          </label>
          <div className="flex gap-3">
            <button type="button" onClick={() => setSleepDisorder('none')} className={disorderBtnClass(sleepDisorder === 'none')}>없음</button>
            <button type="button" onClick={() => setSleepDisorder('insomnia')} className={disorderBtnClass(sleepDisorder === 'insomnia')}>불면증</button>
          </div>
        </div>

      </div>
    </RegisterLayout>
  )
}

export default RegisterSleep