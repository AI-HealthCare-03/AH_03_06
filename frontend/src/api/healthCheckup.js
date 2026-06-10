// src/api/healthCheckup.js
import { apiFetch } from '../utils/api.js'

export async function listHealthCheckups(params = {}) {
  const q = new URLSearchParams(params).toString()
  return apiFetch(`/health-checkups${q ? `?${q}` : ''}`)
}

export async function getHealthCheckup(id) {
  return apiFetch(`/health-checkups/${id}`)
}

export async function getHealthCheckupByYear(year) {
  return apiFetch(`/health-checkups/year/${year}`)
}