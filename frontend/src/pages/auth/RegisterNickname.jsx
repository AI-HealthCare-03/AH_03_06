import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAccessToken } from '../../utils/token.js'
import FormLayout from '../../components/FormLayout.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo, faRotateRight } from '@fortawesome/free-solid-svg-icons'

const base = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

function RegisterNickname() {
  const navigate = useNavigate()
  const [nickname, setNickname] = useState('')
  const [helperText, setHelperText] = useState('한글·영문·숫자 2~20자')
  const [helperColor, setHelperColor] = useState('text-[#A1A1AA]')
  const [isValid, setIsValid] = useState(false)
  const [spinning, setSpinning] = useState(true) // 마운트 시 추천 닉네임 로딩으로 시작
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const validate = (value) => {
    const lengthOK = value.length >= 2 && value.length <= 20
    const charOK = /^[가-힣a-zA-Z0-9]+$/.test(value)
    if (value === '') {
      setHelperText('한글·영문·숫자 2~20자')
      setHelperColor('text-[#A1A1AA]')
      setIsValid(false)
    } else if (!lengthOK) {
      setHelperText('2~20자로 입력해주세요')
      setHelperColor('text-red-500')
      setIsValid(false)
    } else if (!charOK) {
      setHelperText('한글, 영문, 숫자만 사용할 수 있어요')
      setHelperColor('text-red-500')
      setIsValid(false)
    } else {
      setHelperText('사용 가능한 닉네임이에요')
      setHelperColor('text-green-600')
      setIsValid(true)
    }
  }

  const fetchNickname = async () => {
    try {
      const res = await fetch(`${base}/users/me/nickname`, {
        headers: { Authorization: `Bearer ${getAccessToken()}` }
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setNickname(data.nickname)
      validate(data.nickname)
    } catch {
      setHelperText('추천 닉네임을 불러오지 못했어요. 직접 입력해 주세요')
      setHelperColor('text-red-500')
      setIsValid(false)
    } finally {
      setSpinning(false)
    }
  }

  useEffect(() => { fetchNickname() }, [])

  const handleChange = (e) => {
    setNickname(e.target.value)
    validate(e.target.value)
  }

  const handleRegenerate = () => {
    if (spinning) return
    setSpinning(true)
    fetchNickname()
  }

  const handleNext = async () => {
    setSaveError('')
    setSaving(true)
    try {
      const res = await fetch(`${base}/users/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAccessToken()}` },
        body: JSON.stringify({ nickname })
      })
      if (!res.ok) throw new Error()
      navigate('/register/basic-info')
    } catch {
      setSaveError('닉네임 저장에 실패했어요. 다시 시도해 주세요.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormLayout
      step={2}
      showProgress
      title="닉네임 설정"
      subtitle="다른 사용자에게 보여질 이름이에요"
      onNext={handleNext}
      nextLabel={saving ? '저장 중...' : '다음'}
      nextDisabled={!isValid || saving}
    >
      <section className="mb-8">
        <div className="bg-[#EFF6FF] rounded-lg p-3 flex items-start gap-2">
          <FontAwesomeIcon icon={faCircleInfo} className="text-[#2563EB] text-[14px] mt-0.5 shrink-0" />
          <p className="text-[13px] font-medium text-[#1D4ED8] leading-snug">
            닉네임이 자동으로 추천됐어요. 마음에 들지 않으면 직접 수정할 수 있어요
          </p>
        </div>
      </section>

      <section>
        <label className="block text-[14px] font-semibold text-[#18181B] mb-3">
          닉네임 <span className="text-primary">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={nickname}
            onChange={handleChange}
            maxLength={20}
            placeholder="닉네임 입력"
            className="w-full h-14 bg-[#F5F5F5] rounded-xl pl-4 pr-14 text-[15px] text-[#18181B] outline-none focus:ring-1 focus:ring-primary font-medium placeholder:text-[#A1A1AA]"
          />
          <button
            type="button"
            onClick={handleRegenerate}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-[#71717A]"
          >
            <FontAwesomeIcon icon={faRotateRight} className={`text-[16px] ${spinning ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <p className={`text-[12px] mt-2 ml-1 ${helperColor}`}>{helperText}</p>
      </section>

      {saveError && (
        <p className="text-[13px] text-red-500 mt-4">{saveError}</p>
      )}
    </FormLayout>
  )
}

export default RegisterNickname