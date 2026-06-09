// src/api/profile.js
import { apiFetch } from '../utils/api.js'

const apiOrigin = (import.meta.env.VITE_API_BASE_URL ?? '/api/v1').replace(/\/api\/v1\/?$/, '')

// image_url 절대경로 변환
export const resolveProfileImage = (url) => {
  if (!url) return ''
  if (/^https?:\/\//.test(url)) return url
  return `${apiOrigin}${url}`
}

// GET /profile/items
export async function getProfileItems() {
  return apiFetch('/profile/items')
}

// POST /profile/unlock
export async function unlockProfileItem(profileItemId) {
  return apiFetch('/profile/unlock', {
    method: 'POST',
    body: JSON.stringify({ profile_item_id: profileItemId }),
  })
}

// PUT /profile/select
export async function selectProfileItem(profileItemId) {
  return apiFetch('/profile/select', {
    method: 'PUT',
    body: JSON.stringify({ profile_item_id: profileItemId }),
  })
}