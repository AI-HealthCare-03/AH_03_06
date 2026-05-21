import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../../api/auth.js'
import { loginSuccess } from '../../App.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons'

function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [domain, setDomain] = useState('naver.com')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [customDomain, setCustomDomain] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isFormValid = email.length > 2 && password.length > 4

  const fullEmail = domain === 'direct'
    ? `${email}@${customDomain}`
    : `${email}@${domain}`

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isFormValid) return
    setError('')
    setLoading(true)
    try {
      await login({ email: fullEmail, password })
      loginSuccess()
      navigate('/home')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white md:bg-[#F4F4F5] text-[#18181B] w-full min-h-[100dvh] flex justify-center items-center">
      <main className="w-full min-h-[100dvh] bg-white relative flex flex-col px-[24px] py-[40px] mx-auto md:max-w-[480px] md:min-h-[760px] md:rounded-[24px] md:shadow-2xl md:overflow-hidden md:my-8">

        {/* 브랜드 헤더 */}
        <section className="flex flex-col items-center justify-center mt-[40px] mb-[48px]">
          <div className="w-[64px] h-[64px] bg-primary rounded-[16px] flex items-center justify-center mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M22 12H18L15.5 5L8.5 19L6 12H2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-[22px] font-bold text-[#18181B] mb-2 tracking-tight">Viva</h1>
          <p className="text-[13px] font-normal text-[#71717A]">매일의 건강을 더 가깝게</p>
        </section>

        {/* 로그인 폼 */}
        <section className="flex flex-col w-full flex-grow">
          <form className="w-full flex flex-col" onSubmit={handleSubmit}>

            {/* 이메일 */}
            <div className="mb-[20px]">
              <label className="block text-[14px] font-medium mb-2">
                이메일 <span className="text-primary">*</span>
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="이메일 입력"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="flex-1 min-w-0 h-[56px] bg-[#F5F5F5] rounded-[8px] px-4 text-[15px] text-[#18181B] outline-none border border-transparent focus:border-primary/20 placeholder:text-[#A1A1AA]"
                />
                <span className="text-[#71717A] font-medium shrink-0">@</span>
                <div className="relative flex-1 min-w-0">
                  <select
                    value={domain}
                    onChange={e => setDomain(e.target.value)}
                    className="w-full h-[56px] bg-[#F5F5F5] rounded-[8px] px-4 pr-8 text-[15px] text-[#18181B] outline-none appearance-none border border-transparent focus:border-primary/20 cursor-pointer"
                  >
                    <option value="naver.com">naver.com</option>
                    <option value="gmail.com">gmail.com</option>
                    <option value="daum.net">daum.net</option>
                    <option value="kakao.com">kakao.com</option>
                    <option value="direct">직접 입력</option>
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] text-[12px] pointer-events-none">▼</span>
                </div>
              </div>
              {domain === 'direct' && (
                <input
                  type="text"
                  placeholder="도메인 직접 입력"
                  value={customDomain}
                  onChange={e => setCustomDomain(e.target.value)}
                  className="mt-2 w-full bg-[#F5F5F5] h-[56px] rounded-[8px] px-4 text-[15px] outline-none placeholder:text-[#A1A1AA]"
                />
              )}
            </div>

            {/* 비밀번호 */}
            <div className="mb-[12px]">
              <label className="block text-[14px] font-medium mb-2">
                비밀번호 <span className="text-primary">*</span>
              </label>
              <div className="relative w-full">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="비밀번호 입력"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-[#F5F5F5] h-[56px] rounded-[8px] pl-4 pr-12 text-[15px] outline-none placeholder:text-[#A1A1AA] border border-transparent focus:border-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A1A1AA]"
                >
                  <FontAwesomeIcon icon={showPassword ? faEye : faEyeSlash} className="text-[18px]" />
                </button>
              </div>
            </div>

            {/* 비밀번호 찾기 */}
            <div className="flex justify-end mb-[32px]">
              <span
                onClick={() => navigate('/password/find')}
                className="text-[13px] font-medium text-[#71717A] cursor-pointer"
              >
                비밀번호 찾기
              </span>
            </div>

            {error && (
              <p className="text-red-500 text-[13px] mb-3">{error}</p>
            )}

            <button
              type="submit"
              disabled={!isFormValid || loading}
              className={`w-full h-[56px] bg-primary text-white text-[16px] font-bold rounded-[14px] flex items-center justify-center transition-opacity ${!isFormValid || loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </section>

        {/* 소셜 로그인 */}
        <section className="mt-auto pt-[40px] flex flex-col w-full">
          <div className="flex items-center justify-center mb-[24px]">
            <div className="h-[1px] bg-gray-100 flex-1"></div>
            <span className="px-4 text-[13px] text-[#A1A1AA] font-medium">또는</span>
            <div className="h-[1px] bg-gray-100 flex-1"></div>
          </div>

          <div className="flex flex-col gap-3 mb-[32px]">
            <button
              type="button"
              onClick={() => window.location.href = `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'}/auth/social/google`}
              className="w-full h-[56px] bg-white border border-gray-200 text-[#18181B] text-[15px] font-bold rounded-[14px] flex items-center justify-center relative"
            >
              <span className="absolute left-5 text-[13px] font-bold text-gray-500 border border-gray-300 rounded-full w-[18px] h-[18px] flex items-center justify-center">G</span>
              Google로 계속하기
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 pb-[20px]">
            <span className="text-[13px] text-[#71717A]">계정이 없으신가요?</span>
            <span
              onClick={() => navigate('/register')}
              className="text-[13px] font-bold text-primary cursor-pointer"
            >
              회원가입
            </span>
          </div>
        </section>

      </main>
    </div>
  )
}

export default Login