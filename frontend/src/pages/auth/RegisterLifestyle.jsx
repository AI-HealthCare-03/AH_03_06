import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import FormLayout from '../../components/FormLayout.jsx'

function RegisterLifestyle() {
  const navigate = useNavigate()
  const location = useLocation()
  const prevState = location.state || {}

  const [smoking, setSmoking] = useState('none')
  const [drinking, setDrinking] = useState('none')
  const [exercise, setExercise] = useState('none')
  const [exerciseDays, setExerciseDays] = useState('')

  const btnClass = (selected) =>
    selected
      ? 'flex-1 h-[56px] rounded-[12px] text-[15px] font-bold bg-[#EFF6FF] border border-primary text-primary transition-colors'
      : 'flex-1 h-[56px] rounded-[12px] text-[15px] font-medium bg-white border border-[#E4E4E7] text-[#18181B] transition-colors'

  const handleNext = () => navigate('/register/sleep', {
    state: {
      ...prevState,
      smoking: smoking || null,
      drinking: drinking || null,
      exercise: exercise || null,
      exercise_days: exercise === 'yes' && exerciseDays ? parseInt(exerciseDays) : null,
    }
  })

  const handleSkip = () => navigate('/register/sleep', {
    state: {
      ...prevState,
      smoking: null,
      drinking: null,
      exercise: null,
      exercise_days: null,
    }
  })

  return (
    <FormLayout
      step={5}
      showProgress
      title="생활 습관을 알려주세요"
      subtitle="건강 가이드 정확도를 높이는 데 도움이 돼요"
      onNext={handleNext}
    >
      <div className="space-y-8">

        {/* 흡연 */}
        <div className="space-y-3">
          <label className="block text-[14px] font-medium text-[#18181B]">
            흡연 <span className="text-[13px] text-[#A1A1AA] font-normal">(선택)</span>
          </label>
          <div className="flex gap-3">
            <button type="button" onClick={() => setSmoking('none')} className={btnClass(smoking === 'none')}>비흡연</button>
            <button type="button" onClick={() => setSmoking('smoking')} className={btnClass(smoking === 'smoking')}>흡연</button>
            <button type="button" onClick={() => setSmoking('quit')} className={btnClass(smoking === 'quit')}>금연</button>
          </div>
        </div>

        {/* 음주 */}
        <div className="space-y-3">
          <label className="block text-[14px] font-medium text-[#18181B]">
            음주 <span className="text-[13px] text-[#A1A1AA] font-normal">(선택)</span>
          </label>
          <div className="flex gap-3">
            <button type="button" onClick={() => setDrinking('none')} className={btnClass(drinking === 'none')}>비음주</button>
            <button type="button" onClick={() => setDrinking('drinking')} className={btnClass(drinking === 'drinking')}>음주</button>
          </div>
        </div>

        {/* 운동 */}
        <div className="space-y-3">
          <label className="block text-[14px] font-medium text-[#18181B]">
            운동 <span className="text-[13px] text-[#A1A1AA] font-normal">(선택)</span>
          </label>
          <div className="flex gap-3">
            <button type="button" onClick={() => { setExercise('none'); setExerciseDays('') }} className={btnClass(exercise === 'none')}>안 함</button>
            <button type="button" onClick={() => setExercise('yes')} className={btnClass(exercise === 'yes')}>함</button>
          </div>

          {exercise === 'yes' && (
            <div className="relative flex items-center bg-[#F5F5F5] border border-transparent rounded-[12px] h-[56px] transition-all focus-within:border-primary focus-within:bg-white focus-within:shadow-[0_0_0_1px_#2563EB] mt-3">
              <input
                type="number"
                value={exerciseDays}
                onChange={e => setExerciseDays(e.target.value)}
                placeholder="주당 운동 횟수"
                min="1" max="7"
                className="w-full h-full bg-transparent px-4 text-[15px] font-medium text-[#18181B] placeholder:text-[#A1A1AA] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="absolute right-4 text-[15px] font-medium text-[#71717A] pointer-events-none">회/주</span>
            </div>
          )}
        </div>

      </div>
    </FormLayout>
  )
}

export default RegisterLifestyle