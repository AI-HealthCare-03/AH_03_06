import { clearTokens, setAccessToken, setRefreshToken } from '../utils/token.js'

const base = () => import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

async function parseJson(res) {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function login(payload) {
  const res = await fetch(`${base()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await parseJson(res)
  if (!res.ok) throw new Error(data?.detail ?? data?.message ?? res.statusText)
  if (data?.access_token) setAccessToken(data.access_token)
  if (data?.refresh_token) setRefreshToken(data.refresh_token)
  return data
}

export async function logout() {
  try {
    await fetch(`${base()}/auth/logout`, { method: 'POST', credentials: 'include' })
  } finally {
    clearTokens()
  }
}
