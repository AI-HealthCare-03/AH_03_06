import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import RegisterLayout from '../../components/RegisterLayout.jsx'
import { getAccessToken } from '../../utils/token.js'

const base = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

const DISEASES = [
  { key: 'hypertension', label: '고혈압' },
  { key: 'diabetes', label: '당뇨' },
  { key: 'hyperlipidemia', label: '고지혈증' },
  { key: 'asthma', label: '천식' },
  { key: 'arthritis', label: '관절염' },
  { key: 'thyroid', label: '갑상선 질환' },
  { key: 'cardiovascular', label: '심혈관 질환' },
  { key: 'stomach', label: '위장 질환' },
  { key: 'none', label: '없음' },
]

const GOALS = [
  { key: 'weight_loss', label: '체중 감량', sub: '건강한 체중으로', icon: '🎯' },
  { key: 'chronic_care', label: '만성질환 관리', sub: '혈압·혈당 안정적으로', icon: '💙' },
  { key: 'diet', label: '식습관 개선', sub: '영양 균형 잡힌 식단', icon: '🍎' },
  { key: 'exercise', label: '운동 습관 형성', sub: '꾸준한 운동 루틴', icon: '🏋️' },
  { key: 'sleep', label: '수면 개선', sub: '양질의 수면 회복', icon: '🌙' },
  { key: 'routine', label: '규칙적인 생활', sub: '복약·식사 시간 관리', icon: '📅' },
]

function RegisterHealth() {
  const navigate = useNavigate()
  const location = useLocation()
  const prevState = location.state || {}

  const [diseases, setDiseases] = useState([])
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleDisease = (key) => {
    if (key === 'none') {
      setDiseases(prev => prev.includes('none') ? [] : ['none'])
    } else {
      setDiseases(prev => {
        const filtered = prev.filter(d => d !== 'none')
        return filtered.includes(key)
          ? filtered.filter(d => d !== key)
          : [...filtered, key]
      })
    }
  }

  const handleGoal = (key) => {
    setGoals(prev =>
      prev.includes(key) ? prev.filter(g => g !== key) : [...prev, key]
    )
  }

  const chipClass = (selected) =>
    selected
      ? 'px-4 py-2.5 rounded-full text-[14px] font-bold bg-[#EFF6FF] border border-primary text-primary transition-colors'
      : 'px-4 py-2.5 rounded-full text-[14px] font-medium bg-[#F5F5F5] border border-transparent text-[#18181B] transition-colors'

  const goalCardClass = (selected) =>
    selected
      ? 'flex flex-col items-center justify-center gap-1 p-4 rounded-[16px] border border-primary bg-[#EFF6FF] text-primary transition-colors'
      : 'flex flex-col items-center justify-center gap-1 p-4 rounded-[16px] border border-[#E4E4E7] bg-white text-[#18181B] transition-colors'

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    const payload = {
      birthday: prevState.birthday,
      gender: prevState.gender,
      height: prevState.height,
      weight: prevState.weight,
      underlying_diseases: diseases.filter(d => d !== 'none'),
      health_goals: goals,
      smoking: prevState.smoking
        ? { smoking_status: prevState.smoking === 'smoking' ? 1 : 0 }
        : null,
      alcohol: prevState.drinking
        ? { alcohol_status: prevState.drinking === 'drinking' ? 1 : 0 }
        : null,
      exercise: prevState.exercise
        ? {
            exercise_status: prevState.exercise === 'yes' ? 1 : 0,
            exercise_days: prevState.exercise_days ?? null,
          }
        : null,
      sleep: (prevState.sleep_hours || prevState.sleep_quality || prevState.sleep_disorder)
        ? {
            sleep_hours: prevState.sleep_hours ?? null,
            sleep_quality: prevState.sleep_quality ?? null,
            sleep_disorder: prevState.sleep_disorder ?? null,
          }
        : null,
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

  return (
    <RegisterLayout
      step={7}
      title="건강 정보를 알려주세요"
      subtitle="AI 가이드가 맞춤 콘텐츠를 추천해드려요"
      onNext={handleSubmit}
      nextLabel={loading ? '저장 중...' : 'Viva 시작하기'}
      nextDisabled={loading}
    >
      <div className="space-y-10">

        {/* 기저질환 */}
        <div className="space-y-3">
          <label className="block text-[14px] font-medium text-[#18181B]">
            기저질환 <span className="text-[13px] text-[#A1A1AA] font-normal">(선택, 여러 개 선택 가능)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {DISEASES.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => handleDisease(key)}
                className={chipClass(diseases.includes(key))}
              >
                {label}
              </button>
            ))}
          </div>
          <button className="w-full h-[48px] rounded-[12px] border border-[#E4E4E7] text-[14px] font-medium text-[#71717A] flex items-center justify-center gap-1">
            <span>+</span> 기타 질환 검색
          </button>
        </div>

        {/* 건강 목표 */}
        <div className="space-y-3">
          <label className="block text-[14px] font-medium text-[#18181B]">
            건강 목표 <span className="text-[13px] text-[#A1A1AA] font-normal">(선택, 여러 개 선택 가능)</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {GOALS.map(({ key, label, sub, icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => handleGoal(key)}
                className={goalCardClass(goals.includes(key))}
              >
                <span className="text-[24px]">{icon}</span>
                <span className="text-[14px] font-bold">{label}</span>
                <span className={`text-[12px] font-normal ${goals.includes(key) ? 'text-primary/70' : 'text-[#71717A]'}`}>{sub}</span>
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-500 text-[13px]">{error}</p>}

      </div>
    </RegisterLayout>
  )
}

export default RegisterHealth