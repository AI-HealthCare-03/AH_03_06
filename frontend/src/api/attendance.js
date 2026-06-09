// 출석체크 API 모듈 — /api/v1/attendance
import { getAccessToken } from '../utils/token.js'

const base = () => import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

function authHeaders() {
  const t = getAccessToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

// POST /attendance/check-in → { checked_at, current_streak, max_streak, message }
export async function checkInAttendance() {
  const res = await fetch(`${base()}/attendance/check-in`, {
    method: 'POST',
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// GET /attendance/status → { today_checked, current_streak, max_streak, last_checked_at }
export async function getAttendanceStatus() {
  const res = await fetch(`${base()}/attendance/status`, {
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// GET /attendance/calendar?year&month → { year, month, checked_dates: [date], total_count }
export async function getAttendanceCalendar(year, month) {
  const res = await fetch(`${base()}/attendance/calendar?year=${year}&month=${month}`, {
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
