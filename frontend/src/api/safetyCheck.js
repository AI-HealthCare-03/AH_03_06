// src/api/safetyCheck.js
// 복약 안전점검(DUR) — 진료기록 처방 묶음의 안전 경고 조회.
//   GET /api/v1/medical-records/{recordId}/safety-check
// 응답: { record_id, alerts:[{level,type,drugs,message,detail}], summary, skipped, disclaimer }

import { getAccessToken } from '../utils/token.js'

const base = () => import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

const authHeaders = () => {
  const t = getAccessToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

export async function fetchSafetyCheck(recordId) {
  const res = await fetch(`${base()}/medical-records/${recordId}/safety-check`, {
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw new Error(`safety-check 조회 실패 (${res.status})`)
  return res.json()
}
