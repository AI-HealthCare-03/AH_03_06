import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAccessToken } from '../../utils/token.js'
import Header from '../../components/Header.jsx'
import MobileFrame from '../../components/MobileFrame.jsx'

const base = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

const DISEASES = ['없음', '고혈압', '당뇨', '고지혈증', '심장질환', '신장질환', '갑상선질환']
const GOALS = ['체중 감량', '혈압 관리', '혈당 관리', '콜레스테롤 관리', '금연', '절주', '운동 습관', '수면 개선']

async function apiFetch(path, options = {}) {
  const token = getAccessToken()
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error(data?.detail ?? res.statusText)
  return data
}

function ProfileEdit() {
  const navigate = useNavigate()

  const [birthday, setBirthday] = useState('')
  const [gender, setGender] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [diseases, setDiseases] = useState([])
  const [smoking, setSmoking] = useState('')
  const [drinking, setDrinking] = useState('')
  const [goals, setGoals] = useState([])
  const [memo, setMemo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/users/me').then(data => {
      setBirthday(data.birthday ?? '')
      setGender(data.gender === 'M' ? '남성' : data.gender === 'F' ? '여성' : '')
      setHeight(data.height ?? '')
      setWeight(data.weight ?? '')
      const diseaseData = data.underlying_diseases ?? []
      setDiseases(diseaseData.length === 0 ? ['없음'] : diseaseData)
      setSmoking(data.smoking_status === 1 ? '흡연' : data.smoking_status === 0 ? '비흡연' : '')
      setDrinking(data.alcohol_status === 1 ? '음주' : data.alcohol_status === 0 ? '비음주' : '')
    }).catch(() => {})

    apiFetch('/users/me/health-goals').then(data => {
      const active = data.goals.filter(g => g.is_active).map(g => g.name)
      setGoals(active)
    }).catch(() => {})
  }, [])

  const handleDisease = (d) => {
    if (d === '없음') {
      setDiseases(prev => prev.includes('없음') ? [] : ['없음'])
    } else {
      setDiseases(prev => {
        const filtered = prev.filter(x => x !== '없음')
        return filtered.includes(d) ? filtered.filter(x => x !== d) : [...filtered, d]
      })
    }
  }

  const handleGoal = (g) => {
    setGoals(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])
  }

  const handleSave = async () => {
    setLoading(true)
    setError('')
    try {
      await apiFetch('/users/me', {
        method: 'PUT',
        body: JSON.stringify({
          height: height ? parseFloat(height) : null,
          weight: weight ? parseFloat(weight) : null,
          underlying_diseases: diseases.filter(d => d !== '없음'),
          smoking_status: smoking === '흡연' ? 1 : smoking === '비흡연' ? 0 : null,
          alcohol_status: drinking === '음주' ? 1 : drinking === '비음주' ? 0 : null,
        })
      })
      await apiFetch('/users/me/health-goals', {
        method: 'PUT',
        body: JSON.stringify({
          goals: GOALS.map((name, idx) => ({
            goal_type_id: idx + 1,
            is_active: goals.includes(name),
          }))
        })
      })
      navigate(-1)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const radioClass = (selected) =>
    selected
      ? 'h-12 rounded-[12px] border border-primary bg-[#EFF6FF] flex items-center justify-center text-[15px] font-bold text-primary transition-colors cursor-pointer'
      : 'h-12 rounded-[12px] border border-[#E4E4E7] bg-white flex items-center justify-center text-[15px] text-[#71717A] transition-colors cursor-pointer'

  const chipClass = (selected) =>
    selected
      ? 'px-4 h-9 inline-flex items-center rounded-full border border-primary bg-[#EFF6FF] text-[14px] font-bold text-primary transition-colors cursor-pointer'
      : 'px-4 h-9 inline-flex items-center rounded-full border border-[#E4E4E7] bg-white text-[14px] text-[#18181B] transition-colors cursor-pointer'

  return (
    <MobileFrame header={<Header variant="back" title="프로필 수정" />}>

        <div className="px-5 py-6 space-y-8 pb-32">

          {/* 기본 정보 */}
          <section className="space-y-5">
            <h2 className="text-[13px] font-medium text-[#71717A]">기본 정보</h2>

            {/* 생년월일 */}
            <div className="space-y-2">
              <label className="text-[14px] font-medium text-[#18181B]">생년월일 <span className="text-red-500">*</span></label>
              <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)}
                className="w-full h-12 px-4 rounded-[8px] bg-[#F5F5F5] text-[15px] outline-none focus:ring-2 focus:ring-primary" />
            </div>

            {/* 성별 */}
            <div className="space-y-2">
              <label className="text-[14px] font-medium text-[#18181B]">성별 <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setGender('남성')} className={radioClass(gender === '남성')}>남성</button>
                <button type="button" onClick={() => setGender('여성')} className={radioClass(gender === '여성')}>여성</button>
              </div>
            </div>

            {/* 키 / 체중 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-[14px] font-medium text-[#18181B]">키 (cm) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="175"
                    className="w-full h-12 pl-4 pr-10 rounded-[8px] bg-[#F5F5F5] text-[15px] outline-none focus:ring-2 focus:ring-primary" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#71717A] text-[14px]">cm</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[14px] font-medium text-[#18181B]">체중 (kg) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="70"
                    className="w-full h-12 pl-4 pr-10 rounded-[8px] bg-[#F5F5F5] text-[15px] outline-none focus:ring-2 focus:ring-primary" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#71717A] text-[14px]">kg</span>
                </div>
              </div>
            </div>
          </section>

          <hr className="border-[#F4F4F5]" />

          {/* 건강 정보 */}
          <section className="space-y-5">
            <h2 className="text-[13px] font-medium text-[#71717A]">건강 정보</h2>

            {/* 기저질환 */}
            <div className="space-y-3">
              <label className="text-[14px] font-medium text-[#18181B]">기저질환</label>
              <p className="text-[12px] text-[#71717A] -mt-1">여러 개 선택 가능합니다</p>
              <div className="flex flex-wrap gap-2">
                {DISEASES.map(d => (
                  <button key={d} type="button" onClick={() => handleDisease(d)} className={chipClass(diseases.includes(d))}>{d}</button>
                ))}
              </div>
            </div>

            {/* 흡연 */}
            <div className="space-y-2">
              <label className="text-[14px] font-medium text-[#18181B]">흡연 여부</label>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setSmoking('비흡연')} className={radioClass(smoking === '비흡연')}>비흡연</button>
                <button type="button" onClick={() => setSmoking('흡연')} className={radioClass(smoking === '흡연')}>흡연</button>
              </div>
            </div>

            {/* 음주 */}
            <div className="space-y-2">
              <label className="text-[14px] font-medium text-[#18181B]">음주 여부</label>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setDrinking('비음주')} className={radioClass(drinking === '비음주')}>비음주</button>
                <button type="button" onClick={() => setDrinking('음주')} className={radioClass(drinking === '음주')}>음주</button>
              </div>
            </div>
          </section>

          <hr className="border-[#F4F4F5]" />

          {/* 건강 목표 */}
          <section className="space-y-5">
            <h2 className="text-[13px] font-medium text-[#71717A]">건강 목표</h2>

            <div className="space-y-3">
              <label className="text-[14px] font-medium text-[#18181B]">주요 관리 목표</label>
              <p className="text-[12px] text-[#71717A] -mt-1">여러 개 선택 가능합니다</p>
              <div className="flex flex-wrap gap-2">
                {GOALS.map(g => (
                  <button key={g} type="button" onClick={() => handleGoal(g)} className={chipClass(goals.includes(g))}>{g}</button>
                ))}
              </div>
            </div>

            {/* 메모 */}
            <div className="space-y-2">
              <label className="text-[14px] font-medium text-[#18181B]">메모 (선택)</label>
              <textarea value={memo} onChange={e => setMemo(e.target.value)} maxLength={200} rows={4}
                placeholder="구체적인 목표나 메모를 입력하세요"
                className="w-full p-4 rounded-[8px] bg-[#F5F5F5] text-[15px] outline-none focus:ring-2 focus:ring-primary resize-none" />
              <p className="text-[12px] text-[#A1A1AA] text-right">{memo.length} / 200</p>
            </div>
          </section>

          {error && <p className="text-red-500 text-[13px]">{error}</p>}

        </div>

        {/* 하단 버튼 */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full md:max-w-[480px] bg-white border-t border-[#F4F4F5] px-5 py-4 z-50">
          <button onClick={handleSave} disabled={loading}
            className={`w-full h-14 rounded-[12px] text-[16px] font-bold transition-colors ${loading ? 'bg-gray-200 text-gray-400' : 'bg-primary text-white'}`}>
            {loading ? '저장 중...' : '저장하기'}
          </button>
        </div>

    </MobileFrame>
  )
}

export default ProfileEdit