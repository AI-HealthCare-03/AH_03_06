import { getAccessToken } from '../utils/token.js'

const base = () => import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

function authHeaders() {
  const t = getAccessToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

export async function listDietGuides() {
  const res = await fetch(`${base()}/guides/diet`, {
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getDietGuide(id) {
  const res = await fetch(`${base()}/guides/diet/${id}`, {
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function generateDietGuide(checkupId) {
  const res = await fetch(`${base()}/guides/diet/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ checkup_id: checkupId }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}