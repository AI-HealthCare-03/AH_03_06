import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/Header.jsx'
import Badge from '../../components/Badge.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import FloatingButton from '../../components/FloatingButton.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMoon, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { listSleepGuides } from '../../api/sleepGuides.js'


const STATUS_META = {
  0: { label: '정상', tone: 'normal' },
  1: { label: '주의', tone: 'warning' },
  2: { label: '위험', tone: 'danger' },
}


function hoursToHM(h) {
  if (h == null) return '—'
  const total = Math.round(h * 60)
  const hh = Math.floor(total / 60)
  const mm = total % 60
  return mm === 0 ? `${hh}시간` : `${hh}시간 ${mm}분`
}


function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
}


function SleepGuideListPage() {
  const navigate = useNavigate()
  const [guides, setGuides] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    listSleepGuides()
      .then((data) => { if (!cancelled) setGuides(data.guides || []) })
      .catch((err) => { if (!cancelled) setError(err?.message ?? '목록을 불러오지 못했어요.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="bg-white md:bg-[#F4F4F5] w-full min-h-[100dvh] flex justify-center">
      <div className="w-full bg-white relative flex flex-col min-h-[100dvh] mx-auto md:max-w-[480px] md:rounded-[24px] md:shadow-2xl md:my-8 pb-10">

        <Header variant="back" title="수면 가이드" />

        <main className="px-5 pt-5 pb-2 space-y-3">

          {loading && (
            <p className="text-[13px] text-mute text-center py-10">불러오는 중…</p>
          )}

          {!loading && error && (
            <p className="text-[13px] text-error text-center py-10">{error}</p>
          )}

          {/* 빈 상태 */}
          {!loading && !error && guides.length === 0 && (
            <EmptyState
              icon={faMoon}
              title="아직 수면 가이드가 없어요"
              description="간단한 설문으로 나에게 맞는 수면 가이드를 받아보세요."
            />
          )}

          {/* 리스트 */}
          {!loading && !error && guides.length > 0 && (
            <>
              <div className="flex items-center pt-1">
                <span className="text-[11px] text-mute">총 {guides.length}건</span>
              </div>
              {guides.map((g) => {
                const status = STATUS_META[g.overall_status] || STATUS_META[0]
                return (
                  <button
                    key={g.guide_id}
                    onClick={() => navigate(`/sleep-guides/${g.guide_id}`)}
                    className="w-full bg-white border border-borderHairline rounded-[12px] p-4 text-left hover:bg-bgSubtle transition-colors flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge tone={status.tone} pill>{status.label}</Badge>
                        <span className="text-[11px] text-mute">{formatDate(g.created_at)}</span>
                        {g.is_fallback && (
                          <span className="text-[10px] text-mute">· 정보 부족</span>
                        )}
                      </div>
                      <p className="text-[13px] text-textBody font-medium mb-0.5">
                        평균 수면 {hoursToHM(g.sleep_hours_avg)}
                      </p>
                      {g.key_point && (
                        <p className="text-[12px] text-subtext line-clamp-2 leading-relaxed">{g.key_point}</p>
                      )}
                    </div>
                    <FontAwesomeIcon icon={faChevronRight} className="text-mute text-[12px] flex-shrink-0" />
                  </button>
                )
              })}
            </>
          )}
        </main>

        <FloatingButton onClick={() => navigate('/sleep-guides/new')} />
      </div>
    </div>
  )
}

export default SleepGuideListPage
