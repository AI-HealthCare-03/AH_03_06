// src/api/chat.js
import { apiFetch } from '../utils/api.js'

export async function createChatSession(contextType, contextId = null) {
  return apiFetch('/chat/sessions', {
    method: 'POST',
    body: JSON.stringify({ context_type: contextType, context_id: contextId }),
  })
}

export async function sendChatMessage(sessionId, message, category = null) {
  return apiFetch(`/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ message, category }),
  })
}

export async function getChatHistory(sessionId) {
  return apiFetch(`/chat/sessions/${sessionId}/messages`)
}

export async function deleteChatMessage(sessionId, messageId) {
  return apiFetch(`/chat/sessions/${sessionId}/messages/${messageId}`, {
    method: 'DELETE',
  })
}

export async function editChatMessage(sessionId, messageId, message, category = null) {
  return apiFetch(`/chat/sessions/${sessionId}/messages/${messageId}`, {
    method: 'PUT',
    body: JSON.stringify({ message, category }),
  })
}

export async function regenerateChatMessage(sessionId, messageId, category = null) {
  return apiFetch(`/chat/sessions/${sessionId}/messages/${messageId}/regenerate`, {
    method: 'POST',
    body: JSON.stringify({ message: '', category }),
  })
}

export async function clearChatMessages(sessionId) {
  return apiFetch(`/chat/sessions/${sessionId}/messages`, {
    method: 'DELETE',
  })
}

export async function deleteChatSession(sessionId) {
  return apiFetch(`/chat/sessions/${sessionId}`, {
    method: 'DELETE',
  })
}