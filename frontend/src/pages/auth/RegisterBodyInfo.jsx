import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import RegisterLayout from '../../components/RegisterLayout.jsx'

function RegisterBodyInfo() {
  const navigate = useNavigate()
  const location = useLocation()
  const prevState = location.state || {}

  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')

  const isFormValid =
    height !== '' && weight !== '' &&
    parseFloat(height) >= 100 && parseFloat(height) <= 250 &&
    parseFloat(weight) >= 20 && parseFloat(weight) <= 300

  return (
    <RegisterLayout
      step={4}
      title="신체 정보를 알려주세요"
      subtitle="BMI 계산과 가이드 정확도를 높이는 데 필요해요"
      onNext={() => navigate('/register/lifestyle', { state: { ...prevState, height: parseFloat(height), weight: parseFloat(weight) } })}
      nextDisabled={!isFormValid}
    >
      <div className="space-y-6">

        {/* 키 */}
        <div className="space-y-2">
          <label className="block text-[14px] font-medium text-[#18181B]">
            키 <span className="text-red-500">*</span>
          </label>
          <div className="relative flex items-center bg-[#F5F5F5] border border-transparent rounded-[12px] h-[56px] transition-all focus-within:border-primary focus-within:bg-white focus-within:shadow-[0_0_0_1px_#2563EB]">
            <input
              type="number"
              value={height}
              onChange={e => setHeight(e.target.value)}
              placeholder="예: 170"
              min="100" max="250"
              className="w-full h-full bg-transparent px-4 text-[15px] font-medium text-[#18181B] placeholder:text-[#A1A1AA] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="absolute right-4 text-[15px] font-medium text-[#71717A] pointer-events-none">cm</span>
          </div>
        </div>

        {/* 몸무게 */}
        <div className="space-y-2">
          <label className="block text-[14px] font-medium text-[#18181B]">
            몸무게 <span className="text-red-500">*</span>
          </label>
          <div className="relative flex items-center bg-[#F5F5F5] border border-transparent rounded-[12px] h-[56px] transition-all focus-within:border-primary focus-within:bg-white focus-within:shadow-[0_0_0_1px_#2563EB]">
            <input
              type="number"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              placeholder="예: 65"
              min="20" max="300"
              className="w-full h-full bg-transparent px-4 text-[15px] font-medium text-[#18181B] placeholder:text-[#A1A1AA] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="absolute right-4 text-[15px] font-medium text-[#71717A] pointer-events-none">kg</span>
          </div>
        </div>

      </div>
    </RegisterLayout>
  )
}

export default RegisterBodyInfo