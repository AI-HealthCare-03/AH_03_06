import { NavLink } from 'react-router-dom'

const linkClass = ({ isActive }) =>
  isActive ? 'app-nav__link app-nav__link--active' : 'app-nav__link'

export default function Navbar() {
  return (
    <nav className="app-nav" aria-label="주 메뉴">
      <NavLink to="/" end className={linkClass}>
        대시보드
      </NavLink>
      <NavLink to="/auth" className={linkClass}>
        인증
      </NavLink>
      <NavLink to="/health-checkup" className={linkClass}>
        건강검진
      </NavLink>
      <NavLink to="/medication" className={linkClass}>
        복약
      </NavLink>
      <NavLink to="/medical-record" className={linkClass}>
        의무기록
      </NavLink>
      <NavLink to="/guide" className={linkClass}>
        가이드
      </NavLink>
      <NavLink to="/user" className={linkClass}>
        사용자
      </NavLink>
    </nav>
  )
}
