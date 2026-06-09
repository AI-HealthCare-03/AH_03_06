import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FormLayout from '../../components/FormLayout.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import { findEmail } from '../../api/auth.js'

const ERROR_MAP = {
  user_not_found: '일치하는 회원 정보를 찾을 수 없습니다.',
}

function FindEmail() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [birthday, setBirthday] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isFormValid = name.trim() && birthday.trim()

  const handleSubmit = async () => {
    if (!isFormValid) return
    setLoading(true)
    setError('')
    try {
      const data = await findEmail({ name, birthday })
      setResult(data)
    } catch (err) {
      setError(ERROR_MAP[err.message] ?? '오류가 발생했습니다. 다시 시도해 주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <FormLayout
      title={result ? '이메일을 찾았어요' : '이메일 찾기'}
      subtitle={result ? undefined : '가입 시 입력한 이름과 생년월일을 입력해 주세요'}
      onNext={result ? () => navigate('/login') : handleSubmit}
      nextLabel={result ? '로그인으로 돌아가기' : loading ? '확인 중...' : '이메일 찾기'}
      nextDisabled={!result && (!isFormValid || loading)}
      subText={!result ? '로그인으로 돌아가기' : undefined}
      onSubText={!result ? () => navigate('/login') : undefined}
    >
      {result ? (
        <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#EFF6FF] flex items-center justify-center mb-2">
            <FontAwesomeIcon icon={faCircleInfo} className="text-[#2563EB] text-[28px]" />
          </div>
          <p className="text-[14px] text-[#71717A] text-center leading-relaxed">
            가입하신 이메일은<br />
            <span className="text-[#18181B] font-semibold">{result.email}</span> 입니다
          </p>
        </div>
      ) : (
        <>
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
              <label className="block text-[14px] font-medium text-[#18181B]">생년월일 <span className="text-primary">*</span></label>
              <input
                type="date"
                value={birthday}
                onChange={e => setBirthday(e.target.value)}
                className="w-full h-[56px] bg-[#F5F5F5] rounded-[8px] px-4 text-[15px] text-[#18181B] outline-none border border-transparent focus:border-primary/20"
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-[13px] mt-4">{error}</p>}
        </>
      )}
    </FormLayout>
  )
}

export default FindEmail