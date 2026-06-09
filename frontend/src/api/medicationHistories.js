// src/api/medicationHistories.js
import { apiFetch } from '../utils/api.js'

export async function exportMedicationHistory(startDate, endDate) {
  return apiFetch(
    `/medication-histories/export?start_date=${startDate}&end_date=${endDate}`
  )
}