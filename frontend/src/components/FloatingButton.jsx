import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'

function FloatingButton({ onClick, icon = faPlus }) {
  return (
    // 데스크탑(md+)에선 480 카드 우측 안쪽에 맞춤(뷰포트 우측 아님). 모바일은 카드=전체폭이라 right-5.
    <button
      onClick={onClick}
      className="fixed right-5 md:right-[calc((100vw_-_480px)/2_+_20px)] bottom-[calc(73.2px_+_16px_+_env(safe-area-inset-bottom))] w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center z-40"
    >
      <FontAwesomeIcon icon={icon} className="text-[22px]" />
    </button>
  )
}

export default FloatingButton