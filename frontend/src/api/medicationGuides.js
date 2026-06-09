// src/api/medicationGuides.js
import { apiFetch } from '../utils/api.js'

export async function getMedicationGuide(guideId) {
  return apiFetch(`/medication_guides/${guideId}`)
}

export async function listMedicationGuides() {
  return apiFetch('/medication_guides')
}

export async function generateMedicationGuide(medicationId, refresh = false) {
  return apiFetch('/medication_guides/generate', {
    method: 'POST',
    body: JSON.stringify({ medication_id: medicationId, refresh }),
  })
}

export async function deleteMedicationGuide(guideId) {
  return apiFetch(`/medication_guides/${guideId}`, {
    method: 'DELETE',
  })
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
  return apiFetch('/medication_guides/preview', {
    method: 'POST',
    body: JSON.stringify({ item_seq, drug_name, user_query, patient, safety, top_k }),
  })
}

// drug_info_rag + drug_detail_rag 메타데이터 union을 dedupe해
// [{item_seq, drug_name}] 반환. q 가 비어있으면 처음 limit 개.
// AbortController 지원 — 빠른 타이핑 시 직전 요청 abort 로 race condition 차단.
export async function fetchDrugSuggest({ q = '', limit = 20 } = {}, signal) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  params.set('limit', String(limit))
  return apiFetch(`/medication_guides/drug-suggest?${params.toString()}`, {
    signal,
  })
}