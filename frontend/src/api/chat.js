import { getAccessToken } from '../utils/token.js'

const base = () => import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

function authHeaders() {
  const t = getAccessToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

export async function createChatSession(contextType, contextId = null) {
  const res = await fetch(`${base()}/chat/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ context_type: contextType, context_id: contextId }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function sendChatMessage(sessionId, message, category = null) {
  const res = await fetch(`${base()}/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ message, category }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getChatHistory(sessionId) {
  const res = await fetch(`${base()}/chat/sessions/${sessionId}/messages`, {
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}