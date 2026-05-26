import { useNavigate, useLocation } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faHouse,        // 홈
  faPills,        // 복약관리
  faBookOpen,     // 가이드
  faBars,         // 전체
  faUser,         // 마이
} from '@fortawesome/free-solid-svg-icons'

const tabs = [
  { label: '홈',    path: '/home',       icon: faHouse },
  { label: '복약관리', path: '/medication', icon: faPills },
  { label: '가이드', path: '/guide',      icon: faBookOpen },
  { label: '전체',  path: '/all',        icon: faBars },
  { label: '마이',  path: '/user',       icon: faUser },
]

function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav id="bottom-nav" className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full md:max-w-[480px] bg-white border-t border-[#E4E4E7] z-50">
      <div className="flex justify-around py-2">
        {tabs.map(({ label, path, icon }) => {
          const active = location.pathname === path
          return (
            <button
              key={label}
              onClick={() => navigate(path)}
              className="flex flex-col items-center gap-1 px-4 py-1"
            >
              <FontAwesomeIcon
                icon={icon}
                className={`text-[22px] ${active ? 'text-[#2563EB]' : 'text-[#A1A1AA]'}`}
              />
              <span className={`text-[10px] ${active ? 'font-bold text-primary' : 'font-medium text-[#A1A1AA]'}`}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default BottomNav