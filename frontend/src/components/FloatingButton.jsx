import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'

function FloatingButton({ onClick, icon = faPlus }) {
  return (
    <button
      onClick={onClick}
      className="w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center z-40"
      style={{ position: 'fixed', right: '20px', bottom: 'calc(73.2px + 16px + env(safe-area-inset-bottom))' }}
    >
      <FontAwesomeIcon icon={icon} className="text-[22px]" />
    </button>
  )
}

export default FloatingButton