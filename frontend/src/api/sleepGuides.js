// src/api/sleepGuides.js
import { apiFetch } from '../utils/api.js'

export async function generateSleepGuide(payload) {
  return apiFetch('/sleep_guides/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getSleepGuide(guideId) {
  return apiFetch(`/sleep_guides/${guideId}`)
}

export async function listSleepGuides() {
  return apiFetch('/sleep_guides')
}

export async function deleteSleepGuide(guideId) {
  return apiFetch(`/sleep_guides/${guideId}`, {
    method: 'DELETE',
  })
}

export async function fetchCaffeineTypes() {
  return apiFetch('/sleep_guides/caffeine-types')
}