import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMedications, getTodayMedication, deleteMedication, checkMedication } from '../../api/medication.js'

export default function MedicationPage() {
  const [view, setView] = useState('list')
  const navigate = useNavigate()

  if (view === 'today') return <TodayMedication onBack={() => setView('list')} />
  return <MedicationList onTodayClick={() => setView('today')} navigate={navigate} />
}

// ────────────────────────────────────────────────────────────
// [Image 1] 복약 관리 목록
// ────────────────────────────────────────────────────────────

// MedicationPage.jsx - MedicationList 함수 수정본
// 변경된 부분:
// 1. openMenuId state 추가 (어떤 카드의 메뉴가 열려있는지 추적)
// 2. ⋮ 버튼 → 드롭다운 메뉴 (수정 / 종료 처리)로 교체
// 3. 메뉴 외부 클릭 시 닫힘 처리

function MedicationList({ onTodayClick, navigate }) {
  const [activeTab, setActiveTab]         = useState('복약 중')
  const [keyword, setKeyword]             = useState('')
  const [sortBy, setSortBy]               = useState('latest')
  const [categoryFilter, setCategoryFilter] = useState('전체')
  const [allMedications, setAllMedications] = useState([])
  const [isLoading, setIsLoading]         = useState(false)
  const [error, setError]                 = useState(null)
  const [openMenuId, setOpenMenuId]       = useState(null)  // ← 추가

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

  // 메뉴 외부 클릭 시 닫힘 처리  ← 추가
  useEffect(() => {
    if (!openMenuId) return
    const close = () => setOpenMenuId(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [openMenuId])

  const handleDelete = async (id) => {
    if (!window.confirm('복약을 종료 처리할까요?')) return
    await deleteMedication(id)
    const res = await getMedications()
    if (res.success) setAllMedications(res.data)
  }

  // ⋮ 버튼 클릭 핸들러  ← 추가
  const handleMenuToggle = (e, id) => {
    e.stopPropagation()  // 외부 클릭 이벤트 버블링 방지
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
    <div className="bg-[#FAFAFA] w-full min-h-[100dvh] flex justify-center">
      <div className="w-full bg-white relative flex flex-col min-h-[100dvh] mx-auto md:max-w-[480px]">

        {/* 헤더 */}
        <div className="flex items-center justify-center px-5 pt-5 pb-3 relative bg-white">
          <button onClick={() => navigate(-1)} className="absolute left-5 text-[#09090B]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 className="text-[17px] font-[700] text-[#09090B]">복약 관리</h1>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-[#F4F4F5] bg-white">
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

        <div className="flex-1 px-4 pt-4 pb-28 space-y-3 overflow-y-auto">

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

          {/* 약 카드 목록 */}
          {!isLoading && !error && filtered.map((med) => (
            <div key={med.id} className="bg-white border border-[#E4E4E7] rounded-[14px] px-4 py-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {/* 약 아이콘 */}
                  <div className="w-10 h-10 rounded-[10px] bg-[#F4F4F5] flex items-center justify-center shrink-0 mt-0.5">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3" />
                      <circle cx="18" cy="18" r="3" /><path d="M22 22l-1.5-1.5" />
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* 카테고리 뱃지 */}
                    <span className={`inline-block text-[11px] font-[600] px-1.5 py-0.5 rounded-[4px] mb-1
                      ${med.category === '처방약' ? 'bg-[#EFF6FF] text-[#2563EB]' : 'bg-[#F4F4F5] text-[#52525B]'}`}>
                      {med.category}
                    </span>

                    <h3 className="text-[15px] font-[700] text-[#09090B] leading-tight">{med.name}</h3>
                    <p className="text-[13px] text-[#71717A] mt-0.5">{med.description}</p>

                    {/* 복약 스케줄 */}
                    {med.schedule?.slots?.map((slot, i) => (
                      <div key={i} className="flex items-center gap-1.5 mt-2">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span className="text-[12px] text-[#71717A]">
                          {slot.dosageAmount}{slot.dosageUnit} ·{' '}
                          {med.schedule?.isAsNeeded
                            ? `필요시 (저녁 ${slot.clockTime})`
                            : `매일 ${slot.mealTime} ${slot.timing}${slot.timingMinutes ? ` ${slot.timingMinutes}분` : ''}`}
                        </span>
                      </div>
                    ))}

                    <p className="text-[11px] text-[#A1A1AA] mt-1.5">
                      {med.startDate?.replace(/-/g, '.')}
                      {med.endDate ? ` ~ ${med.endDate?.replace(/-/g, '.')}` : ' ~ 진행 중'}
                    </p>
                  </div>
                </div>

                {/* ── ⋮ 버튼 + 드롭다운 메뉴 (복약 중 탭에서만) ── */}
                {activeTab === '복약 중' && (
                  <div className="relative shrink-0">
                    {/* ⋮ 버튼 */}
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

                    {/* 드롭다운 메뉴 */}
                    {openMenuId === med.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-7 z-20 w-32 bg-white border border-[#E4E4E7] rounded-[10px] shadow-lg overflow-hidden"
                      >
                        {/* 수정 */}
                        <button
                          onClick={() => {
                            setOpenMenuId(null)
                            navigate('/medication/form', {
                              state: { mode: 'edit', medicationId: med.id }
                            })
                          }}
                          className="w-full flex items-center gap-2 px-3.5 py-2.5 text-[13px] text-[#09090B] font-[500] hover:bg-[#F4F4F5] transition-colors"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          수정
                        </button>

                        {/* 구분선 */}
                        <div className="border-t border-[#F4F4F5]" />

                        {/* 종료 처리 */}
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
                {/* ── 드롭다운 끝 ── */}

              </div>
            </div>
          ))}

          {/* 빈 상태 */}
          {!isLoading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-[#F4F4F5] flex items-center justify-center mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3" />
                </svg>
              </div>
              <p className="text-[14px] text-[#A1A1AA]">등록된 약이 없어요</p>
            </div>
          )}
        </div>

        {/* 플로팅 버튼 */}
        <div className="fixed bottom-20 right-4 md:right-[calc(50%-220px)] flex flex-col items-end gap-3">
          <button
            onClick={onTodayClick}
            className="bg-white border border-[#E4E4E7] shadow-md rounded-full px-4 py-2 text-[13px] font-[600] text-[#2563EB] flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            오늘의 복약
          </button>
          <button
            onClick={() => navigate('/medication/form')}
            className="w-14 h-14 bg-[#2563EB] rounded-full flex items-center justify-center shadow-lg"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// [Image 2] 오늘의 복약
// ────────────────────────────────────────────────────────────

function TodayMedication({ onBack }) {
  const [todayMedication, setTodayMedication] = useState(null)
  const [isLoading, setIsLoading]             = useState(false)
  const [error, setError]                     = useState(null)

  const fetch = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await getTodayMedication()
      if (res.success) setTodayMedication(res.data)
      else setError(res.message ?? '데이터를 불러오지 못했습니다.')
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetch() }, [])

  const handleCheck = async (medicationId, mealTime, currentStatus) => {
    await checkMedication({
      medicationId,
      mealTime,
      takenAt: new Date().toISOString(),
      isChecked: currentStatus !== '완료',
    })
    fetch()
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
    <div className="bg-[#FAFAFA] w-full min-h-[100dvh] flex justify-center">
      <div className="w-full bg-[#FAFAFA] relative flex flex-col min-h-[100dvh] mx-auto md:max-w-[480px] pb-10">

        {/* 헤더 */}
        <div className="flex items-center justify-center px-5 pt-5 pb-3 relative bg-[#FAFAFA]">
          <button onClick={onBack} className="absolute left-5 text-[#09090B]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 className="text-[17px] font-[700] text-[#09090B]">오늘의 복약</h1>
        </div>

        {isLoading && (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {error && <p className="text-center text-[14px] text-red-400 py-8">{error}</p>}

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
                {/* 그룹 헤더 */}
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

                {/* 약 카드들 */}
                <div className="space-y-2">
                  {group.entries.map((entry) => (
                    <button
                      key={entry.medicationId}
                      onClick={() => handleCheck(entry.medicationId, group.mealTime, entry.completionStatus)}
                      className="w-full bg-white border border-[#E4E4E7] rounded-[14px] px-4 py-3.5 flex items-center gap-3 shadow-sm text-left"
                    >
                      {/* 체크 원 */}
                      <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                        ${entry.completionStatus === '완료' ? 'bg-[#2563EB] border-[#2563EB]' : 'bg-white border-[#D4D4D8]'}`}>
                        {entry.completionStatus === '완료' && (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>

                      {/* 약 아이콘 */}
                      <div className="w-9 h-9 rounded-[8px] bg-[#F4F4F5] flex items-center justify-center shrink-0">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3"/>
                          <circle cx="18" cy="18" r="3"/><path d="M22 22l-1.5-1.5"/>
                        </svg>
                      </div>

                      {/* 약 정보 */}
                      <div>
                        <p className={`text-[14px] font-[600] leading-tight
                          ${entry.completionStatus === '완료' ? 'text-[#A1A1AA] line-through' : 'text-[#09090B]'}`}>
                          {entry.medicationName}
                        </p>
                        <p className="text-[12px] text-[#A1A1AA] mt-0.5">
                          {entry.dosageAmount}{entry.dosageUnit} · {entry.categoryLabel}
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
      </div>
    </div>
  )
}
