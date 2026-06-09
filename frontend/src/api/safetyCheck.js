// src/api/safetyCheck.js
import { apiFetch } from '../utils/api.js'

export async function fetchSafetyCheck(recordId) {
  return apiFetch(`/medical-records/${recordId}/safety-check`)
}