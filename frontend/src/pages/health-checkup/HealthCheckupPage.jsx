import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAccessToken } from '../../utils/token.js'
import FormLayout from '../../components/FormLayout.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'

const base = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

const inputClass = "w-full h-[48px] bg-[#F5F5F5] rounded-[8px] pl-4 pr-12 text-[15px] font-[500] text-[#18181B] outline-none border border-transparent focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"

function Field({ label, value, onChange, unit, step = '1', required = false }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[13px] font-[500] text-[#71717A]">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          type="number"
          step={step}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="입력"
          className={inputClass}
        />
        {unit && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-[#A1A1AA] pointer-events-none">{unit}</span>}
      </div>
    </div>
  )
}

function HealthCheckInput() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasPrev, setHasPrev] = useState(false)

  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [waist, setWaist] = useState('')
  const [systolic, setSystolic] = useState('')
  const [diastolic, setDiastolic] = useState('')
  const [fastingGlucose, setFastingGlucose] = useState('')
  const [totalCholesterol, setTotalCholesterol] = useState('')
  const [hdl, setHdl] = useState('')
  const [ldl, setLdl] = useState('')
  const [triglyceride, setTriglyceride] = useState('')
  const [hemoglobin, setHemoglobin] = useState('')
  const [creatinine, setCreatinine] = useState('')
  const [ast, setAst] = useState('')
  const [alt, setAlt] = useState('')
  const [ggt, setGgt] = useState('')

  useEffect(() => {
    fetch(`${base}/health-checkups/latest`, {
      headers: { Authorization: `Bearer ${getAccessToken()}` }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setHasPrev(true)
          setHeight(data.height ?? '')
          setWeight(data.weight ?? '')
          setWaist(data.waist ?? '')
          setSystolic(data.bp_systolic ?? '')
          setDiastolic(data.bp_diastolic ?? '')
          setFastingGlucose(data.fasting_glucose ?? '')
          setTotalCholesterol(data.total_cholesterol ?? '')
          setHdl(data.hdl ?? '')
          setLdl(data.ldl ?? '')
          setTriglyceride(data.triglyceride ?? '')
          setHemoglobin(data.hemoglobin ?? '')
          setCreatinine(data.creatinine ?? '')
          setAst(data.ast ?? '')
          setAlt(data.alt ?? '')
          setGgt(data.ggt ?? '')
        }
      })
      .catch(() => {})
  }, [])

  const isFormValid = year && height && weight && systolic && diastolic && fastingGlucose

  const handleSubmit = async () => {
    if (!isFormValid) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${base}/health-checkups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAccessToken()}`
        },
        body: JSON.stringify({
          checkup_year: parseInt(year),
          height: parseFloat(height),
          weight: parseFloat(weight),
          waist: waist ? parseFloat(waist) : null,
          bp_systolic: parseInt(systolic),
          bp_diastolic: parseInt(diastolic),
          fasting_glucose: parseInt(fastingGlucose),
          total_cholesterol: totalCholesterol ? parseInt(totalCholesterol) : null,
          hdl: hdl ? parseInt(hdl) : null,
          ldl: ldl ? parseInt(ldl) : null,
          triglyceride: triglyceride ? parseInt(triglyceride) : null,
          hemoglobin: hemoglobin ? parseFloat(hemoglobin) : null,
          creatinine: creatinine ? parseFloat(creatinine) : null,
          ast: ast ? parseInt(ast) : null,
          alt: alt ? parseInt(alt) : null,
          ggt: ggt ? parseInt(ggt) : null,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.detail ?? '오류가 발생했어요')
      navigate(`/health-checkup/results/${year}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <FormLayout
      title="건강검진 입력"
      onNext={handleSubmit}
      nextLabel={loading ? '저장 중...' : '저장하기'}
      nextDisabled={!isFormValid || loading}
    >
      {hasPrev && (
        <div className="bg-[#EFF6FF] rounded-[12px] p-4 flex items-start gap-3 mb-6">
          <FontAwesomeIcon icon={faCircleInfo} className="text-primary mt-0.5 shrink-0" />
          <p className="text-[14px] leading-relaxed text-[#18181B] font-[500]">
            작년 건강검진 데이터가 미리 입력되어 있습니다.<br />
            <span className="text-[#71717A] font-[500] text-[13px]">변경된 항목이 있다면 수정해 주세요.</span>
          </p>
        </div>
      )}

      <div className="space-y-8">
        <section>
          <h2 className="text-[15px] font-[700] text-[#18181B] mb-4">검진 기준연도 <span className="text-red-500">*</span></h2>
          <div className="relative">
            <input
              type="number"
              value={year}
              onChange={e => setYear(e.target.value)}
              className={inputClass}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-[#A1A1AA] pointer-events-none">년</span>
          </div>
        </section>

        <hr className="border-[#F4F4F5]" />

        <section>
          <div className="mb-4">
            <h2 className="text-[15px] font-[700] text-[#18181B]">신체 계측</h2>
            <p className="text-[13px] text-[#A1A1AA] font-[500] mt-1">신장·체중 입력 시 프로필 기본 정보가 함께 업데이트돼요</p>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Field label="신장" value={height} onChange={setHeight} unit="cm" step="0.1" required />
            <Field label="체중" value={weight} onChange={setWeight} unit="kg" step="0.1" required />
          </div>
          <Field label="허리둘레" value={waist} onChange={setWaist} unit="cm" step="0.1" />
        </section>

        <hr className="border-[#F4F4F5]" />

        <section>
          <h2 className="text-[15px] font-[700] text-[#18181B] mb-4">혈압</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="수축기 혈압" value={systolic} onChange={setSystolic} unit="mmHg" required />
            <Field label="이완기 혈압" value={diastolic} onChange={setDiastolic} unit="mmHg" required />
          </div>
        </section>

        <hr className="border-[#F4F4F5]" />

        <section>
          <h2 className="text-[15px] font-[700] text-[#18181B] mb-4">혈당</h2>
          <Field label="공복혈당" value={fastingGlucose} onChange={setFastingGlucose} unit="mg/dL" required />
        </section>

        <hr className="border-[#F4F4F5]" />

        <section>
          <h2 className="text-[15px] font-[700] text-[#18181B] mb-4">콜레스테롤 <span className="text-[#A1A1AA] font-[500] text-[13px] ml-1">(선택)</span></h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="총 콜레스테롤" value={totalCholesterol} onChange={setTotalCholesterol} unit="mg/dL" />
            <Field label="HDL 콜레스테롤" value={hdl} onChange={setHdl} unit="mg/dL" />
            <Field label="LDL 콜레스테롤" value={ldl} onChange={setLdl} unit="mg/dL" />
            <Field label="중성지방" value={triglyceride} onChange={setTriglyceride} unit="mg/dL" />
          </div>
        </section>

        <hr className="border-[#F4F4F5]" />

        <section>
          <h2 className="text-[15px] font-[700] text-[#18181B] mb-4">혈액 검사 <span className="text-[#A1A1AA] font-[500] text-[13px] ml-1">(선택)</span></h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="혈색소" value={hemoglobin} onChange={setHemoglobin} unit="g/dL" step="0.1" />
            <Field label="크레아티닌" value={creatinine} onChange={setCreatinine} unit="mg/dL" step="0.01" />
            <Field label="AST" value={ast} onChange={setAst} unit="U/L" />
            <Field label="ALT" value={alt} onChange={setAlt} unit="U/L" />
            <div className="col-span-2">
              <Field label="감마지티피 (γ-GTP)" value={ggt} onChange={setGgt} unit="U/L" />
            </div>
          </div>
        </section>

        {error && <p className="text-red-500 text-[13px]">{error}</p>}
      </div>
    </FormLayout>
  )
}

export default HealthCheckInput