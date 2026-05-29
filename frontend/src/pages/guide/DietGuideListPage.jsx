import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/Header.jsx'
import FloatingButton from '../../components/FloatingButton.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUtensils, faEllipsisVertical, faXmark } from '@fortawesome/free-solid-svg-icons'
import { listDietGuides, generateDietGuide } from '../../api/dietGuides.js'
import { listHealthCheckups } from '../../api/healthCheckup.js'


const MEAL_PLAN_KO = {
  'Balanced Diet':               '균형 식단',
  'Low-Sodium Diet':             '저염 식단',
  'Low-Carb Diet':               '저탄수화물 식단',
  'Low-Calorie Diet':            '저칼로리 식단',
  'Low-Carb Low-Sodium Diet':    '저탄수화물·저염 식단',
  'Low-Calorie Low-Sodium Diet': '저칼로리·저염 식단',
  'Low-Carb Low-Calorie Diet':   '저탄수화물·저칼로리 식단',
  'Therapeutic Diet':            '치료 식단',
}


function formatCreatedAt(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}


function DietGuideListPage() {
  const navigate = useNavigate()
  const [guides, setGuides] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [checkups, setCheckups] = useState([])
  const [checkupsLoading, setCheckupsLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatingMsg, setGeneratingMsg] = useState('')
  const pollRef = useRef(null)
  const prevCountRef = useRef(0)

  useEffect(() => {
    fetchGuides()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  const fetchGuides = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listDietGuides()
      const list = Array.isArray(data?.guides) ? data.guides : []
      setGuides(list)
      prevCountRef.current = list.length
    } catch (err) {
      setError(err?.message ?? '가이드 목록을 불러오지 못했어요.')
    } finally {
      setLoading(false)
    }
  }

  const startPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const data = await listDietGuides()
        const list = Array.isArray(data?.guides) ? data.guides : []
        if (list.length > prevCountRef.current) {
          setGuides(list)
          prevCountRef.current = list.length
          setGenerating(false)
          setGeneratingMsg('')
          clearInterval(pollRef.current)
        }
      } catch {}
    }, 3000)
  }

  const handleOpenModal = async () => {
    setShowModal(true)
    setCheckupsLoading(true)
    try {
      const data = await listHealthCheckups()
      setCheckups(Array.isArray(data?.checkups) ? data.checkups : [])
    } catch {
      setCheckups([])
    } finally {
      setCheckupsLoading(false)
    }
  }

  const handleSelectCheckup = async (checkupId) => {
    setGenerating(true)
    setGeneratingMsg('가이드를 생성하고 있어요. 잠시만 기다려 주세요…')
    try {
      await generateDietGuide(checkupId)
      setShowModal(false)
      startPolling()
    } catch (err) {
      setGenerating(false)
      setGeneratingMsg('')
      window.alert(err?.message ?? '가이드 생성 요청에 실패했어요.')
    }
  }

  return (
    <div className="bg-white md:bg-[#F4F4F5] w-full min-h-[100dvh] flex justify-center">
      <div className="w-full bg-white relative flex flex-col min-h-[100dvh] mx-auto md:max-w-[480px] md:rounded-[24px] md:shadow-2xl md:my-8 pb-10">

        <Header variant="back" title="식단 가이드" />

        <main className="px-5 pt-5 pb-2 space-y-3">

          {generatingMsg && (
            <div className="bg-primarySoft border border-primary/20 rounded-[10px] px-4 py-3">
              <p className="text-[12px] text-primary text-center">{generatingMsg}</p>
            </div>
          )}

          {loading && (
            <p className="text-[13px] text-mute text-center py-10">불러오는 중…</p>
          )}

          {!loading && error && (
            <p className="text-[13px] text-error text-center py-10">{error}</p>
          )}

          {!loading && !error && guides.length === 0 && (
            <section className="bg-bgSubtle border border-borderHairline rounded-[12px] p-6 text-center mt-6">
              <FontAwesomeIcon icon={faUtensils} className="text-mute text-[24px] mb-3" />
              <h2 className="text-[14px] font-[700] text-textHeading mb-1">
                아직 생성된 식단 가이드가 없어요
              </h2>
              <p className="text-[12px] text-subtext leading-relaxed">
                아래 + 버튼을 눌러 건강검진 기록을 선택하고 식단 가이드를 받아보세요.
              </p>
            </section>
          )}

          {!loading && !error && guides.length > 0 && (
            <>
              <p className="text-[11px] text-mute pt-1">총 {guides.length}건</p>
              {guides.map((g) => (
                <div
                  key={g.id}
                  onClick={() => navigate(`/diet-guides/${g.id}`)}
                  className="bg-white border border-borderHairline rounded-[12px] p-4 flex items-start justify-between gap-3 cursor-pointer active:bg-bgSubtle transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-[14px] font-[700] text-textHeading truncate">
                        {g.meal_plan_type
                          ? (MEAL_PLAN_KO[g.meal_plan_type] ?? g.meal_plan_type)
                          : '식단 가이드'}
                      </h2>
                      {!g.is_verified && (
                        <span className="flex-shrink-0 px-1.5 py-0.5 bg-bgSubtle text-mute text-[10px] font-[500] rounded">
                          검증 중
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-mute">{formatCreatedAt(g.created_at)}</p>
                  </div>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 -mr-1 text-mute hover:text-textBody transition-colors flex-shrink-0"
                  >
                    <FontAwesomeIcon icon={faEllipsisVertical} className="text-[14px]" />
                  </button>
                </div>
              ))}
            </>
          )}

        </main>

        <FloatingButton onClick={handleOpenModal} />

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => !generating && setShowModal(false)} />
            <div className="relative w-full md:max-w-[480px] bg-white rounded-t-[20px] px-5 pt-5 pb-8 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h2 className="text-[16px] font-[700] text-textHeading">건강검진 선택</h2>
                <button
                  onClick={() => !generating && setShowModal(false)}
                  className="p-1 text-mute hover:text-textBody"
                >
                  <FontAwesomeIcon icon={faXmark} className="text-[18px]" />
                </button>
              </div>
              <p className="text-[12px] text-subtext">어떤 건강검진 결과를 기준으로 식단 가이드를 생성할까요?</p>

              {checkupsLoading && (
                <p className="text-[13px] text-mute text-center py-6">불러오는 중…</p>
              )}

              {!checkupsLoading && checkups.length === 0 && (
                <p className="text-[13px] text-mute text-center py-6">등록된 건강검진 기록이 없어요.</p>
              )}

              {!checkupsLoading && checkups.length > 0 && (
                <div className="space-y-2">
                  {checkups.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleSelectCheckup(c.id)}
                      disabled={generating}
                      className="w-full bg-white border border-borderHairline rounded-[10px] p-4 text-left active:bg-bgSubtle transition-colors disabled:opacity-50"
                    >
                      <p className="text-[13px] font-[600] text-textHeading">{c.checkup_year}년 건강검진 결과</p>
                    </button>
                  ))}
                </div>
              )}

              {generating && (
                <p className="text-[12px] text-primary text-center animate-pulse">
                  가이드를 생성하고 있어요…
                </p>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default DietGuideListPage