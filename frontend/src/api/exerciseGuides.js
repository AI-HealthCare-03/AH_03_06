import { getAccessToken } from '../utils/token.js'

const base = () => import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

function authHeaders() {
  const t = getAccessToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

export async function getExerciseGuideByDate(guideDate) {
  const res = await fetch(`${base()}/guides/exercise/${guideDate}`, {
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function generateExerciseGuide(checkupId, targetDate = null) {
  const body = { checkup_id: checkupId }
  if (targetDate) body.target_date = targetDate
  const res = await fetch(`${base()}/guides/exercise/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
