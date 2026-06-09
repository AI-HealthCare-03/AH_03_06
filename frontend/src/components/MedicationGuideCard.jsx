import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faEllipsisVertical,
  faBan,
} from '@fortawesome/free-solid-svg-icons'


function SafetyBadge({ guide }) {
  if (guide.safety_block) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-[700] bg-error/10 text-error">
        <FontAwesomeIcon icon={faBan} className="text-[9px]" />
        차단
      </span>
    )
  }
  if (guide.is_fallback) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-[500] bg-borderLight text-mute">
        정보 부족
      </span>
    )
  }
  return null
}


function formatCreatedAt(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}


function MedicationGuideCard({ guide, onDelete }) {
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)

  const title = guide.drug_name || '약품 미식별'
  // 구조화 가이드는 key_point, fallback 은 fallback_message 를 미리보기로 (레거시 main_content 폴백)
  const preview = (guide.key_point || guide.fallback_message || guide.main_content || '')
    .replace(/\s+/g, ' ').trim().slice(0, 80)

  return (
    <article className="bg-white rounded-[12px] border border-borderHairline relative">
      <div
        onClick={() => navigate(`/medication-guides/${guide.guide_id}`)}
        className="p-4 cursor-pointer active:bg-bgSubtle transition-colors rounded-[12px]"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[15px] font-[700] text-textHeading truncate">{title}</h2>
              <SafetyBadge guide={guide} />
            </div>
            <p className="text-[11px] text-mute mt-1">{formatCreatedAt(guide.created_at)}</p>
            {preview && (
              <p className="text-[13px] text-subtext mt-2 line-clamp-2 leading-relaxed">
                {preview}
              </p>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }}
            aria-label="가이드 메뉴 열기"
            className="p-2 -mr-2 text-mute shrink-0"
          >
            <FontAwesomeIcon icon={faEllipsisVertical} className="text-[16px]" />
          </button>
        </div>
      </div>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-3 top-12 z-50 bg-white rounded-[10px] shadow-lg border border-borderHairline overflow-hidden">
            <button
              onClick={() => { setShowMenu(false); onDelete(guide.guide_id) }}
              className="w-full px-5 py-3 text-[14px] font-[500] text-error text-left hover:bg-bgSubtle"
            >
              삭제
            </button>
          </div>
        </>
      )}
    </article>
  )
}

export default MedicationGuideCard
