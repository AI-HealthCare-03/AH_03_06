import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [domain, setDomain] = useState('naver.com')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [customDomain, setCustomDomain] = useState('')

  const isFormValid = email.length > 2 && password.length > 4

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
          <form className="w-full flex flex-col">

            {/* 이메일 */}
            <div className="mb-[20px]">
              <label className="block text-[14px] font-medium mb-2">
                이메일 <span className="text-primary">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="이메일 입력"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="flex-[6] bg-[#F5F5F5] h-[56px] rounded-[8px] px-4 text-[15px] outline-none placeholder:text-[#A1A1AA] border border-transparent focus:border-primary/20"
                />
                <span className="text-[#71717A] font-medium shrink-0">@</span>
                <div className="relative flex-[4] min-w-[140px]">
                  <select
                    value={domain}
                    onChange={e => setDomain(e.target.value)}
                    className="w-full bg-[#F5F5F5] h-[56px] rounded-[8px] px-4 pr-10 text-[15px] outline-none appearance-none border border-transparent focus:border-primary/20 cursor-pointer"
                  >
                    <option value="naver.com">naver.com</option>
                    <option value="gmail.com">gmail.com</option>
                    <option value="daum.net">daum.net</option>
                    <option value="kakao.com">kakao.com</option>
                    <option value="direct">직접 입력</option>
                  </select>
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A1A1AA] text-[12px] pointer-events-none">▼</span>
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
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  )}
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

            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={!isFormValid}
              className={`w-full h-[56px] bg-primary text-white text-[16px] font-bold rounded-[14px] flex items-center justify-center transition-opacity ${!isFormValid ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              로그인
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
              onClick={() => window.location.href = 'http://localhost:8000/api/v1/auth/social/google'}
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