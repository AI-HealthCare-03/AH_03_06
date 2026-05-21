import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FormLayout from '../../components/FormLayout.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'

const base = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

function FindPassword() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [domain, setDomain] = useState('naver.com')
  const [customDomain, setCustomDomain] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isFormValid = name.trim() && email.trim()
  const fullEmail = domain === 'direct' ? `${email}@${customDomain}` : `${email}@${domain}`

  const handleSubmit = async () => {
    if (!isFormValid) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${base}/auth/password/find`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email: fullEmail }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.detail ?? '오류가 발생했어요')
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <FormLayout
      title={sent ? '메일을 발송했어요' : '비밀번호 찾기'}
      subtitle={sent ? undefined : '가입하신 이메일로 비밀번호 재설정 링크를 보내드려요'}
      onNext={sent ? () => navigate('/login') : handleSubmit}
      nextLabel={sent ? '로그인으로 돌아가기' : loading ? '발송 중...' : '재설정 메일 발송'}
      nextDisabled={!sent && (!isFormValid || loading)}
      subText={!sent ? '로그인으로 돌아가기' : undefined}
      onSubText={!sent ? () => navigate('/login') : undefined}
    >
      {sent ? (
        <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#EFF6FF] flex items-center justify-center mb-2">
            <FontAwesomeIcon icon={faCircleInfo} className="text-[#2563EB] text-[28px]" />
          </div>
          <p className="text-[14px] text-[#71717A] text-center leading-relaxed">{fullEmail}로<br/>재설정 링크를 보내드렸어요</p>
        </div>
      ) : (
        <>
          <div className="bg-[#EFF6FF] rounded-[8px] p-3 flex items-start gap-2 mb-8">
            <FontAwesomeIcon icon={faCircleInfo} className="text-[#2563EB] text-[14px] mt-0.5 shrink-0" />
            <p className="text-[13px] font-medium text-[#1D4ED8] leading-snug">재설정 링크는 발송 후 30분간 유효합니다</p>
          </div>

          <div className="flex flex-col gap-6">
            <div className="space-y-2">
              <label className="block text-[14px] font-medium text-[#18181B]">이름 <span className="text-primary">*</span></label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="가입 시 입력한 실명"
                className="w-full h-[56px] bg-[#F5F5F5] rounded-[8px] px-4 text-[15px] text-[#18181B] outline-none border border-transparent focus:border-primary/20 placeholder:text-[#A1A1AA]"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[14px] font-medium text-[#18181B]">가입 이메일 <span className="text-primary">*</span></label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="이메일 앞부분"
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
                  className="w-full h-[56px] bg-[#F5F5F5] rounded-[8px] px-4 text-[15px] outline-none placeholder:text-[#A1A1AA]"
                />
              )}
            </div>
          </div>

          {error && <p className="text-red-500 text-[13px] mt-4">{error}</p>}
        </>
      )}
    </FormLayout>
  )
}

export default FindPassword