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

// 데모용 — item_seq 직접 입력으로 /preview 를 호출.
// 추후 medication_id 흐름과 통합 예정 (이때 본 함수는 제거 또는 내부 헬퍼로 흡수).
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

// previewMedicationGuide 의 stream 변종 — /preview-stream NDJSON 응답을 줄 단위 파싱.
// 응답 라인: meta(1) → token(N) → done(1). 각 라인은 단일 JSON + '\n'.
// onMeta 는 토큰 도착 전 한 번 (safety_block 등 즉시 표시 가능),
// onToken 은 청크마다, onDone 은 종료 시. fetch 자체 실패만 throw.
export async function previewMedicationGuideStream(
  {
    item_seq,
    drug_name = '',
    user_query = null,
    patient = null,
    safety = null,
    top_k = 3,
  },
  { onMeta, onToken, onDone } = {},
) {
  const res = await fetch(`${base()}/medication_guides/preview-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item_seq, drug_name, user_query, patient, safety, top_k }),
  })
  if (!res.ok) throw new Error(await res.text())

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let nl
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim()
      buf = buf.slice(nl + 1)
      if (!line) continue
      let evt
      try { evt = JSON.parse(line) } catch { continue }
      if (evt.type === 'meta') onMeta?.(evt)
      else if (evt.type === 'token') onToken?.(evt.text)
      else if (evt.type === 'done') onDone?.()
    }
  }
}


// 데모용 — drug_info_rag + drug_detail_rag 메타데이터 union을 dedupe해
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
