// src/utils/api.js
// 공통 fetch 래퍼 — 401 시 토큰 갱신 후 재시도, 재시도 실패 시 로그아웃

import { getAccessToken, getRefreshToken, setAccessToken, clearTokens } from './token.js'
import { logout } from '../App.jsx'

const base = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

async function _refresh() {
  const refreshTk = getRefreshToken()
  if (!refreshTk) return false
  try {
    const res = await fetch(`${base}/auth/token/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshTk }),
    })
    if (!res.ok) return false
    const data = await res.json()
    if (data?.access_token) {
      setAccessToken(data.access_token)
      return true
    }
    return false
  } catch {
    return false
  }
}

export async function apiFetch(path, options = {}) {
  const token = getAccessToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  let res = await fetch(`${base}${path}`, { ...options, headers })

  if (res.status === 401) {
    const refreshed = await _refresh()
    if (refreshed) {
      const newToken = getAccessToken()
      res = await fetch(`${base}${path}`, {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${newToken}` },
      })
    } else {
      clearTokens()
      logout()
      throw new Error('session_expired')
    }
  }

  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) {
    // 404(없음) 등을 호출부에서 구분할 수 있게 status·detail을 에러에 실어 둠
    const err = new Error(data?.detail ?? res.statusText)
    err.status = res.status
    err.detail = data?.detail
    throw err
  }
  return data
}