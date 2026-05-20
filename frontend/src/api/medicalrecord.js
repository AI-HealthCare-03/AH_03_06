import { getAccessToken } from '../utils/token.js'

const base = () => import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

async function parseJson(res) {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function authHeaders() {
  const t = getAccessToken()
  return t
    ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

// ── 진료기록 등록 ─────────────────────────────────────────
// POST /api/v1/medical-records
// payload: { visit_date, diagnosis_name, hospital_name?, department_id?, prescriptions? }
export async function createMedicalRecord(payload) {
  const res = await fetch(`${base()}/medical-records`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  })
  const data = await parseJson(res)
  if (!res.ok) throw new Error(data?.detail ?? data?.message ?? res.statusText)
  return data
}

// ── 진료기록 목록 조회 ────────────────────────────────────
// GET /api/v1/medical-records
// params: { sort?, department_id?, start_date?, end_date?, keyword? }
export async function listMedicalRecords(params = {}) {
  const q = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
  ).toString()
  const res = await fetch(`${base()}/medical-records${q ? `?${q}` : ''}`, {
    headers: authHeaders(),
  })
  const data = await parseJson(res)
  if (!res.ok) throw new Error(data?.detail ?? data?.message ?? res.statusText)
  return data
}

// ── 진료기록 상세 조회 ────────────────────────────────────
// GET /api/v1/medical-records/{id}
// 응답에 prescriptions, medication_guide, lifestyle_guide 포함
export async function getMedicalRecord(id) {
  const res = await fetch(`${base()}/medical-records/${id}`, {
    headers: authHeaders(),
  })
  const data = await parseJson(res)
  if (!res.ok) throw new Error(data?.detail ?? data?.message ?? res.statusText)
  return data
}

// ── 진료기록 수정 ─────────────────────────────────────────
// PUT /api/v1/medical-records/{id}
// payload: { visit_date?, diagnosis_name?, hospital_name?, department_id?, prescriptions? }
// prescriptions 안의 처방약: id 있으면 수정, id 없으면 신규 추가, 목록에 없으면 삭제
export async function updateMedicalRecord(id, payload) {
  const res = await fetch(`${base()}/medical-records/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  })
  const data = await parseJson(res)
  if (!res.ok) throw new Error(data?.detail ?? data?.message ?? res.statusText)
  return data
}

// ── 진료기록 삭제 ─────────────────────────────────────────
// DELETE /api/v1/medical-records/{id}
export async function deleteMedicalRecord(id) {
  const res = await fetch(`${base()}/medical-records/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  const data = await parseJson(res)
  if (!res.ok) throw new Error(data?.detail ?? data?.message ?? res.statusText)
  return data
}
