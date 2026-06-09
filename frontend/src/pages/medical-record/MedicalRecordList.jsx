// pages/medical-record/MedicalRecordList.jsx
// 진료기록 목록 조회 — 정렬(최신/오래된순), 진료일·진단명·기관·진료과 표시,
// 빈 목록 처리, 기간·진료과 필터, 진단명·기관명 키워드 검색

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { listMedicalRecords } from '../../api/medicalrecord'
import Header from '../../components/Header'
import MobileFrame from '../../components/MobileFrame.jsx'
import EmptyState from '../../components/EmptyState'
import { faFileLines } from '@fortawesome/free-solid-svg-icons'

// 진료과 목록 (실제 서비스에서는 API로 조회)
const DEPARTMENTS = [
  { id: 1,  name: '내과' },
  { id: 2,  name: '외과' },
  { id: 3,  name: '정형외과' },
  { id: 4,  name: '치과' },
  { id: 5,  name: '안과' },
  { id: 6,  name: '이비인후과' },
  { id: 7,  name: '피부과' },
  { id: 8,  name: '산부인과' },
  { id: 9,  name: '소아청소년과' },
  { id: 10, name: '신경과' },
  { id: 11, name: '정신건강의학과' },
  { id: 12, name: '비뇨기과' },
]

// 날짜 포맷 헬퍼
function formatDate(dateStr) {
  // "2026-05-02" → "2026.05.02"
  return dateStr?.replace(/-/g, '.') ?? ''
}

// 카드 컴포넌트
function RecordCard({ record, departmentName, onClick }) {
  const hasPrescription = false // 목록 API에 처방약 미포함 → 상세 조회 후 표시 가능

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-neutral-100 rounded-2xl px-5 py-4 shadow-sm active:scale-[0.99] transition-transform duration-150"
    >
      {/* 날짜 + 처방전 뱃지 */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs text-neutral-400 font-medium">
          {formatDate(record.visit_date)}
        </span>
        {record.has_prescription && (
          <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
            처방전
          </span>
        )}
      </div>

      {/* 진단명 + 화살표 */}
      <div className="flex items-center justify-between">
        <span className="text-base font-bold text-neutral-900 leading-snug">
          {record.diagnosis_name}
        </span>
        <svg className="w-4 h-4 text-neutral-300 shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>

      {/* 진료 기관 · 진료과 */}
      {(record.hospital_name || departmentName) && (
        <p className="text-sm text-neutral-400 mt-1">
          {[record.hospital_name, departmentName].filter(Boolean).join(' · ')}
        </p>
      )}
    </button>
  )
}

// 필터 드로어
function FilterDrawer({ filters, onChange, onClose }) {
  const [local, setLocal] = useState(filters)

  function apply() {
    onChange(local)
    onClose()
  }
  function reset() {
    const empty = { department_id: '', start_date: '', end_date: '' }
    setLocal(empty)
    onChange(empty)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* 딤 */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* 드로어 */}
      <div className="relative w-full max-w-[375px] bg-white rounded-t-3xl px-6 pt-5 pb-24 shadow-2xl">
        {/* 핸들 */}
        <div className="w-10 h-1 rounded-full bg-neutral-200 mx-auto mb-5" />

        <h2 className="text-base font-bold text-neutral-900 mb-5">필터</h2>

        {/* 진료과 */}
        <div className="mb-5">
          <label className="text-sm font-medium text-neutral-700 mb-2 block">진료과</label>
          <select
            value={local.department_id}
            onChange={e => setLocal(p => ({ ...p, department_id: e.target.value }))}
            className="w-full h-12 bg-neutral-50 border border-neutral-200 rounded-xl px-4 text-sm text-neutral-900 outline-none focus:border-blue-500"
          >
            <option value="">전체</option>
            {DEPARTMENTS.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* 기간 */}
        <div className="mb-6">
          <label className="text-sm font-medium text-neutral-700 mb-2 block">기간</label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={local.start_date}
              onChange={e => setLocal(p => ({ ...p, start_date: e.target.value }))}
              className="flex-1 h-12 bg-neutral-50 border border-neutral-200 rounded-xl px-3 text-sm text-neutral-900 outline-none focus:border-blue-500"
            />
            <span className="text-neutral-400 text-sm">~</span>
            <input
              type="date"
              value={local.end_date}
              onChange={e => setLocal(p => ({ ...p, end_date: e.target.value }))}
              className="flex-1 h-12 bg-neutral-50 border border-neutral-200 rounded-xl px-3 text-sm text-neutral-900 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 h-12 rounded-xl border border-neutral-200 text-neutral-700 font-semibold text-sm"
          >
            초기화
          </button>
          <button
            onClick={apply}
            className="flex-[2] h-12 rounded-xl bg-blue-600 text-white font-semibold text-sm shadow-[0_4px_12px_rgba(37,99,235,0.3)]"
          >
            적용하기
          </button>
        </div>
      </div>
    </div>
  )
}

// 메인 컴포넌트
export default function MedicalRecordList() {
  const navigate = useNavigate()

  const [records, setRecords]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [sort, setSort]             = useState('latest')
  const [keyword, setKeyword]       = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [filters, setFilters]       = useState({ department_id: '', start_date: '', end_date: '' })
  const [showFilter, setShowFilter] = useState(false)

  useEffect(() => {
    const tabBar = document.querySelector('#bottom-nav')
    if (!tabBar) return
    tabBar.style.display = showFilter ? 'none' : ''
    return () => { tabBar.style.display = '' }
  }, [showFilter])


  // department_id → 이름 매핑
  const deptMap = Object.fromEntries(DEPARTMENTS.map(d => [String(d.id), d.name]))

  const activeFilterCount = [filters.department_id, filters.start_date, filters.end_date].filter(Boolean).length

  // 목록 조회
  const fetchRecords = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {
        sort,
        ...(keyword && { keyword }),
        ...(filters.department_id && { department_id: filters.department_id }),
        ...(filters.start_date && { start_date: filters.start_date }),
        ...(filters.end_date && { end_date: filters.end_date }),
      }
      const data = await listMedicalRecords(params)
      setRecords(data.medical_records ?? [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [sort, keyword, filters])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  // 검색 제출
  function handleSearch(e) {
    e.preventDefault()
    setKeyword(searchInput.trim())
  }

  const hasFilters = !!keyword || activeFilterCount > 0

  return (
    <MobileFrame header={<Header variant="back" title="진료기록" />}>

      {/* 검색바 */}
      <div className="px-5 pt-1 pb-3">
        <form onSubmit={handleSearch} className="relative">
          <input
            type="search"
            value={searchInput}
            onChange={e => {
              setSearchInput(e.target.value)
              if (e.target.value === '') setKeyword('')
            }}
            placeholder="진단명 또는 병원명 검색"
            className="w-full h-11 bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-blue-500 focus:bg-white transition-colors"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
        </form>
      </div>

      {/* 정렬 + 필터 바 */}
      <div className="px-5 pb-4 flex items-center justify-between shrink-0">
        {/* 건수 */}
        <span className="text-sm text-neutral-500">
          {loading || error ? '' : `총 ${records.length}건`}
        </span>

        <div className="flex items-center gap-2">
          {/* 필터 버튼 */}
          <button
            onClick={() => setShowFilter(true)}
            className={`flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-semibold border transition-colors ${
              activeFilterCount > 0
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-neutral-200 text-neutral-500 bg-white'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 12h10M11 20h2" />
            </svg>
            필터{activeFilterCount > 0 && ` (${activeFilterCount})`}
          </button>

          {/* 정렬 셀렉트 */}
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="h-8 px-2 pr-6 rounded-lg text-xs font-semibold border border-neutral-200 text-neutral-700 bg-white outline-none appearance-none cursor-pointer"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24'%3E%3Cpath fill='none' stroke='%23999' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round' d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}
          >
            <option value="latest">최신순</option>
            <option value="oldest">오래된순</option>
          </select>
        </div>
      </div>

      {/* 목록 */}
      <main className="flex-1 px-5 flex flex-col gap-3 overflow-y-auto pb-24">
        {loading ? (
          // 스켈레톤
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="w-full bg-neutral-50 rounded-2xl h-[88px] animate-pulse" />
          ))
        ) : error ? (
          <div className="flex flex-col items-center justify-center flex-1 py-20 gap-3">
            <p className="text-sm text-neutral-500">데이터를 불러오지 못했어요</p>
            <button onClick={fetchRecords} className="text-sm text-blue-600 font-semibold">
              다시 시도
            </button>
          </div>
        ) : records.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              icon={faFileLines}
              title={hasFilters ? '검색 결과가 없어요' : '아직 진료기록이 없어요'}
              description={hasFilters ? '다른 검색어나 필터를 시도해 보세요' : '오른쪽 아래 + 버튼으로 추가해 보세요'}
            />
          </div>
        ) : (
          records.map(record => (
            <RecordCard
              key={record.id}
              record={record}
              departmentName={record.department_id ? deptMap[String(record.department_id)] : null}
              onClick={() => navigate(`/medical-records/${record.id}`)}
            />
          ))
        )}
      </main>

      {/* FAB - 등록 버튼 */}
      <button
        onClick={() => navigate('/medical-records/new')}
        className="fixed bottom-6 right-5 md:right-[calc((100vw_-_480px)/2_+_20px)] w-14 h-14 rounded-full bg-blue-600 text-white shadow-[0_8px_24px_rgba(37,99,235,0.4)] flex items-center justify-center active:scale-95 transition-transform duration-150 z-10"
        aria-label="진료기록 추가"
      >
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* 필터 드로어 */}
      {showFilter && (
        <>
          {/* 딤 배경 */}
          <div className="fixed inset-0 bg-black/30 z-20" onClick={() => setShowFilter(false)} />

          {/* 바텀시트 — 화면 하단까지 (탭바 없음) */}
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-30 flex flex-col"
               style={{ maxHeight: '100vh' }}>

            {/* 핸들 */}
            <div className="flex justify-center pt-3 pb-2 shrink-0">
              <div className="w-10 h-1 bg-neutral-200 rounded-full" />
            </div>

            {/* 스크롤 영역 */}
            <div className="flex-1 overflow-y-auto px-5 pb-4">
              <FilterDrawer
                filters={filters}
                onChange={setFilters}
                onClose={() => setShowFilter(false)}
              />
            </div>

            {/* 적용 버튼 고정 */}
            <div className="shrink-0 px-5 pb-5 pt-2 border-t border-neutral-100">
              <button className="w-full h-12 bg-blue-500 text-white rounded-xl font-semibold">
                적용
              </button>
            </div>
          </div>
        </>
      )}
    </MobileFrame>
  )
}
