import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getAccessToken } from '../../utils/token.js'
import { createChatSession } from '../../api/chat.js'
import Header from '../../components/Header.jsx'
import BottomAction from '../../components/BottomAction.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTriangleExclamation, faCircleCheck, faCircleInfo, faEllipsisVertical, faComments } from '@fortawesome/free-solid-svg-icons'

const base = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

function StatusBadge({ status }) {
  if (status === '정상') return (
    <span className="px-2.5 py-1 bg-white text-green-600 text-[12px] font-[700] rounded-md border border-green-200 inline-flex items-center gap-1">
      <FontAwesomeIcon icon={faCircleCheck} className="text-[10px]" /> 정상
    </span>
  )
  if (status === '주의') return (
    <span className="px-2.5 py-1 bg-white text-yellow-500 text-[12px] font-[700] rounded-md border border-yellow-200 inline-flex items-center gap-1">
      <FontAwesomeIcon icon={faTriangleExclamation} className="text-[10px]" /> 주의
    </span>
  )
  return (
    <span className="px-2.5 py-1 bg-white text-red-500 text-[12px] font-[700] rounded-md border border-red-200 inline-flex items-center gap-1">
      <FontAwesomeIcon icon={faTriangleExclamation} className="text-[10px]" /> 위험
    </span>
  )
}

function getBarColor(status) {
  if (status === '정상') return 'bg-green-500'
  if (status === '주의') return 'bg-yellow-400'
  return 'bg-red-500'
}

function getRangeText(status, normal, caution, danger) {
  const color = { '정상': '#16a34a', '주의': '#EAB308', '위험': '#ef4444' }
  const highlight = (label, key) =>
    status === key ? `<span style='color:${color[key]};font-weight:700'>${label}</span>` : label
  return `${highlight(normal, '정상')} · ${highlight(caution, '주의')} · ${highlight(danger, '위험')}`
}

function ResultCard({ label, value, unit, status, barPosition, barWidth, rangeText, subText }) {
  return (
    <article className="bg-white rounded-[10px] border border-[#E4E4E7] p-5">
      <div className="flex justify-between items-start mb-3">
        <h4 className="text-[13px] font-[500] text-[#52525B]">{label}</h4>
        <StatusBadge status={status} />
      </div>
      <div className="mb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-[24px] font-[700] text-[#09090B] leading-none tracking-tight">{value}</span>
          <span className="text-[13px] font-[500] text-[#52525B]">{unit}</span>
        </div>
        {subText && <p className="text-[11px] font-[500] text-[#A1A1AA] mt-1.5">{subText}</p>}
      </div>
      <div className="relative h-1.5 w-full bg-[#F4F4F5] rounded-full overflow-hidden mb-2">
        <div className={`absolute top-0 h-full rounded-full ${getBarColor(status)}`} style={{ left: barPosition, width: barWidth }} />
      </div>
      <p className="text-[11px] font-[500] text-[#A1A1AA]" dangerouslySetInnerHTML={{ __html: rangeText }} />
    </article>
  )
}

function classifyBp(systolic, diastolic) {
  if (systolic <= 120 && diastolic <= 80) return '정상'
  if (systolic < 130 && diastolic < 80) return '주의'
  return '위험'
}

function classifyGlucose(value) {
  if (value < 100) return '정상'
  if (value < 126) return '주의'
  return '위험'
}

function classifyCholesterol(total, hdl, ldl, triglyceride) {
  if (total < 200 && ldl < 130 && triglyceride < 150) return '정상'
  if (total < 240 && ldl < 160 && triglyceride < 200) return '주의'
  return '위험'
}

function classifyBmi(height, weight) {
  const bmi = (weight / ((height / 100) ** 2)).toFixed(1)
  if (bmi < 23) return { bmi, status: '정상' }
  if (bmi < 25) return { bmi, status: '주의' }
  return { bmi, status: '위험' }
}

function HealthCheckResults() {
  const navigate = useNavigate()
  const { year } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    fetch(`${base}/health-checkups/year/${year}`, {
      headers: { Authorization: `Bearer ${getAccessToken()}` }
    })
      .then(res => res.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [year])

  if (loading) return (
    <div className="w-full min-h-[100dvh] flex items-center justify-center">
      <p className="text-[13px] text-[#A1A1AA]">불러오는 중...</p>
    </div>
  )

  const bpStatus = data?.bp_systolic && data?.bp_diastolic
    ? classifyBp(data.bp_systolic, data.bp_diastolic) : null
  const glucoseStatus = data?.fasting_glucose
    ? classifyGlucose(data.fasting_glucose) : null
  const cholesterolStatus = data?.total_cholesterol && data?.ldl && data?.triglyceride
    ? classifyCholesterol(data.total_cholesterol, data.hdl, data.ldl, data.triglyceride) : null
  const bmiResult = data?.height && data?.weight
    ? classifyBmi(data.height, data.weight) : null

  const statuses = [bpStatus, glucoseStatus, cholesterolStatus, bmiResult?.status].filter(Boolean)
  const normalCount = statuses.filter(s => s === '정상').length
  const cautionCount = statuses.filter(s => s === '주의').length
  const dangerCount = statuses.filter(s => s === '위험').length

  const handleDelete = () => {
    fetch(`${base}/health-checkups/year/${year}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getAccessToken()}` }
    })
      .then(() => navigate(-1))
      .catch(err => console.log('error:', err))
  }

  const handleChat = async () => {
    try {
      const session = await createChatSession('HEALTH_CHECKUP', data?.id ? Number(data.id) : null)
      navigate(`/chat/${session.id}?context_type=HEALTH_CHECKUP`)
    } catch {
      window.alert('채팅 세션 생성에 실패했어요.')
    }
  }

  return (
    <div className="bg-white md:bg-[#F4F4F5] w-full min-h-[100dvh] flex justify-center">
      <div className="w-full min-h-[100dvh] bg-white flex flex-col mx-auto md:max-w-[480px] md:rounded-[24px] md:shadow-2xl md:my-8 md:overflow-hidden">

        <Header
          variant="back"
          title="건강검진 결과"
          rightAction={
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="w-10 h-10 flex items-center justify-center text-[#18181B]"
              >
                <FontAwesomeIcon icon={faEllipsisVertical} className="text-[16px]" />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-10 z-50 bg-white rounded-[10px] shadow-lg border border-[#E4E4E7] overflow-hidden w-[120px]">
                    <button
                      onClick={() => { setShowMenu(false); navigate(`/health-checkup/input/${year}`) }}
                      className="w-full px-5 py-3 text-[14px] font-[500] text-[#18181B] text-left hover:bg-[#F5F5F5]"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => { setShowMenu(false); handleDelete() }}
                      className="w-full px-5 py-3 text-[14px] font-[500] text-red-500 text-left hover:bg-[#F5F5F5]"
                    >
                      삭제
                    </button>
                  </div>
                </>
              )}
            </div>
          }
        />

        <div className="flex-1 overflow-y-auto px-5 pt-5 pb-4 space-y-4">

          <section className="bg-white rounded-[10px] border border-[#E4E4E7] p-5">
            <h2 className="text-[14px] font-[700] text-[#18181B] mb-4">{year}년 검진 결과</h2>
            <div className="grid grid-cols-3 divide-x divide-[#E4E4E7]">
              <div className="flex flex-col items-center justify-center px-2">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  <span className="text-[11px] font-[700] text-[#A1A1AA] tracking-wider uppercase">정상</span>
                </div>
                <span className="text-[28px] font-[700] text-green-600 leading-none">{normalCount}</span>
              </div>
              <div className="flex flex-col items-center justify-center px-2">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                  <span className="text-[11px] font-[700] text-[#A1A1AA] tracking-wider uppercase">주의</span>
                </div>
                <span className="text-[28px] font-[700] text-yellow-500 leading-none">{cautionCount}</span>
              </div>
              <div className="flex flex-col items-center justify-center px-2">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                  <span className="text-[11px] font-[700] text-[#A1A1AA] tracking-wider uppercase">위험</span>
                </div>
                <span className="text-[28px] font-[700] text-[#A1A1AA] leading-none">{dangerCount}</span>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-[13px] font-[700] text-[#52525B] px-1">항목별 결과</h3>
            {bpStatus && (
              <ResultCard
                label="혈압"
                value={`${data.bp_systolic}/${data.bp_diastolic}`}
                unit="mmHg"
                status={bpStatus}
                barPosition="20%" barWidth="40%"
                rangeText={getRangeText(bpStatus, '정상 ≤120/80', '주의 121~129/<80', '위험 ≥130/80')}
              />
            )}
            {glucoseStatus && (
              <ResultCard
                label="공복혈당"
                value={data.fasting_glucose}
                unit="mg/dL"
                status={glucoseStatus}
                barPosition="10%" barWidth="40%"
                rangeText={getRangeText(glucoseStatus, '정상 <100', '주의 100~125', '위험 ≥126')}
              />
            )}
            {cholesterolStatus && (
              <ResultCard
                label="총 콜레스테롤"
                value={data.total_cholesterol}
                unit="mg/dL"
                status={cholesterolStatus}
                barPosition="15%" barWidth="45%"
                rangeText={getRangeText(cholesterolStatus, '정상 <200', '주의 200~239', '위험 ≥240')}
              />
            )}
            {bmiResult && (
              <ResultCard
                label="BMI (체질량지수)"
                value={bmiResult.bmi}
                unit="kg/m²"
                status={bmiResult.status}
                barPosition="55%" barWidth="20%"
                subText={`${data.height} cm / ${data.weight} kg 기준`}
                rangeText={getRangeText(bmiResult.status, '정상 18.5~22.9', '주의 23~24.9', '위험 ≥25')}
              />
            )}
          </section>

          <div className="bg-white border border-[#E4E4E7] rounded-[10px] p-4 flex gap-2.5 items-start">
            <FontAwesomeIcon icon={faCircleInfo} className="text-[#A1A1AA] mt-0.5 text-[12px] shrink-0" />
            <p className="text-[12px] leading-relaxed text-[#52525B] font-[500]">
              본 결과는 건강검진 데이터를 기반으로 제공되며, 의학적 진단을 대신할 수 없습니다. 정확한 진단 및 치료를 위해서는 반드시 전문의와 상담하시기 바랍니다.
            </p>
          </div>

          <button
            onClick={handleChat}
            className="w-full h-12 bg-white border border-primary text-primary text-[14px] font-[700] rounded-[12px] flex items-center justify-center gap-2 hover:bg-primarySoft transition-colors"
          >
            <FontAwesomeIcon icon={faComments} className="text-[14px]" />
            <span>AI에게 질문하기</span>
          </button>

        </div>

        <BottomAction
          label="AI 가이드 받기"
          onClick={() => navigate('/guide')}
          subText="홈으로 가기"
          onSubText={() => navigate('/home')}
        />

      </div>
    </div>
  )
}

export default HealthCheckResults