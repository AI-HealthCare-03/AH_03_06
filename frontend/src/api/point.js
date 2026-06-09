// src/api/point.js
import { apiFetch } from '../utils/api.js'

// GET /point/balance → { balance }
export async function getPointBalance() {
  return apiFetch('/point/balance')
}

// GET /point/history → { balance, history: [{ event_type, amount, balance_snapshot, description, created_at }] }
export async function getPointHistory() {
  return apiFetch('/point/history')
}