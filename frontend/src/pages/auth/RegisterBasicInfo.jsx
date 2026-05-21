import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FormLayout from '../../components/FormLayout.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendar } from '@fortawesome/free-solid-svg-icons'

function RegisterBasicInfo() {
  const navigate = useNavigate()
  const [birthday, setBirthday] = useState('')
  const [gender, setGender] = useState('')

  const isFormValid = birthday && gender

  const radioClass = (selected) =>
    selected
      ? 'flex-1 h-[56px] rounded-[12px] text-[15px] font-bold bg-[#EFF6FF] border border-primary text-primary transition-colors'
      : 'flex-1 h-[56px] rounded-[12px] text-[15px] font-medium bg-white border border-[#E4E4E7] text-[#18181B] transition-colors'

  return (
    <FormLayout
      step={3}
      showProgress
      title="기본 정보를 알려주세요"
      subtitle="맞춤 건강 가이드를 위해 필요한 정보예요"
      onNext={() => navigate('/register/body-info', { state: { birthday, gender } })}
      nextDisabled={!isFormValid}
    >
      <div className="space-y-8">

        {/* 생년월일 */}
        <div className="space-y-2">
          <label className="block text-[14px] font-medium text-[#18181B]">
            생년월일 <span className="text-red-500">*</span>
          </label>
          <div className="relative flex items-center bg-[#F5F5F5] border border-transparent rounded-[12px] h-[56px] transition-all focus-within:border-primary focus-within:bg-white focus-within:shadow-[0_0_0_1px_#2563EB]">
            <input
              type="date"
              value={birthday}
              onChange={e => setBirthday(e.target.value)}
              min="1926-01-01"
              max="2012-01-01"
              className="w-full h-full bg-transparent px-4 text-[15px] font-medium text-[#18181B] outline-none cursor-pointer appearance-none"
              style={{ colorScheme: 'light' }}
            />
            <div className="absolute right-4 text-[#71717A] pointer-events-none">
              <FontAwesomeIcon icon={faCalendar} className="text-[18px]" />
            </div>
          </div>
          <p className="text-[13px] font-medium text-[#71717A] mt-1">만 14세 이상 가입 가능합니다</p>
        </div>

        {/* 성별 */}
        <div className="space-y-3">
          <label className="block text-[14px] font-medium text-[#18181B]">
            성별 <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-3">
            <button type="button" onClick={() => setGender('M')} className={radioClass(gender === 'M')}>남성</button>
            <button type="button" onClick={() => setGender('F')} className={radioClass(gender === 'F')}>여성</button>
          </div>
        </div>

      </div>
    </FormLayout>
  )
}

export default RegisterBasicInfo