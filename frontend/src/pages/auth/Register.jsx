import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { register } from '../../api/auth.js'

const EyeOpen = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)

const EyeClosed = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)

function Register() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [domain, setDomain] = useState('naver.com')
  const [customDomain, setCustomDomain] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [terms, setTerms] = useState({
    age: false, service: false, privacy: false, sensitive: false, marketing: false,
  })

  const requiredTerms = ['age', 'service', 'privacy', 'sensitive']
  const allRequired = requiredTerms.every(t => terms[t])
  const allChecked = Object.values(terms).every(v => v)

  const handleAgreeAll = (e) => {
    const checked = e.target.checked
    setTerms({ age: checked, service: checked, privacy: checked, sensitive: checked, marketing: checked })
  }

  const handleTerm = (key) => setTerms(prev => ({ ...prev, [key]: !prev[key] }))

  const isFormValid = email && password && passwordConfirm && name && allRequired

  const fullEmail = domain === 'direct' ? `${email}@${customDomain}` : `${email}@${domain}`

  const handleSubmit = async () => {
    if (!isFormValid) return
    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않아요')
      return
    }
    setError('')
    setLoading(true)
    try {
      await register({ email: fullEmail, password, password_confirm: passwordConfirm, name })
      navigate('/register/nickname')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white md:bg-[#F4F4F5] w-full min-h-[100dvh] flex justify-center items-center">
      <main className="w-full min-h-[100dvh] bg-white relative flex flex-col overflow-hidden mx-auto md:max-w-[480px] md:rounded-[24px] md:shadow-2xl md:my-8">

        <header className="w-full h-[56px] flex items-center justify-between px-4 bg-white z-10 shrink-0">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#18181B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <span className="text-[14px] font-medium text-[#71717A]">1 / 3</span>
          <div className="w-10 h-10" />
        </header>

        <div className="flex-1 overflow-y-auto px-6 pb-[120px]">

          <section className="mt-4 mb-8">
            <h1 className="text-[26px] font-bold tracking-tight text-[#18181B] mb-2">회원가입</h1>
            <p className="text-[15px] text-[#71717A] leading-relaxed">Viva 서비스 이용을 위해<br/>정보를 입력해주세요.</p>
          </section>

          <section className="space-y-6">

            <div className="space-y-2">
              <label className="block text-[14px] font-semibold text-[#18181B]">이메일 <span className="text-primary">*</span></label>
              <div className="flex gap-2">
                <input type="text" placeholder="이메일 입력" value={email} onChange={e => setEmail(e.target.value)}
                  className="flex-1 h-[52px] bg-[#F5F5F5] rounded-xl px-4 text-[15px] outline-none border border-transparent focus:border-primary" />
                <div className="flex items-center text-[#A1A1AA] font-medium px-1">@</div>
                <div className="flex-1 relative">
                  <select value={domain} onChange={e => setDomain(e.target.value)}
                    className="w-full h-[52px] bg-[#F5F5F5] rounded-xl px-4 pr-10 text-[15px] outline-none appearance-none border border-transparent focus:border-primary cursor-pointer">
                    <option value="naver.com">naver.com</option>
                    <option value="gmail.com">gmail.com</option>
                    <option value="daum.net">daum.net</option>
                    <option value="kakao.com">kakao.com</option>
                    <option value="direct">직접입력</option>
                  </select>
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A1A1AA] text-[12px] pointer-events-none">▼</span>
                </div>
              </div>
              {domain === 'direct' && (
                <input type="text" placeholder="도메인 직접 입력" value={customDomain} onChange={e => setCustomDomain(e.target.value)}
                  className="w-full h-[52px] bg-[#F5F5F5] rounded-xl px-4 text-[15px] outline-none" />
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-[14px] font-semibold text-[#18181B]">비밀번호 <span className="text-primary">*</span></label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} placeholder="비밀번호 입력" value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full h-[52px] bg-[#F5F5F5] rounded-xl pl-4 pr-12 text-[15px] outline-none border border-transparent focus:border-primary" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A1A1AA]">
                  {showPassword ? <EyeOpen /> : <EyeClosed />}
                </button>
              </div>
              <p className="text-[12px] text-[#A1A1AA] ml-1">영문·숫자·특수문자 포함 8자 이상</p>
            </div>

            <div className="space-y-2">
              <label className="block text-[14px] font-semibold text-[#18181B]">비밀번호 확인 <span className="text-primary">*</span></label>
              <div className="relative">
                <input type={showPasswordConfirm ? 'text' : 'password'} placeholder="비밀번호를 다시 입력해주세요" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)}
                  className="w-full h-[52px] bg-[#F5F5F5] rounded-xl pl-4 pr-12 text-[15px] outline-none border border-transparent focus:border-primary" />
                <button type="button" onClick={() => setShowPasswordConfirm(!showPasswordConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A1A1AA]">
                  {showPasswordConfirm ? <EyeOpen /> : <EyeClosed />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[14px] font-semibold text-[#18181B]">이름 <span className="text-primary">*</span></label>
              <input type="text" placeholder="실명을 입력해주세요" value={name} onChange={e => setName(e.target.value)}
                className="w-full h-[52px] bg-[#F5F5F5] rounded-xl px-4 text-[15px] outline-none border border-transparent focus:border-primary" />
              <p className="text-[13px] text-[#71717A] ml-1">의료 서비스 제공을 위해 정확한 실명이 필요합니다.</p>
            </div>

          </section>

          <section className="mt-10 pt-8 border-t border-gray-100">
            <label className="flex items-center gap-3 p-4 bg-[#F5F5F5] rounded-[12px] cursor-pointer mb-4">
              <input type="checkbox" checked={allChecked} onChange={handleAgreeAll} className="shrink-0 w-5 h-5 accent-primary" />
              <span className="text-[15px] font-bold text-[#18181B]">전체 동의 (선택 항목 포함)</span>
            </label>
            <div className="space-y-2 px-2 flex flex-col">
              {[
                { key: 'age', label: '만 14세 이상입니다', required: true, hasLink: false },
                { key: 'service', label: '서비스 이용약관 동의', required: true, hasLink: true },
                { key: 'privacy', label: '개인정보 수집·이용 동의', required: true, hasLink: true },
                { key: 'sensitive', label: '민감정보(의료 정보) 수집 동의', required: true, hasLink: true },
                { key: 'marketing', label: '마케팅 수신 동의', required: false, hasLink: false },
              ].map(({ key, label, required, hasLink }) => (
                <div key={key} className="flex items-center justify-between py-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={terms[key]} onChange={() => handleTerm(key)} className="shrink-0 w-5 h-5 accent-primary" />
                    <span className="text-[14px] font-medium text-[#18181B]">
                      <span className={`font-bold text-[11px] mr-1 ${required ? 'text-primary' : 'text-[#71717A]'}`}>{required ? '[필수]' : '[선택]'}</span>
                      {label}
                    </span>
                  </label>
                  {hasLink && <button className="text-[13px] font-medium text-[#71717A]">보기 ›</button>}
                </div>
              ))}
            </div>
          </section>

          {error && <p className="text-red-500 text-[13px] mt-4">{error}</p>}

        </div>

        <div className="absolute bottom-0 left-0 w-full px-6 pb-8 pt-4 bg-gradient-to-t from-white via-white to-transparent z-20">
          <button
            disabled={!isFormValid || loading}
            onClick={handleSubmit}
            className={`w-full h-[56px] rounded-[16px] text-[16px] font-bold transition-all ${isFormValid && !loading ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'}`}
          >
            {loading ? '처리 중...' : '다음'}
          </button>
        </div>

      </main>
    </div>
  )
}

export default Register