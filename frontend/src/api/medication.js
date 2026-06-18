// src/api/medication.js
import { apiFetch } from '../utils/api.js'

// ── API 클라이언트 ─────────────────────────────────────────
const BASE = '/medications'

const apiClient = {
  _req: async (method, path, body) => {
    return apiFetch(`${BASE}${path}`, {
      method,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
  },
  get:    (path)       => apiClient._req('GET',    path),
  post:   (path, body) => apiClient._req('POST',   path, body),
  put:    (path, body) => apiClient._req('PUT',    path, body),
  patch:  (path, body) => apiClient._req('PATCH',  path, body),
  delete: (path)       => apiClient._req('DELETE', path),
}

// ── 변환 유틸 ───────────────────────────────────────────────

function formatTime(timeStr = '') {
  return timeStr.slice(0, 5)
}

function timeToIcon(timeStr = '') {
  const hour = parseInt(timeStr.slice(0, 2), 10)
  if (hour < 11) return 'sun'
  if (hour < 17) return 'clock'
  return 'moon'
}

export const mealFromFrequency = (frequency) => {
  if (!frequency) return ''
  const t = String(frequency)
  if (t.includes('상관없') || t.includes('관계없')) return ''
  let basis = ''
  if (t.includes('취침')) basis = '취침 전'
  else if (t.includes('공복')) basis = '공복'
  else { const m = t.match(/식(후|전|간)/); if (m) basis = '식' + m[1] }
  if (!basis) return ''
  const mo = t.match(/식[후전간]\s*(\d+)\s*분/)
  return fmtMealTiming(basis, mo ? parseInt(mo[1], 10) : null)
}

const fmtMealTiming = (basis, offMin) => {
  if (!basis || basis === '상관없음') return ''
  if (!offMin) return basis
  const off = offMin >= 60 ? `${offMin / 60}시간` : `${offMin}분`
  return `${basis} ${off}`
}

const ok = (data) => ({ success: true, data })

const toMedicationCard = (p) => ({
  id:          p.id,
  source:      p.source,
  name:        p.drug_name,
  status:      p.is_active ? '진행 중' : '종료',
  category:    p.is_custom ? '일반의약품' : '처방약',
  description: p.dosage_text || p.frequency || p.dosage || '',
  times:       p.times || [],
  isAsNeeded:  p.is_as_needed || false,
  mealTiming:  fmtMealTiming(p.meal_basis, p.timing_offset_min),
  startDate:   p.start_date,
  endDate:     p.end_date,
})

const mealLabelOf = (hhmm) => {
  const hour = parseInt(String(hhmm).slice(0, 2), 10)
  if (hour < 11) return '아침'
  if (hour < 17) return '점심'
  return '저녁'
}

const toTodayView = (res) => {
  const schedules = res.schedules || []
  const total     = schedules.length
  const completed = schedules.filter((s) => s.is_taken).length

  const groupMap = new Map()
  for (const s of schedules) {
    const clockTime = String(s.intake_time).slice(0, 5)
    if (!groupMap.has(clockTime)) {
      groupMap.set(clockTime, {
        mealTime:    mealLabelOf(clockTime),
        clockTime,
        timing:      '',
        entries:     [],
        id:          clockTime,
        label:       mealLabelOf(clockTime),
        time:        clockTime,
        icon:        timeToIcon(clockTime),
        medications: [],
      })
    }
    groupMap.get(clockTime).entries.push({
      medicationId:     s.schedule_id,
      medicationName:   s.drug_name,
      dosageAmount:     s.dosage ?? s.dosage_message ?? '',
      dosageUnit:       '',
      categoryLabel:    s.is_custom ? '일반의약품' : '처방약',
      mealTiming:       fmtMealTiming(s.meal_basis, s.timing_offset_min),
      completionStatus: s.is_taken ? '완료' : '예정',
    })
    groupMap.get(clockTime).medications.push({
      id:     s.schedule_id,
      name:   s.drug_name,
      dosage: s.dosage_message ?? '',
      timing: fmtMealTiming(s.meal_basis, s.timing_offset_min),
      type:   s.is_custom ? 'custom' : 'prescription',
      status: s.is_taken ? 'done' : 'pending',
    })
  }

  const [y, m, d] = String(res.date).split('-')

  const groups = [...groupMap.values()].map((g) => ({
    ...g,
    completionStatus: g.entries.every((e) => e.completionStatus === '완료') ? '완료' : '예정',
  }))

  const timeSlots = [...groupMap.values()].map((g) => ({
    id:          g.id,
    label:       g.label,
    time:        g.time,
    icon:        g.icon,
    medications: g.medications,
  }))

  return {
    dateLabel:      `${y}년 ${Number(m)}월 ${Number(d)}일`,
    totalCount:     total,
    completedCount: completed,
    doneCount:      completed,
    completionRate: total ? Math.round((completed / total) * 100) : 0,
    groups,
    timeSlots,
  }
}

// ── 실제 API 서비스 ─────────────────────────────────────────
const RealService = {
  getMedications:         async ()                 => ok((await apiClient.get('/list')).medications.map(toMedicationCard)),
  addDirectMedication:    (req)                    => apiClient.post('/schedules', req),
  getTodayMedication:     async ()                 => ok(toTodayView(await apiClient.get('/today'))),
  fetchMedicationsByDate: async (dateStr)          => ok(toTodayView(await apiClient.get(`/by-date?date=${dateStr}`))),
  getMedicationById:      (id, source)             => apiClient.get(`/${id}?source=${source ?? 'prescription'}`),
  updateMedication:       (id, source, req)        => apiClient.put(`/${id}?source=${source ?? 'prescription'}`, req),
  addMedication:          (req)                    => apiClient.post('/prescriptions', req),
  deleteMedication:       (id)                     => apiClient.delete(`/prescriptions/${id}`),
  deleteSchedule:         (id)                     => apiClient.delete(`/schedules/${id}`),
  discontinueMedication:  (id)                     => apiClient.patch(`/prescriptions/${id}/discontinue`),
  resumeMedication:       (id)                     => apiClient.patch(`/prescriptions/${id}/resume`),
  discontinueSchedule:    (id)                     => apiClient.patch(`/schedules/${id}/discontinue`),
  resumeSchedule:         (id)                     => apiClient.patch(`/schedules/${id}/resume`),
  checkMedication:        (req)                    => apiClient.patch('/check', req),
  fetchCalendar:          (year, month)            => apiClient.get(`/calendar?year=${year}&month=${month}`),
  fetchAnalysis:          ()                       => apiClient.get('/analysis'),
  takeMedication:         (dateStr, medicationId)  => apiClient.patch('/check', {
    medicationId,
    takenAt:   new Date().toISOString(),
    isChecked: true,
  }),
  undoTakeMedication:     (dateStr, medicationId)  => apiClient.patch('/check', {
    medicationId,
    takenAt:   new Date().toISOString(),
    isChecked: false,
  }),
  createSchedule: async (medicationId, req) => {
    const payload = {
      drug_name:         req.name,
      intake_time:       req.mealTimes?.length
        ? (req.mealTimes.includes('아침') ? '08:00'
          : req.mealTimes.includes('점심') ? '12:00'
          : req.mealTimes.includes('저녁') ? '18:00'
          : '22:00')
        : '08:00',
      dosage_message:    req.mealTimes?.map(t => `${t} ${req.timing ?? '식후'}`).join(', ') ?? null,
      notification_type: 'PUSH',
      days:              req.cycleType === 'weekdays' ? req.weekDays : [],
      is_custom:         false,
    }
    const query = medicationId ? `?medication_id=${medicationId}` : ''
    return apiClient.post(`/schedules${query}`, payload)
  },
  updateSchedule:       (medicationId, req) => apiClient.put(`/${medicationId}/schedules`, req),
  getSchedules:         (medicationId)      => apiClient.get(`/${medicationId}/schedules`),
  updateAlarm:          (alarmId, req)      => apiClient.patch(`/alarms/${alarmId}`, req),
  fetchDashboard:       (period)            => apiClient.get(`/dashboard?period=${period}`),
  fetchScheduleHistory: (startDate, endDate) => apiClient.get(`/schedules?start_date=${startDate}&end_date=${endDate}`),
}

const Service = RealService

// ── export ───────────────────────────────────────────────────
export const getMedications         = (filter = {}) => Service.getMedications(filter)
export const getMedicationById      = (id, source)  => Service.getMedicationById(id, source)
export const updateMedication       = (id, source, req) => Service.updateMedication(id, source, req)
export const addDirectMedication    = (req)         => (Service.addDirectMedication ?? Service.addMedication)(req)
export const deleteMedication       = (id)          => Service.deleteMedication(id)
export const deleteSchedule         = (id)          => Service.deleteSchedule(id)
export const discontinueMedication  = (id)          => Service.discontinueMedication(id)
export const resumeMedication       = (id)          => Service.resumeMedication(id)
export const discontinueSchedule    = (id)          => Service.discontinueSchedule(id)
export const resumeSchedule         = (id)          => Service.resumeSchedule(id)
export const getTodayMedication     = ()            => Service.getTodayMedication()
export const checkMedication        = (req)         => Service.checkMedication(req)
export const fetchCalendar          = (year, month)            => Service.fetchCalendar(year, month)
export const fetchAnalysis          = ()                       => Service.fetchAnalysis()
export const fetchMedicationsByDate = (dateStr)                => Service.fetchMedicationsByDate(dateStr)
export const takeMedication         = (dateStr, medicationId)  => Service.takeMedication(dateStr, medicationId)
export const undoTakeMedication     = (dateStr, medicationId)  => Service.undoTakeMedication(dateStr, medicationId)
export const createSchedule         = (medicationId, req)      => Service.createSchedule(medicationId, req)
export const updateSchedule         = (medicationId, req)      => Service.updateSchedule(medicationId, req)
export const getSchedules           = (medicationId)           => Service.getSchedules(medicationId)
export const updateAlarm            = (alarmId, req)           => Service.updateAlarm(alarmId, req)
export const fetchDashboard         = (period)                 => Service.fetchDashboard(period)
export const fetchScheduleHistory   = (startDate, endDate)     => Service.fetchScheduleHistory(startDate, endDate)