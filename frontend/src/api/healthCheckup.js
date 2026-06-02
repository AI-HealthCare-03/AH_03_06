import { getAccessToken } from '../utils/token.js'

const base = () => import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

function authHeaders() {
  const t = getAccessToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

export async function listHealthCheckups(params = {}) {
  const q = new URLSearchParams(params).toString()
  const res = await fetch(`${base()}/health-checkups${q ? `?${q}` : ''}`, {
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getHealthCheckup(id) {
  const res = await fetch(`${base()}/health-checkups/${id}`, {
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getHealthCheckupByYear(year) {
  const res = await fetch(`${base()}/health-checkups/year/${year}`, {
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}