import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEllipsisVertical } from '@fortawesome/free-solid-svg-icons'

function HealthCheckCard({ record, onDelete }) {
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)

  return (
    <article className="bg-white rounded-[12px] border border-[#E4E4E7] relative">
      <div
        onClick={() => navigate(`/health-checkup/results/${record.checkup_year}`)}
        className="p-5 flex items-center justify-between cursor-pointer active:bg-[#F5F5F5] transition-colors rounded-[12px]"
      >
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <span className="text-[13px] font-[500] text-[#A1A1AA]">{record.checkup_year}년</span>
          <h2 className="text-[16px] font-[700] text-[#18181B]">건강검진 결과</h2>
          <p className="text-[14px] font-[500] text-[#71717A]">
            정상 {record.normal_count ?? '-'} · 주의 {record.caution_count ?? '-'} · 위험 {record.danger_count ?? '-'}
          </p>
        </div>
        <button
          onClick={e => { e.stopPropagation(); setShowMenu(!showMenu) }}
          className="p-2 text-[#A1A1AA] shrink-0"
        >
          <FontAwesomeIcon icon={faEllipsisVertical} className="text-[16px]" />
        </button>
      </div>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-4 top-12 z-50 bg-white rounded-[10px] shadow-lg border border-[#E4E4E7] overflow-hidden">
            <button
              onClick={() => { setShowMenu(false); navigate(`/health-checkup/input/${record.checkup_year}`) }}
              className="w-full px-5 py-3 text-[14px] font-[500] text-[#18181B] text-left hover:bg-[#F5F5F5]"
            >
              수정
            </button>
            <button
              onClick={() => { setShowMenu(false); onDelete(record.id) }}
              className="w-full px-5 py-3 text-[14px] font-[500] text-red-500 text-left hover:bg-[#F5F5F5]"
            >
              삭제
            </button>
          </div>
        </>
      )}
    </article>
  )
}

export default HealthCheckCard