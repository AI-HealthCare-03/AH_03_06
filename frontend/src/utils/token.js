const ACCESS_KEY = 'access_token'
const REFRESH_KEY = 'refresh_token'

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY)
}

export function setAccessToken(token) {
  if (token == null) localStorage.removeItem(ACCESS_KEY)
  else localStorage.setItem(ACCESS_KEY, token)
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY)
}

export function setRefreshToken(token) {
  if (token == null) localStorage.removeItem(REFRESH_KEY)
  else localStorage.setItem(REFRESH_KEY, token)
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}
