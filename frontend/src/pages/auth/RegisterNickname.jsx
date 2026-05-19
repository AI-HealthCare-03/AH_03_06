import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getAccessToken } from '../../utils/token.js'

const base = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

function RegisterNickname() {
  const navigate = useNavigate()
  const location = useLocation()
  const [nickname, setNickname] = useState('')
  const [helperText, setHelperText] = useState('한글·영문·숫자 2~20자')
  const [helperColor, setHelperColor] = useState('text-[#A1A1AA]')
  const [isValid, setIsValid] = useState(false)
  const [spinning, setSpinning] = useState(false)

  const fetchNickname = async () => {
    try {
      const res = await fetch(`${base}/users/me/nickname`, {
        headers: { Authorization: `Bearer ${getAccessToken()}` }
      })
      const data = await res.json()
      setNickname(data.nickname)
      validate(data.nickname)
    } catch {}
  }

  useEffect(() => {
    fetchNickname()
  }, [])

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

  const handleChange = (e) => {
    setNickname(e.target.value)
    validate(e.target.value)
  }

  const handleRegenerate = async () => {
    setSpinning(true)
    setTimeout(() => setSpinning(false), 600)
    await fetchNickname()
  }

  const handleNext = async () => {
    try {
      await fetch(`${base}/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAccessToken()}`
        },
        body: JSON.stringify({ nickname })
      })
      navigate('/register/profile')
    } catch {}
  }

  return (
    <div className="bg-white md:bg-[#F4F4F5] w-full min-h-[100dvh] flex justify-center items-center">
      <div className="w-full min-h-[100dvh] bg-white relative flex flex-col mx-auto md:max-w-[480px] md:min-h-[760px] md:rounded-[24px] md:shadow-2xl md:overflow-hidden md:my-8">

        {/* 상단 앱바 */}
        <header className="sticky top-0 z-50 bg-white px-5 h-14 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-start">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#18181B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <span className="text-[15px] font-semibold text-primary">2 / 3</span>
          <div className="w-10" />
        </header>

        {/* 콘텐츠 */}
        <div className="flex-1 overflow-y-auto px-6 pt-4 pb-[120px]">

          <section className="mb-8">
            <h1 className="text-[24px] font-bold text-[#18181B] mb-2 leading-tight">닉네임 설정</h1>
            <p className="text-[14px] text-[#71717A]">다른 사용자에게 보여질 이름이에요</p>
          </section>

          <section className="mb-8">
            <div className="bg-[#EFF6FF] rounded-lg p-3 flex items-start gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p className="text-[13px] font-medium text-[#1D4ED8] leading-snug">
                닉네임은 '형용사 + 명사 + 숫자 4자리' 형식으로 자동 생성됩니다
              </p>
            </div>
          </section>

          <section className="mb-8">
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
                className="w-full h-14 bg-[#F5F5F5] rounded-xl pl-4 pr-14 text-[15px] text-[#18181B] outline-none focus:ring-1 focus:ring-primary font-medium"
              />
              <button
                type="button"
                onClick={handleRegenerate}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-[#71717A]"
              >
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className={spinning ? 'animate-spin' : ''}
                >
                  <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
              </button>
            </div>
            <p className={`text-[12px] mt-2 ml-1 ${helperColor}`}>{helperText}</p>
          </section>

        </div>

        {/* 하단 버튼 */}
        <div className="absolute bottom-0 left-0 w-full px-6 pb-8 pt-4 bg-white">
          <button
            disabled={!isValid}
            onClick={handleNext}
            className={`w-full h-[56px] rounded-xl text-[16px] font-bold transition-all ${isValid ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'}`}
          >
            다음
          </button>
        </div>

      </div>
    </div>
  )
}

export default RegisterNickname