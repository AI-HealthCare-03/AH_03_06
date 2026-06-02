import { getAccessToken } from '../utils/token.js'

const base = () => import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

function authHeaders() {
  const t = getAccessToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

export async function listDietGuideDates() {
  const res = await fetch(`${base()}/guides/diet`, {
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getDietGuideByDate(guideDate) {
  const res = await fetch(`${base()}/guides/diet/${guideDate}`, {
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function generateDietGuide(checkupId, targetDate = null) {
  const body = { checkup_id: checkupId }
  if (targetDate) body.target_date = targetDate
  const res = await fetch(`${base()}/guides/diet/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function regenerateDietGuide(checkupId, targetDate = null) {
  const body = { checkup_id: checkupId }
  if (targetDate) body.target_date = targetDate
  const res = await fetch(`${base()}/guides/diet/regenerate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function generateDietGuideCourse(checkupId, days = 7) {
  const res = await fetch(`${base()}/guides/diet/generate-course`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ checkup_id: checkupId, days }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}