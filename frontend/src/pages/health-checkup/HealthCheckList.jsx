import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAccessToken } from '../../utils/token.js'
import Header from '../../components/Header.jsx'
import BottomNav from '../../components/BottomNav.jsx'
import FloatingButton from '../../components/FloatingButton.jsx'
import HealthCheckCard from '../../components/HealthCheckCard.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown, faSlidersH, faXmark } from '@fortawesome/free-solid-svg-icons'

const base = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

function getDefaultDateRange() {
  const today = new Date()
  const fiveYearsAgo = new Date()
  fiveYearsAgo.setFullYear(today.getFullYear() - 5)
  return {
    from: fiveYearsAgo.toISOString().split('T')[0],
    to: today.toISOString().split('T')[0],
  }
}

function HealthCheckList() {
  const navigate = useNavigate()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortDesc, setSortDesc] = useState(true)
  const [showFilter, setShowFilter] = useState(false)
  const defaultRange = getDefaultDateRange()
  const [filterFrom, setFilterFrom] = useState(defaultRange.from)
  const [filterTo, setFilterTo] = useState(defaultRange.to)
  const [tempFrom, setTempFrom] = useState(defaultRange.from)
  const [tempTo, setTempTo] = useState(defaultRange.to)

  useEffect(() => {
    fetch(`${base}/health-checkups`, {
      headers: { Authorization: `Bearer ${getAccessToken()}` }
    })
      .then(res => res.json())
      .then(data => setRecords(Array.isArray(data.checkups) ? data.checkups : []))
      .catch(err => console.log('error:', err))
      .finally(() => setLoading(false))
  }, [])

  const filtered = records.filter(r => {
    const year = r.checkup_year
    const from = parseInt(filterFrom.split('-')[0])
    const to = parseInt(filterTo.split('-')[0])
    return year >= from && year <= to
  })

  const sorted = [...filtered].sort((a, b) =>
    sortDesc ? b.checkup_year - a.checkup_year : a.checkup_year - b.checkup_year
  )

  const handleFilterOpen = () => {
    setTempFrom(filterFrom)
    setTempTo(filterTo)
    setShowFilter(true)
  }

  const handleFilterApply = () => {
    setFilterFrom(tempFrom)
    setFilterTo(tempTo)
    setShowFilter(false)
  }

  const handleFilterReset = () => {
    setTempFrom(defaultRange.from)
    setTempTo(defaultRange.to)
  }

  const handleDelete = (id) => {
    fetch(`${base}/health-checkups/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getAccessToken()}` }
    })
      .then(() => setRecords(prev => prev.filter(r => r.id !== id)))
      .catch(err => console.log('error:', err))
  }

  return (
    <div className="bg-white md:bg-[#F4F4F5] w-full min-h-[100dvh] flex justify-center">
      <div className="w-full bg-white relative flex flex-col min-h-[100dvh] mx-auto md:max-w-[480px] md:rounded-[24px] md:shadow-2xl md:my-8 pb-24">

        <Header variant="default" title="건강검진" showDivider={false} />

        <div className="sticky top-[72px] z-30 bg-white border-b border-[#F4F4F5] px-5 py-3 flex items-center justify-between">
          <span className="text-[14px] font-[500] text-[#71717A]">전체 {filtered.length}건</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSortDesc(!sortDesc)}
              className="flex items-center gap-1 text-[13px] font-[500] text-[#71717A]"
            >
              {sortDesc ? '최신순' : '오래된순'}
              <FontAwesomeIcon icon={faChevronDown} className="text-[10px]" />
            </button>
            <button
              onClick={handleFilterOpen}
              className={`text-[13px] font-[500] ${filterFrom !== defaultRange.from || filterTo !== defaultRange.to ? 'text-primary' : 'text-[#71717A]'}`}
            >
              <FontAwesomeIcon icon={faSlidersH} className="text-[14px]" />
            </button>
          </div>
        </div>

        <section className="px-5 pt-4 flex flex-col gap-3">
          {loading && (
            <p className="text-[13px] text-[#A1A1AA] text-center py-10">불러오는 중...</p>
          )}
          {!loading && sorted.length === 0 && (
            <div className="w-full min-h-[400px] flex flex-col items-center justify-center">
              <p className="text-[13px] text-[#A1A1AA]">건강검진 기록이 없습니다</p>
            </div>
          )}
          {sorted.map((record) => (
            <HealthCheckCard
              key={record.checkup_year}
              record={record}
              onDelete={handleDelete}
            />
          ))}
        </section>

        <FloatingButton onClick={() => navigate('/health-checkup/input')} />

        <BottomNav />
      </div>

      {showFilter && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setShowFilter(false)} />
          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full md:max-w-[480px] bg-white rounded-t-[20px] z-50 px-5 pt-4 pb-8">
            <div className="w-10 h-1 bg-[#E4E4E7] rounded-full mx-auto mb-5" />
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[16px] font-[700] text-[#18181B]">필터</h3>
              <button onClick={() => setShowFilter(false)}>
                <FontAwesomeIcon icon={faXmark} className="text-[18px] text-[#71717A]" />
              </button>
            </div>

            <div className="mb-6">
              <h4 className="text-[14px] font-[700] text-[#18181B] mb-3">검진 기간</h4>
              <div className="flex items-end gap-3">
                <div className="flex flex-col gap-1.5 w-[calc(50%-6px)]">
                  <span className="text-[13px] text-[#71717A]">시작</span>
                  <input
                    type="date"
                    value={tempFrom}
                    onChange={e => setTempFrom(e.target.value)}
                    className="w-full h-[48px] bg-[#F5F5F5] rounded-[8px] px-3 text-[14px] text-[#18181B] outline-none border border-transparent focus:border-primary"
                    style={{ colorScheme: 'light' }}
                  />
                </div>
                <div className="flex flex-col gap-1.5 w-[calc(50%-6px)]">
                  <span className="text-[13px] text-[#71717A]">종료</span>
                  <input
                    type="date"
                    value={tempTo}
                    onChange={e => setTempTo(e.target.value)}
                    className="w-full h-[48px] bg-[#F5F5F5] rounded-[8px] px-3 text-[14px] text-[#18181B] outline-none border border-transparent focus:border-primary"
                    style={{ colorScheme: 'light' }}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleFilterReset}
                className="flex-1 h-[52px] rounded-[12px] border border-[#E4E4E7] text-[14px] font-[700] text-[#71717A]"
              >
                초기화
              </button>
              <button
                onClick={handleFilterApply}
                className="flex-[2] h-[52px] rounded-[12px] bg-primary text-white text-[14px] font-[700]"
              >
                적용하기
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default HealthCheckList