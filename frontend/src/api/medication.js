// src/api/medication.js
import { getAccessToken as getToken } from '../utils/token';
import * as MockService from '../utils/mockMedicationService';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// ── 실제 API 클라이언트 ─────────────────────────────────────
const BASE = `${import.meta.env.VITE_API_BASE_URL ?? '/api/v1'}/medications`;

const apiClient = {
  _req: async (method, path, body) => {
    const token = getToken();
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    if (!res.ok) throw new Error(`API ${method} ${path} failed: ${res.status}`);
    return res.json();
  },
  get:    (path)        => apiClient._req('GET',    path),
  post:   (path, body)  => apiClient._req('POST',   path, body),
  put:    (path, body)  => apiClient._req('PUT',    path, body),
  patch:  (path, body)  => apiClient._req('PATCH',  path, body),
  delete: (path)        => apiClient._req('DELETE', path),
};

// ── 실제 API 서비스 ─────────────────────────────────────────
const RealService = {
  getMedications:        ()                        => apiClient.get('/prescriptions'),
  getMedicationById:     (id)                      => apiClient.get(`/prescriptions/${id}`),
  addMedication:         (req)                     => apiClient.post('/prescriptions', req),
  deleteMedication:      (id)                      => apiClient.delete(`/prescriptions/${id}`),
  getTodayMedication:    ()                        => apiClient.get('/today'),
  checkMedication:       (req)                     => apiClient.patch('/check', req),

  fetchCalendar:         (year, month)             => apiClient.get(`/calendar?year=${year}&month=${month}`),
  fetchAnalysis:         ()                        => apiClient.get('/analysis'),
  fetchMedicationsByDate:(dateStr)                 => apiClient.get(`/by-date?date=${dateStr}`),
  takeMedication:        (dateStr, medicationId)   => apiClient.post('/take', { date: dateStr, medicationId }),
  undoTakeMedication:    (dateStr, medicationId)   => apiClient.delete(`/take?date=${dateStr}&medicationId=${medicationId}`),

  createSchedule:        (medicationId, req)       => apiClient.post(`/${medicationId}/schedules`, req),
  updateSchedule:        (medicationId, req)       => apiClient.put(`/${medicationId}/schedules`, req),
  getSchedules:          (medicationId)            => apiClient.get(`/${medicationId}/schedules`),

  // ✅ 신규 추가
  updateAlarm:           (alarmId, req)            => apiClient.patch(`/alarms/${alarmId}`, req),
  fetchDashboard:        (period)                  => apiClient.get(`/dashboard?period=${period}`),
  fetchScheduleHistory:  (startDate, endDate)      => apiClient.get(`/schedules?start_date=${startDate}&end_date=${endDate}`),
};

// ── 서비스 선택 ─────────────────────────────────────────────
const Service = USE_MOCK ? MockService : RealService;

// ── 기존 함수 (유지) ─────────────────────────────────────────
export const getMedications        = (filter = {}) => Service.getMedications(filter);
export const getMedicationById     = (id)          => Service.getMedicationById(id);
export const addMedication         = (req)          => Service.addMedication(req);
export const deleteMedication      = (id)           => Service.deleteMedication(id);
export const getTodayMedication    = ()             => Service.getTodayMedication();
export const checkMedication       = (req)          => Service.checkMedication(req);

export const fetchCalendar         = (year, month)           => Service.fetchCalendar(year, month);
export const fetchAnalysis         = ()                       => Service.fetchAnalysis();
export const fetchMedicationsByDate= (dateStr)                => Service.fetchMedicationsByDate(dateStr);
export const takeMedication        = (dateStr, medicationId) => Service.takeMedication(dateStr, medicationId);
export const undoTakeMedication    = (dateStr, medicationId) => Service.undoTakeMedication(dateStr, medicationId);

export const createSchedule        = (medicationId, req)     => Service.createSchedule(medicationId, req);
export const updateSchedule        = (medicationId, req)     => Service.updateSchedule(medicationId, req);
export const getSchedules          = (medicationId)          => Service.getSchedules(medicationId);

// ✅ 신규 export
export const updateAlarm           = (alarmId, req)          => Service.updateAlarm(alarmId, req);
export const fetchDashboard        = (period)                => Service.fetchDashboard(period);
export const fetchScheduleHistory  = (startDate, endDate)    => Service.fetchScheduleHistory(startDate, endDate);

if (import.meta.env.DEV) {
  console.log(`[medication.js] 모드: ${USE_MOCK ? '🟡 Mock' : '🟢 Real API'}`);
}