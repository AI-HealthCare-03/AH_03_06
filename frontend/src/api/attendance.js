// 출석체크 API 모듈 — /api/v1/attendance
import { apiFetch } from '../utils/api.js'

// POST /attendance/check-in → { checked_at, current_streak, max_streak, message }
export async function checkInAttendance() {
  return apiFetch('/attendance/check-in', { method: 'POST' })
}

// GET /attendance/status → { today_checked, current_streak, max_streak, last_checked_at }
export async function getAttendanceStatus() {
  return apiFetch('/attendance/status')
}

// GET /attendance/calendar?year&month → { year, month, checked_dates: [date], total_count }
export async function getAttendanceCalendar(year, month) {
  return apiFetch(`/attendance/calendar?year=${year}&month=${month}`)
}