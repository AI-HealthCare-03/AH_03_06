// 포인트 API 모듈 — /api/v1/point
import { getAccessToken } from '../utils/token.js'

const base = () => import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

function authHeaders() {
  const t = getAccessToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

// GET /point/balance → { balance }
export async function getPointBalance() {
  const res = await fetch(`${base()}/point/balance`, {
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// GET /point/history → { balance, history: [{ event_type, amount, balance_snapshot, description, created_at }] }
export async function getPointHistory() {
  const res = await fetch(`${base()}/point/history`, {
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
