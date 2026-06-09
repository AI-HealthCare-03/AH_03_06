import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import FormLayout from '../../components/FormLayout.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEye, faEyeSlash, faCircleInfo } from '@fortawesome/free-solid-svg-icons'

const base = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isFormValid = password.length >= 8 && password === passwordConfirm

  const handleSubmit = async () => {
    if (!isFormValid) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${base}/auth/password/reset`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, password_confirm: passwordConfirm }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.detail?.[0]?.msg ?? data?.detail ?? '오류가 발생했어요')
      navigate('/login', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <FormLayout
      title="비밀번호 재설정"
      subtitle="새로 사용할 비밀번호를 입력해 주세요"
      onNext={handleSubmit}
      nextLabel={loading ? '변경 중...' : '비밀번호 변경'}
      nextDisabled={!isFormValid || loading}
      subText="로그인으로 돌아가기"
      onSubText={() => navigate('/login')}
    >
      <div className="bg-[#EFF6FF] rounded-[8px] p-3 flex items-start gap-2 mb-8">
        <FontAwesomeIcon icon={faCircleInfo} className="text-[#2563EB] text-[14px] mt-0.5 shrink-0" />
        <p className="text-[13px] font-medium text-[#1D4ED8] leading-snug">
          이 링크는 <strong>30분</strong> 동안 유효합니다. 시간이 지나면 비밀번호 찾기를 다시 요청해 주세요.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <div className="space-y-2">
          <label className="block text-[14px] font-medium text-[#18181B]">새 비밀번호 <span className="text-primary">*</span></label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              className="w-full h-[56px] bg-[#F5F5F5] rounded-[8px] pl-4 pr-12 text-[15px] text-[#18181B] outline-none border border-transparent focus:border-primary/20 placeholder:text-[#A1A1AA]"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-1 top-1/2 -translate-y-1/2 text-[#A1A1AA] w-11 h-11 flex items-center justify-center">
              <FontAwesomeIcon icon={showPassword ? faEye : faEyeSlash} className="text-[18px]" />
            </button>
          </div>
          <p className="text-[12px] text-[#A1A1AA] ml-1">영문·숫자·특수문자 포함 8자 이상</p>
        </div>

        <div className="space-y-2">
          <label className="block text-[14px] font-medium text-[#18181B]">새 비밀번호 확인 <span className="text-primary">*</span></label>
          <div className="relative">
            <input
              type={showPasswordConfirm ? 'text' : 'password'}
              value={passwordConfirm}
              onChange={e => setPasswordConfirm(e.target.value)}
              placeholder="비밀번호 다시 입력"
              className="w-full h-[56px] bg-[#F5F5F5] rounded-[8px] pl-4 pr-12 text-[15px] text-[#18181B] outline-none border border-transparent focus:border-primary/20 placeholder:text-[#A1A1AA]"
            />
            <button type="button" onClick={() => setShowPasswordConfirm(!showPasswordConfirm)} className="absolute right-1 top-1/2 -translate-y-1/2 text-[#A1A1AA] w-11 h-11 flex items-center justify-center">
              <FontAwesomeIcon icon={showPasswordConfirm ? faEye : faEyeSlash} className="text-[18px]" />
            </button>
          </div>
          {passwordConfirm && password !== passwordConfirm && (
            <p className="text-[12px] text-red-500 ml-1">비밀번호가 일치하지 않아요</p>
          )}
        </div>
      </div>

      {error && <p className="text-red-500 text-[13px] mt-4">{error}</p>}
    </FormLayout>
  )
}

export default ResetPassword