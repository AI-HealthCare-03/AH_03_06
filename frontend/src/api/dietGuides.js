// src/api/dietGuides.js
import { apiFetch } from '../utils/api.js'

export async function listDietGuideDates() {
  return apiFetch('/guides/diet')
}

export async function getDietGuideByDate(guideDate) {
  return apiFetch(`/guides/diet/${guideDate}`)
}

export async function generateDietGuide(checkupId, targetDate = null) {
  const body = { checkup_id: checkupId }
  if (targetDate) body.target_date = targetDate
  return apiFetch('/guides/diet/generate', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function regenerateDietGuide(checkupId, targetDate = null) {
  const body = { checkup_id: checkupId }
  if (targetDate) body.target_date = targetDate
  return apiFetch('/guides/diet/regenerate', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function generateDietGuideCourse(checkupId, days = 7) {
  return apiFetch('/guides/diet/generate-course', {
    method: 'POST',
    body: JSON.stringify({ checkup_id: checkupId, days }),
  })
}

export async function deleteDietGuide(guideDate) {
  return apiFetch(`/guides/diet/${guideDate}`, {
    method: 'DELETE',
  })
}