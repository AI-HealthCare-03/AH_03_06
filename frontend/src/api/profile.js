// 프로필 선택 시스템 API — /api/v1/profile
import { getAccessToken } from '../utils/token.js'

const base = () => import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

function authHeaders() {
  const t = getAccessToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

// 백엔드 origin (예: http://localhost:8000) — 정적 이미지 절대경로용
const apiOrigin = (import.meta.env.VITE_API_BASE_URL ?? '/api/v1').replace(/\/api\/v1\/?$/, '')

// image_url 보정: API는 '/static/avatars/..' 상대경로로 주므로 origin만 부여.
// (백엔드가 /static 마운트로 서빙 — 더는 /static 제거 안 함)
export const resolveProfileImage = (url) => {
  if (!url) return ''
  if (/^https?:\/\//.test(url)) return url
  return `${apiOrigin}${url}`
}

// GET /profile/items → { items: [{ id, name, image_url, required_point, is_default, is_unlocked, is_selected }] }
export async function getProfileItems() {
  const res = await fetch(`${base()}/profile/items`, { headers: { ...authHeaders() } })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// POST /profile/unlock { profile_item_id } → { profile_item_id, image_url, message } (포인트 차감, 부족 시 insufficient_point)
export async function unlockProfileItem(profileItemId) {
  const res = await fetch(`${base()}/profile/unlock`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile_item_id: profileItemId }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// PUT /profile/select { profile_item_id } → { profile_item_id, image_url, message } (해금된 것만)
export async function selectProfileItem(profileItemId) {
  const res = await fetch(`${base()}/profile/select`, {
    method: 'PUT',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile_item_id: profileItemId }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
