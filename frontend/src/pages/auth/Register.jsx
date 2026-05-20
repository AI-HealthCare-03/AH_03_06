import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { register } from '../../api/auth.js'
import RegisterLayout from '../../components/RegisterLayout.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faEyeSlash, faCheck } from '@fortawesome/free-solid-svg-icons'

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

  const handleAgreeAll = () => {
    const checked = !allChecked
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
    <RegisterLayout
      step={1}
      title="회원가입"
      subtitle="Viva 서비스 이용을 위해 정보를 입력해주세요"
      onNext={handleSubmit}
      nextLabel={loading ? '처리 중...' : '가입하기'}
      nextDisabled={!isFormValid || loading}
      subText={
        <span className="text-[13px] text-[#71717A]">
          이미 계정이 있으신가요?{' '}
          <span onClick={() => navigate('/login')} className="font-bold text-primary cursor-pointer">로그인</span>
        </span>
      }
    >
      <section className="space-y-6">

        {/* 이메일 */}
        <div className="space-y-2">
          <label className="block text-[14px] font-medium text-[#18181B]">이메일 <span className="text-primary">*</span></label>
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
            <input type="text" placeholder="도메인 직접 입력" value={customDomain} onChange={e => setCustomDomain(e.target.value)}
              className="w-full h-[56px] bg-[#F5F5F5] rounded-[8px] px-4 text-[15px] text-[#18181B] outline-none placeholder:text-[#A1A1AA]" />
          )}
        </div>

        {/* 비밀번호 */}
        <div className="space-y-2">
          <label className="block text-[14px] font-medium text-[#18181B]">비밀번호 <span className="text-primary">*</span></label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="비밀번호 입력"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full h-[56px] bg-[#F5F5F5] rounded-[8px] pl-4 pr-12 text-[15px] text-[#18181B] outline-none border border-transparent focus:border-primary/20 placeholder:text-[#A1A1AA]"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A1A1AA]">
              <FontAwesomeIcon icon={showPassword ? faEye : faEyeSlash} className="text-[18px]" />
            </button>
          </div>
          <p className="text-[12px] text-[#A1A1AA] ml-1">영문·숫자·특수문자 포함 8자 이상</p>
        </div>

        {/* 비밀번호 확인 */}
        <div className="space-y-2">
          <label className="block text-[14px] font-medium text-[#18181B]">비밀번호 확인 <span className="text-primary">*</span></label>
          <div className="relative">
            <input
              type={showPasswordConfirm ? 'text' : 'password'}
              placeholder="비밀번호 다시 입력"
              value={passwordConfirm}
              onChange={e => setPasswordConfirm(e.target.value)}
              className="w-full h-[56px] bg-[#F5F5F5] rounded-[8px] pl-4 pr-12 text-[15px] text-[#18181B] outline-none border border-transparent focus:border-primary/20 placeholder:text-[#A1A1AA]"
            />
            <button type="button" onClick={() => setShowPasswordConfirm(!showPasswordConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A1A1AA]">
              <FontAwesomeIcon icon={showPasswordConfirm ? faEye : faEyeSlash} className="text-[18px]" />
            </button>
          </div>
        </div>

        {/* 이름 */}
        <div className="space-y-2">
          <label className="block text-[14px] font-medium text-[#18181B]">이름 <span className="text-primary">*</span></label>
          <input
            type="text"
            placeholder="실명을 입력해 주세요"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full h-[56px] bg-[#F5F5F5] rounded-[8px] px-4 text-[15px] text-[#18181B] outline-none border border-transparent focus:border-primary/20 placeholder:text-[#A1A1AA]"
          />
        </div>

      </section>

      {/* 약관 */}
      <section className="mt-10 pt-8 border-t border-gray-100">
        <div className="bg-[#F5F5F5] rounded-[12px] px-4">
          <div className="flex items-center gap-3 py-4 cursor-pointer border-b border-gray-200" onClick={handleAgreeAll}>
            <div className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${allChecked ? 'bg-primary border-primary' : 'bg-white border-gray-300'}`}>
              {allChecked && <FontAwesomeIcon icon={faCheck} className="text-white text-[10px]" />}
            </div>
            <span className="text-[15px] font-bold text-[#18181B]">전체 동의하기</span>
          </div>
          {[
            { key: 'age',       label: '만 14세 이상입니다',           required: true,  hasLink: false },
            { key: 'service',   label: '서비스 이용약관 동의',          required: true,  hasLink: true  },
            { key: 'privacy',   label: '개인정보 수집·이용 동의',       required: true,  hasLink: true  },
            { key: 'sensitive', label: '민감정보(의료 정보) 수집 동의', required: true,  hasLink: true  },
            { key: 'marketing', label: '마케팅 수신 동의',              required: false, hasLink: false },
          ].map(({ key, label, required, hasLink }) => (
            <div key={key} className="flex items-center justify-between py-3 cursor-pointer" onClick={() => handleTerm(key)}>
              <div className="flex items-center gap-3">
                <div className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${terms[key] ? 'bg-primary border-primary' : 'bg-white border-gray-300'}`}>
                  {terms[key] && <FontAwesomeIcon icon={faCheck} className="text-white text-[10px]" />}
                </div>
                <span className="text-[14px] font-medium text-[#18181B]">
                  <span className={`font-bold text-[11px] mr-1 ${required ? 'text-primary' : 'text-[#71717A]'}`}>{required ? '[필수]' : '[선택]'}</span>
                  {label}
                </span>
              </div>
              {hasLink && <button className="text-[13px] font-medium text-[#71717A]" onClick={e => e.stopPropagation()}>보기 ›</button>}
            </div>
          ))}
        </div>
      </section>

      {error && <p className="text-red-500 text-[13px] mt-4">{error}</p>}

    </RegisterLayout>
  )
}

export default Register