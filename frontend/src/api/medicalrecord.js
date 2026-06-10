// src/api/medicalrecord.js
import { apiFetch } from '../utils/api.js'

// POST /api/v1/medical-records
export async function createMedicalRecord(payload) {
  return apiFetch('/medical-records', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// GET /api/v1/medical-records
export async function listMedicalRecords(params = {}) {
  const q = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
  ).toString()
  return apiFetch(`/medical-records${q ? `?${q}` : ''}`)
}

// GET /api/v1/medical-records/{id}
export async function getMedicalRecord(id) {
  return apiFetch(`/medical-records/${id}`)
}

// PUT /api/v1/medical-records/{id}
export async function updateMedicalRecord(id, payload) {
  return apiFetch(`/medical-records/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

// DELETE /api/v1/medical-records/{id}
export async function deleteMedicalRecord(id) {
  return apiFetch(`/medical-records/${id}`, {
    method: 'DELETE',
  })
}