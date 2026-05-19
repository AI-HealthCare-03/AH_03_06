import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getAccessToken } from '../../utils/token.js'

const base = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

const DISEASES = ['고혈압', '당뇨', '고지혈증', '갑상선 질환', '기타', '없음']

function RegisterProfile() {
  const navigate = useNavigate()
  const location = useLocation()

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 87 }, (_, i) => currentYear - 14 - i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const days = Array.from({ length: 31 }, (_, i) => i + 1)

  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const [gender, setGender] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [diseases, setDiseases] = useState([])
  const [smoking, setSmoking] = useState('')
  const [drinking, setDrinking] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isFormValid = year && month && day && gender && height && weight

  const handleDisease = (disease) => {
    if (disease === '없음') {
      setDiseases(prev => prev.includes('없음') ? [] : ['없음'])
    } else {
      setDiseases(prev => {
        const filtered = prev.filter(d => d !== '없음')
        return filtered.includes(disease)
          ? filtered.filter(d => d !== disease)
          : [...filtered, disease]
      })
    }
  }

  const handleSubmit = async () => {
    if (!isFormValid) return
    setLoading(true)
    setError('')

    const birthday = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    const payload = {
      birthday,
      gender: gender === '여성' ? 'F' : 'M',
      height: parseFloat(height),
      weight: parseFloat(weight),
      underlying_diseases: diseases.filter(d => d !== '없음'),
      smoking: smoking ? { smoking_status: smoking === '흡연' ? 1 : 0 } : null,
      alcohol: drinking ? { alcohol_status: drinking === '음주' ? 1 : 0 } : null,
    }

    try {
      const res = await fetch(`${base}/users/profile/initial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAccessToken()}`,
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data?.detail ?? '오류가 발생했어요')
      }
      navigate('/home', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const radioClass = (selected) =>
    selected
      ? 'flex-1 h-14 rounded-xl text-[15px] font-bold bg-[#EFF6FF] border border-primary text-primary transition-colors'
      : 'flex-1 h-14 rounded-xl text-[15px] font-medium bg-[#F5F5F5] border border-transparent text-[#18181B] transition-colors'

  const chipClass = (selected) =>
    selected
      ? 'px-4 py-2.5 rounded-full text-[14px] border font-bold bg-[#EFF6FF] border-primary text-primary transition-colors'
      : 'px-4 py-2.5 rounded-full text-[14px] border font-medium bg-[#F5F5F5] border-transparent text-[#18181B] transition-colors'

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
          <span className="text-[15px] font-semibold text-primary">3 / 3</span>
          <div className="w-10" />
        </header>

        {/* 콘텐츠 */}
        <div className="flex-1 overflow-y-auto px-6 pt-4 pb-[120px]">

          <section className="mb-8">
            <h1 className="text-[24px] font-bold text-[#18181B] mb-2 leading-tight">정확한 맞춤 관리를 위해<br/>기본 정보를 입력해주세요</h1>
            <p className="text-[14px] text-[#71717A]">입력하신 정보는 안전하게 보관됩니다.</p>
          </section>

          <div className="flex flex-col gap-y-7 mb-8">

            {/* 생년월일 */}
            <div>
              <label className="block text-[14px] font-semibold text-[#18181B] mb-3">생년월일 <span className="text-primary">*</span></label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <select value={year} onChange={e => setYear(e.target.value)} className="w-full h-14 bg-[#F5F5F5] rounded-xl px-4 pr-10 text-[15px] outline-none appearance-none cursor-pointer">
                    <option value="">년도</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#71717A] text-[12px] pointer-events-none">▼</span>
                </div>
                <div className="relative flex-1">
                  <select value={month} onChange={e => setMonth(e.target.value)} className="w-full h-14 bg-[#F5F5F5] rounded-xl px-4 pr-10 text-[15px] outline-none appearance-none cursor-pointer">
                    <option value="">월</option>
                    {months.map(m => <option key={m} value={m}>{String(m).padStart(2, '0')}</option>)}
                  </select>
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#71717A] text-[12px] pointer-events-none">▼</span>
                </div>
                <div className="relative flex-1">
                  <select value={day} onChange={e => setDay(e.target.value)} className="w-full h-14 bg-[#F5F5F5] rounded-xl px-4 pr-10 text-[15px] outline-none appearance-none cursor-pointer">
                    <option value="">일</option>
                    {days.map(d => <option key={d} value={d}>{String(d).padStart(2, '0')}</option>)}
                  </select>
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#71717A] text-[12px] pointer-events-none">▼</span>
                </div>
              </div>
            </div>

            {/* 성별 */}
            <div>
              <label className="block text-[14px] font-semibold text-[#18181B] mb-3">성별 <span className="text-primary">*</span></label>
              <div className="flex gap-3">
                <button type="button" onClick={() => setGender('여성')} className={radioClass(gender === '여성')}>여성</button>
                <button type="button" onClick={() => setGender('남성')} className={radioClass(gender === '남성')}>남성</button>
              </div>
            </div>

            {/* 키 */}
            <div>
              <label className="block text-[14px] font-semibold text-[#18181B] mb-3">키 <span className="text-primary">*</span></label>
              <div className="relative">
                <input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="예: 170" className="w-full h-14 bg-[#F5F5F5] rounded-xl pl-4 pr-14 text-[15px] outline-none" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#71717A] text-[15px] font-medium">cm</span>
              </div>
            </div>

            {/* 몸무게 */}
            <div>
              <label className="block text-[14px] font-semibold text-[#18181B] mb-3">몸무게 <span className="text-primary">*</span></label>
              <div className="relative">
                <input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="예: 65" className="w-full h-14 bg-[#F5F5F5] rounded-xl pl-4 pr-14 text-[15px] outline-none" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#71717A] text-[15px] font-medium">kg</span>
              </div>
            </div>

          </div>

          {/* 기저질환 */}
          <div className="mb-7">
            <label className="block text-[14px] font-semibold text-[#18181B] mb-3">기저질환 <span className="text-[#A1A1AA] font-normal text-[12px] ml-1">(선택)</span></label>
            <div className="flex flex-wrap gap-2">
              {DISEASES.map(d => (
                <button key={d} type="button" onClick={() => handleDisease(d)} className={chipClass(diseases.includes(d))}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* 흡연 */}
          <div className="mb-7">
            <label className="block text-[14px] font-semibold text-[#18181B] mb-3">흡연 여부 <span className="text-[#A1A1AA] font-normal text-[12px] ml-1">(선택)</span></label>
            <div className="flex gap-3">
              <button type="button" onClick={() => setSmoking(smoking === '흡연' ? '' : '흡연')} className={radioClass(smoking === '흡연')}>흡연</button>
              <button type="button" onClick={() => setSmoking(smoking === '비흡연' ? '' : '비흡연')} className={radioClass(smoking === '비흡연')}>비흡연</button>
            </div>
          </div>

          {/* 음주 */}
          <div className="mb-7">
            <label className="block text-[14px] font-semibold text-[#18181B] mb-3">음주 여부 <span className="text-[#A1A1AA] font-normal text-[12px] ml-1">(선택)</span></label>
            <div className="flex gap-3">
              <button type="button" onClick={() => setDrinking(drinking === '음주' ? '' : '음주')} className={radioClass(drinking === '음주')}>음주</button>
              <button type="button" onClick={() => setDrinking(drinking === '비음주' ? '' : '비음주')} className={radioClass(drinking === '비음주')}>비음주</button>
            </div>
          </div>

          {error && <p className="text-red-500 text-[13px] mb-4">{error}</p>}

        </div>

        {/* 하단 버튼 */}
        <div className="absolute bottom-0 left-0 w-full px-6 pb-8 pt-4 bg-white">
          <button
            disabled={!isFormValid || loading}
            onClick={handleSubmit}
            className={`w-full h-[56px] rounded-xl text-[16px] font-bold transition-all ${isFormValid && !loading ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'}`}
          >
            {loading ? '저장 중...' : '시작하기'}
          </button>
        </div>

      </div>
    </div>
  )
}

export default RegisterProfile