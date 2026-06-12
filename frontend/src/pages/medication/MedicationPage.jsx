import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Header from '../../components/Header.jsx'
import MobileFrame from '../../components/MobileFrame.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import { faPills } from '@fortawesome/free-solid-svg-icons'
import { getMedications, getTodayMedication, deleteMedication, checkMedication, deleteSchedule} from '../../api/medication.js'
import { fmtTimes } from '../../utils/medicationFormat.js'

export default function MedicationPage() {
  const [params] = useSearchParams()
  const [view, setView] = useState(params.get('view') === 'today' ? 'today' : 'list')
  const navigate = useNavigate()

  if (view === 'today') return <TodayMedication onBack={() => setView('list')} />
  return <MedicationList onTodayClick={() => setView('today')} navigate={navigate} />
}

// ────────────────────────────────────────────────────────────
// [Image 1] 복약 관리 목록
// ────────────────────────────────────────────────────────────

function MedicationList({ onTodayClick, navigate }) {
  const [activeTab, setActiveTab]           = useState('복약 중')
  const [keyword, setKeyword]               = useState('')
  const [sortBy, setSortBy]                 = useState('latest')
  const [categoryFilter, setCategoryFilter] = useState('전체')
  const [allMedications, setAllMedications] = useState([])
  const [isLoading, setIsLoading]           = useState(false)
  const [error, setError]                   = useState(null)
  const [openMenuId, setOpenMenuId]         = useState(null)
  const [fabOpen, setFabOpen]               = useState(false)
  const [actionError, setActionError]       = useState(null)

  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await getMedications()
        if (res.success) setAllMedications(res.data)
        else setError(res.message ?? '데이터를 불러오지 못했습니다.')
      } catch {
        setError('네트워크 오류가 발생했습니다.')
      } finally {
        setIsLoading(false)
      }
    }
    fetch()
  }, [])

  useEffect(() => {
    if (!openMenuId) return
    const close = () => setOpenMenuId(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [openMenuId])

  const handleDelete = async (id) => {
    if (!window.confirm('복약을 종료 처리할까요?')) return

    setActionError(null)
    const med = allMedications.find(m => m.id === id)
    try {
      if (med?.source === 'custom') {
        await deleteSchedule(id)
      } else {
        await deleteMedication(id)
      }
      const res = await getMedications()
      if (res.success) setAllMedications(res.data)
    } catch {
      setActionError('종료 처리에 실패했어요. 다시 시도해 주세요.')
    }
  }

  const handleMenuToggle = (e, id) => {
    e.stopPropagation()
    setOpenMenuId((prev) => (prev === id ? null : id))
  }

  const activeCount   = allMedications.filter(m => m.status === '진행 중').length
  const inactiveCount = allMedications.filter(m => m.status === '종료').length

  const filtered = allMedications
    .filter(m => m.status === (activeTab === '복약 중' ? '진행 중' : '종료'))
    .filter(m => categoryFilter === '전체' || m.category === categoryFilter)
    .filter(m => !keyword.trim() || m.name.includes(keyword) || m.description.includes(keyword))
    .sort((a, b) => sortBy === 'latest'
      ? new Date(b.startDate) - new Date(a.startDate)
      : a.name.localeCompare(b.name, 'ko'))

  return (
    <MobileFrame
      contentBg="white"
      header={<Header variant="back" title="복약 관리" />}
    >

        {/* 탭 */}
        <div className="sticky top-[72px] z-10 flex border-b border-[#F4F4F5] bg-white">
          {['복약 중', '복약 종료'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-[14px] font-[600] flex items-center justify-center gap-1.5 transition-colors
                ${activeTab === tab ? 'text-[#2563EB] border-b-2 border-[#2563EB]' : 'text-[#A1A1AA]'}`}
            >
              {tab}
              <span className={`text-[13px] font-[700] ${activeTab === tab ? 'text-[#2563EB]' : 'text-[#A1A1AA]'}`}>
                {tab === '복약 중' ? activeCount : inactiveCount}
              </span>
            </button>
          ))}
        </div>

        <div className="px-4 pt-4 pb-28 space-y-3">

          {/* 검색창 */}
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A1A1AA]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="약 이름, 효능 검색"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#F4F4F5] rounded-[10px] text-[14px] text-[#09090B] placeholder-[#A1A1AA] outline-none"
            />
          </div>

          {/* 필터 버튼 */}
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 bg-white border border-[#E4E4E7] rounded-[8px] text-[13px] text-[#09090B] font-[500] outline-none"
            >
              <option value="latest">최신순</option>
              <option value="name">이름순</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-[#E4E4E7] rounded-[8px] text-[13px] text-[#09090B] font-[500] outline-none"
            >
              <option value="전체">전체</option>
              <option value="처방약">처방약</option>
              <option value="일반의약품">일반의약품</option>
            </select>
          </div>

          {/* 로딩 / 에러 */}
          {isLoading && (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {error && <p className="text-center text-[14px] text-red-400 py-8">{error}</p>}
          {actionError && <p className="text-center text-[13px] text-red-400 py-2">{actionError}</p>}

          {/* 약 카드 목록 */}
          {!isLoading && !error && filtered.map((med) => (
            <div key={med.id} className="bg-white border border-borderHairline rounded-[14px] px-4 py-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {/* 카테고리 뱃지 */}
                  <span className={`inline-block text-[11px] font-[600] px-1.5 py-0.5 rounded-[4px] mb-1.5
                    ${med.category === '처방약' ? 'bg-primarySoft text-primary' : 'bg-borderLight text-subtext'}`}>
                    {med.category}
                  </span>

                  <h3 className="text-[16px] font-[700] text-textHeading leading-tight truncate">{med.name}</h3>

                  {/* 용량 · 식사기준 · 주기 (한 줄 병합). 시간 4개 이상은 fmtTimes로 범위 축약 */}
                  <div className="flex items-center gap-1.5 mt-1.5 text-[12px] text-subtext min-w-0">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-mute">
                      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span className="truncate">
                      {[med.description, med.mealTiming, med.isAsNeeded ? '필요시 복용' : (med.times?.length > 0 ? `매일 ${fmtTimes(med.times)}` : null)]
                        .filter(Boolean).join(' · ')}
                    </span>
                  </div>

                  <p className="text-[11px] text-mute mt-2">
                    {med.startDate?.replace(/-/g, '.')}
                    {med.endDate ? ` ~ ${med.endDate?.replace(/-/g, '.')}` : ' ~ 진행 중'}
                  </p>
                </div>

                {/* ── ⋮ 버튼 + 드롭다운 메뉴 (복약 중 탭에서만) ── */}
                {activeTab === '복약 중' && (
                  <div className="relative shrink-0">
                    <button
                      onClick={(e) => handleMenuToggle(e, med.id)}
                      className="p-1 text-[#A1A1AA] hover:text-[#52525B]"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="1.5" />
                        <circle cx="12" cy="12" r="1.5" />
                        <circle cx="12" cy="19" r="1.5" />
                      </svg>
                    </button>

                    {openMenuId === med.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-7 z-20 w-32 bg-white border border-[#E4E4E7] rounded-[10px] shadow-lg overflow-hidden"
                      >
                        <button
                          onClick={() => {
                            setOpenMenuId(null)
                            navigate(`/medication/form?mode=edit&id=${med.id}&source=${med.source}`)
                          }}
                          className="w-full flex items-center gap-2 px-3.5 py-2.5 text-[13px] text-[#09090B] font-[500] hover:bg-[#F4F4F5] transition-colors"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          수정
                        </button>

                        <div className="border-t border-[#F4F4F5]" />

                        <button
                          onClick={() => {
                            setOpenMenuId(null)
                            handleDelete(med.id)
                          }}
                          className="w-full flex items-center gap-2 px-3.5 py-2.5 text-[13px] text-red-400 font-[500] hover:bg-red-50 transition-colors"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                          종료 처리
                        </button>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          ))}

          {/* 빈 상태 — 건강검진·진료기록과 동일한 EmptyState 톤 */}
          {!isLoading && !error && filtered.length === 0 && (
            <div className="min-h-[360px] flex items-center justify-center">
              {(keyword.trim() || categoryFilter !== '전체') ? (
                <EmptyState
                  icon={faPills}
                  title="검색 결과가 없어요"
                  description={'다른 검색어나 필터를 시도해 보세요'}
                />
              ) : activeTab === '복약 중' ? (
                <EmptyState
                  icon={faPills}
                  title="아직 등록된 약이 없어요"
                  description={'오른쪽 아래 + 버튼으로 추가해 보세요'}
                />
              ) : (
                <EmptyState
                  icon={faPills}
                  title="복약 종료된 약이 없어요"
                  description={'복약을 끝내면 여기에서 볼 수 있어요'}
                />
              )}
            </div>
          )}
        </div>

        {/* 바깥 탭으로 닫기 위한 스크림 (열림 시 살짝 어둡게) */}
        {fabOpen && (
          <div
            className="fixed inset-0 z-10 bg-[#18181B]/20 transition-opacity"
            onClick={() => setFabOpen(false)}
          />
        )}

        {/* 플로팅 액션 — + 하나만 떠 있고, 탭하면 메뉴가 펼쳐짐 */}
        <div className="fixed right-5 md:right-[calc((100vw_-_480px)/2_+_20px)] flex flex-col items-end gap-3 bottom-24 z-20">
          {fabOpen && (
            <>
              <button
                onClick={() => { setFabOpen(false); navigate('/medication/record') }}
                className="bg-white border border-borderHairline shadow-md rounded-full px-4 py-2 text-[13px] font-[600] text-textHeading flex items-center gap-1.5 transition-colors hover:bg-primary hover:border-primary hover:text-white"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                  <line x1="8" y1="14" x2="16" y2="14"/>
                  <line x1="8" y1="18" x2="12" y2="18"/>
                </svg>
                복약 기록
              </button>

              <button
                onClick={() => { setFabOpen(false); navigate('/medication/history') }}
                className="bg-white border border-borderHairline shadow-md rounded-full px-4 py-2 text-[13px] font-[600] text-textHeading flex items-center gap-1.5 transition-colors hover:bg-primary hover:border-primary hover:text-white"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                복약 이력
              </button>

              <button
                onClick={() => { setFabOpen(false); onTodayClick() }}
                className="bg-white border border-borderHairline shadow-md rounded-full px-4 py-2 text-[13px] font-[600] text-textHeading flex items-center gap-1.5 transition-colors hover:bg-primary hover:border-primary hover:text-white"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                오늘의 복약
              </button>

              <button
                onClick={() => { setFabOpen(false); navigate('/medication/form') }}
                className="bg-white border border-borderHairline shadow-md rounded-full px-4 py-2 text-[13px] font-[600] text-textHeading flex items-center gap-1.5 transition-colors hover:bg-primary hover:border-primary hover:text-white"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3"/>
                  <circle cx="18" cy="18" r="3"/><path d="M22 22l-1.5-1.5"/>
                </svg>
                복용 약 등록
              </button>
            </>
          )}

          <button
            onClick={() => setFabOpen((o) => !o)}
            aria-label={fabOpen ? '메뉴 닫기' : '메뉴 열기'}
            className="w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg"
          >
            <svg
              width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"
              className={`transition-transform duration-200 ${fabOpen ? 'rotate-45' : ''}`}
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

    </MobileFrame>
  )
}

// ────────────────────────────────────────────────────────────
// [Image 2] 오늘의 복약
// ────────────────────────────────────────────────────────────

function TodayMedication({ onBack }) {
  const [todayMedication, setTodayMedication] = useState(null)
  const [isLoading, setIsLoading]             = useState(false)
  const [error, setError]                     = useState(null)
  const [actionError, setActionError]         = useState(null)

  const fetch = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await getTodayMedication()
      if (res.success) setTodayMedication(res.data)
      else setError(res.message ?? '데이터를 불러오지 못했습니다.')
    } catch (e){
      console.error('오늘의 복약 에러:', e)
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetch() }, [])

  const handleCheck = async (medicationId, mealTime, currentStatus) => {
    setActionError(null)
    try {
      await checkMedication({
        medicationId,
        mealTime,
        takenAt: new Date().toISOString(),
        isChecked: currentStatus !== '완료',
      })
      await fetch()
    } catch {
      setActionError('복용 체크에 실패했어요. 다시 시도해 주세요.')
    }
  }

  const mealIcon = {
    아침: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#71717A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
      </svg>
    ),
    점심: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#71717A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    저녁: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#71717A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>
    ),
  }

  return (
    <MobileFrame
      contentBg="white"
      header={<Header variant="back" title="오늘의 복약" onBack={onBack} />}
    >

        {isLoading && (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {error && <p className="text-center text-[14px] text-red-400 py-8">{error}</p>}
        {actionError && <p className="text-center text-[13px] text-red-400 py-2">{actionError}</p>}

        {!isLoading && !error && todayMedication && (
          <div className="px-4 pt-2 space-y-3">

            {/* 진행률 카드 */}
            <div className="bg-white border border-[#E4E4E7] rounded-[14px] px-5 py-4 shadow-sm">
              <div className="flex items-center gap-1.5 text-[12px] text-[#71717A] mb-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                {todayMedication.dateLabel}
              </div>
              <p className="text-[28px] font-[800] text-[#09090B] leading-tight">
                {todayMedication.completedCount}
                <span className="text-[20px] text-[#A1A1AA] font-[500]">/{todayMedication.totalCount}회 복용 완료</span>
              </p>
              <div className="mt-3 bg-[#F4F4F5] rounded-full h-2">
                <div
                  className="bg-[#2563EB] h-2 rounded-full transition-all duration-500"
                  style={{ width: `${todayMedication.completionRate}%` }}
                />
              </div>
              <p className="text-[13px] font-[600] text-[#2563EB] mt-1.5">{todayMedication.completionRate}% 완료</p>
            </div>

            {/* 시간대별 그룹 */}
            {todayMedication.groups.map((group) => (
              <div key={group.mealTime}>
                <div className="flex items-center justify-between px-1 py-2">
                  <div className="flex items-center gap-1.5">
                    {mealIcon[group.mealTime]}
                    <span className="text-[13px] font-[600] text-[#52525B]">{group.mealTime}</span>
                    <span className="text-[12px] text-[#A1A1AA]">· {group.clockTime} · {group.timing}</span>
                  </div>
                  {group.completionStatus === '완료' ? (
                    <div className="flex items-center gap-1 text-[#22C55E]">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                      <span className="text-[12px] font-[600]">완료</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[#A1A1AA]">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                      </svg>
                      <span className="text-[12px] font-[500]">예정</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {group.entries.map((entry) => (
                    <button
                      key={entry.medicationId}
                      onClick={() => handleCheck(entry.medicationId, group.mealTime, entry.completionStatus)}
                      className="w-full bg-white border border-[#E4E4E7] rounded-[14px] px-4 py-3.5 flex items-center gap-3 shadow-sm text-left"
                    >
                      <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                        ${entry.completionStatus === '완료' ? 'bg-[#2563EB] border-[#2563EB]' : 'bg-white border-[#D4D4D8]'}`}>
                        {entry.completionStatus === '완료' && (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className={`text-[14px] font-[600] leading-tight truncate
                          ${entry.completionStatus === '완료' ? 'text-[#A1A1AA] line-through' : 'text-[#09090B]'}`}>
                          {entry.medicationName}
                        </p>
                        <p className="text-[12px] text-[#A1A1AA] mt-0.5 truncate">
                          {[`${entry.dosageAmount}${entry.dosageUnit}`.trim(), entry.mealTiming, entry.categoryLabel].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* 복약 팁 */}
            <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-[14px] px-4 py-4 flex gap-3 items-start mt-2">
              <div className="w-8 h-8 rounded-full bg-[#2563EB] flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <div>
                <p className="text-[13px] font-[700] text-[#2563EB] mb-0.5">복약 팁</p>
                <p className="text-[12px] text-[#3B82F6] leading-relaxed">
                  복약 후 카드를 탭하면 체크할 수 있어요. 복용 기록은 자동으로 저장됩니다.
                </p>
              </div>
            </div>

          </div>
        )}
    </MobileFrame>
  )
}