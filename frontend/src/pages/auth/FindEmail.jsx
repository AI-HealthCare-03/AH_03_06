import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BackHeader from '../../components/BackHeader.jsx'

const base = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

function FindEmail() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isFormValid = name.trim() && phone.trim()

  const handleSubmit = async () => {
    if (!isFormValid) return
    setLoading(true)
    setError('')
    setResult('')
    try {
      const res = await fetch(`${base}/auth/email/find`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.detail ?? '오류가 발생했어요')
      setResult(data.email)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white md:bg-[#F4F4F5] w-full min-h-[100dvh] flex justify-center">
      <div className="w-full min-h-[100dvh] bg-white flex flex-col mx-auto md:max-w-[480px] md:rounded-[24px] md:shadow-2xl md:my-8">

        <BackHeader title="이메일 찾기" subtitle="이름과 전화번호로 가입된 이메일을 확인할 수 있어요" />


        <div className="flex-1 px-6 pt-8 pb-10 flex flex-col">
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
              <label className="block text-[14px] font-medium text-[#18181B]">휴대폰 번호 <span className="text-primary">*</span></label>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="휴대폰 번호 입력 (- 없이 숫자만)"
                className="w-full h-[56px] bg-[#F5F5F5] rounded-[8px] px-4 text-[15px] text-[#18181B] outline-none border border-transparent focus:border-primary/20 placeholder:text-[#A1A1AA]"
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-[13px] mt-4">{error}</p>}

          {result && (
            <div className="mt-6 bg-[#EFF6FF] rounded-[10px] px-4 py-4">
              <p className="text-[13px] text-[#52525B] mb-1">가입된 이메일</p>
              <p className="text-[16px] font-[700] text-[#2563EB]">{result}</p>
            </div>
          )}

          <div className="mt-10">
            <button
              onClick={handleSubmit}
              disabled={!isFormValid || loading}
              className={`w-full h-[56px] rounded-[14px] text-[16px] font-bold transition-opacity ${isFormValid && !loading ? 'bg-primary text-white' : 'bg-[#E4E4E7] text-[#A1A1AA] cursor-not-allowed'}`}
            >
              {loading ? '확인 중...' : '확인'}
            </button>
          </div>

          <div className="mt-6 flex flex-col items-center gap-4">
            <p className="text-[13px] text-[#71717A]">
              비밀번호를 잊으셨나요?{' '}
              <span onClick={() => navigate('/password/find')} className="text-primary font-medium cursor-pointer">비밀번호 찾기</span>
            </p>
            <span onClick={() => navigate('/login')} className="text-[14px] font-medium text-[#71717A] cursor-pointer">로그인으로 돌아가기</span>
          </div>

        </div>
      </div>
    </div>
  )
}

export default FindEmail