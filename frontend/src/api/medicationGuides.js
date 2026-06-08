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

// /preview — item_seq 직접(진료기록 약 탭 진입). 구조화 가이드 payload 반환(블로킹).
export async function previewMedicationGuide({
  item_seq,
  drug_name = '',
  user_query = null,
  patient = null,
  safety = null,
  top_k = 3,
}) {
  const res = await fetch(`${base()}/medication_guides/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item_seq, drug_name, user_query, patient, safety, top_k }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// drug_info_rag + drug_detail_rag 메타데이터 union을 dedupe해
// [{item_seq, drug_name}] 반환. q 가 비어있으면 처음 limit 개.
// AbortController 지원 — 빠른 타이핑 시 직전 요청 abort 로 race condition 차단.
export async function fetchDrugSuggest({ q = '', limit = 20 } = {}, signal) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  params.set('limit', String(limit))
  const res = await fetch(
    `${base()}/medication_guides/drug-suggest?${params.toString()}`,
    signal ? { signal } : undefined,
  )
  if (!res.ok) throw new Error(await res.text())
  return res.json()  // { drugs: [{item_seq, drug_name}], total: number }
}
