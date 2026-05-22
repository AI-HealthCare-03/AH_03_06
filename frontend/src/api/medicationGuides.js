// src/api/medicationGuides.js
// 복약 가이드 API 모듈 — healthCheckup.js 패턴 그대로.
//
// 백엔드 라우트(/api/v1/medication_guides 언더스코어 주의):
//   GET    /medication_guides/{guide_id}
//   GET    /medication_guides
//   POST   /medication_guides/generate
//   DELETE /medication_guides/{guide_id}

import { getAccessToken } from '../utils/token.js'

const base = () => import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

function authHeaders() {
  const t = getAccessToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

export async function getMedicationGuide(guideId) {
  const res = await fetch(`${base()}/medication_guides/${guideId}`, {
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function listMedicationGuides() {
  const res = await fetch(`${base()}/medication_guides`, {
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function generateMedicationGuide(medicationId, refresh = false) {
  const res = await fetch(`${base()}/medication_guides/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ medication_id: medicationId, refresh }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function deleteMedicationGuide(guideId) {
  const res = await fetch(`${base()}/medication_guides/${guideId}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
