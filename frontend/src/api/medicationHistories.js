import { getAccessToken } from '../utils/token.js'

const base = () => import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

function authHeaders() {
  const t = getAccessToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

export async function exportMedicationHistory(startDate, endDate) {
  const res = await fetch(
    `${base()}/medication-histories/export?start_date=${startDate}&end_date=${endDate}`,
    { headers: { ...authHeaders() } },
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `다운로드 실패 (HTTP ${res.status})`)
  }
  return res.blob()
}
