// src/api/sleepGuides.js
// 수면 가이드 API 모듈 — medicationGuides.js 패턴 그대로.
//
// 백엔드 라우트 (/api/v1/sleep_guides):
//   POST   /sleep_guides/generate
//   GET    /sleep_guides/{guide_id}
//   GET    /sleep_guides
//   DELETE /sleep_guides/{guide_id}

import { getAccessToken } from '../utils/token.js'

const base = () => import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

function authHeaders() {
  const t = getAccessToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

// payload 모양 (SleepGenerateRequest):
//   weekday_bedtime/wakeup, weekend_bedtime/wakeup: "HH:MM"
//   brief_survey_q1~q5: 0~3
//   ess_q1~q8: 0~3 또는 생략(null)
//   caffeine_entries: [{ caffeine_drink_type_id, cups }]
//   disturbance_causes: string[]
export async function generateSleepGuide(payload) {
  const res = await fetch(`${base()}/sleep_guides/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()  // { detail, guide_id }
}

export async function getSleepGuide(guideId) {
  const res = await fetch(`${base()}/sleep_guides/${guideId}`, {
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function listSleepGuides() {
  const res = await fetch(`${base()}/sleep_guides`, {
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()  // { guides: [...], total }
}

export async function deleteSleepGuide(guideId) {
  const res = await fetch(`${base()}/sleep_guides/${guideId}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// 카페인 음료 마스터 (입력 폼에서 id·name 매칭용). 시드 id 가 비순차라 프론트 하드코딩 대신 조회.
export async function fetchCaffeineTypes() {
  const res = await fetch(`${base()}/sleep_guides/caffeine-types`, {
    headers: { ...authHeaders() },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()  // [{ id, name, caffeine_mg_per_cup }]
}
