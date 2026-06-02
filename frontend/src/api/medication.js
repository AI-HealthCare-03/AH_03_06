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

// ── 변환 유틸 ───────────────────────────────────────────────

/**
 * dosage_message (예: "아침 식후", "점심 식전", "저녁 식후") 에서
 * 시간대(아침/점심/저녁)와 타이밍(식전/식후)을 추출
 */
function parseDosageMessage(msg = '') {
  const safeMsg  = msg ?? '';
  const mealTime = ['아침', '점심', '저녁'].find(t => safeMsg.includes(t)) ?? '기타';
  const timing   = safeMsg.includes('식전') ? '식전' : safeMsg.includes('식후') ? '식후' : '';
  return { mealTime, timing };
}

/**
 * "07:18:12.694Z" 또는 "07:18:12" → "07:18"
 */
function formatTime(timeStr = '') {
  return timeStr.slice(0, 5);
}

/**
 * intake_time 기준으로 시간대 아이콘 결정
 * 06~11시 → 아침(sun), 11~17시 → 점심(clock), 17~이후 → 저녁(moon)
 */
function timeToIcon(timeStr = '') {
  const hour = parseInt(timeStr.slice(0, 2), 10);
  if (hour < 11) return 'sun';
  if (hour < 17) return 'clock';
  return 'moon';
}

// ── 응답 변환 함수 ──────────────────────────────────────────

/**
 * GET /prescriptions 응답 → MedicationList가 기대하는 형태
 */
function transformPrescriptions(raw) {
  const list = (raw.prescriptions ?? []).map(p => ({
    id:          p.id,
    name:        p.drug_name,
    description: [p.dosage, p.frequency].filter(Boolean).join(' · '),
    category:    '처방약',
    status:      p.is_active ? '진행 중' : '종료',
    startDate:   p.start_date ?? null,
    endDate:     p.end_date ?? null,
    schedule: {
      isAsNeeded: false,
      slots: p.frequency
        ? [{ dosageAmount: p.dosage, dosageUnit: '', mealTime: p.frequency, timing: '', timingMinutes: null, clockTime: '' }]
        : [],
    },
  }));
  return { success: true, data: list };
}

/**
 * GET /today 또는 GET /by-date 응답 → TodayMedication / MedicationRecordPage가 기대하는 형태
 */
function transformSchedules(raw) {
  const schedules = raw.schedules ?? [];
  const date      = raw.date ?? '';

  const [, m, d] = date.split('-');
  const dateLabel = d ? `${parseInt(m)}월 ${parseInt(d)}일` : '';

  const totalCount     = schedules.length;
  const completedCount = schedules.filter(s => s.is_taken).length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const MEAL_ORDER = ['아침', '점심', '저녁', '기타'];
  const groupMap   = {};

  for (const s of schedules) {
    const { mealTime, timing } = parseDosageMessage(s.dosage_message);
    if (!groupMap[mealTime]) {
      groupMap[mealTime] = {
        mealTime,
        clockTime: formatTime(s.intake_time),
        timing,
        icon:      timeToIcon(s.intake_time),
        items:     [],
      };
    }
    groupMap[mealTime].items.push(s);
  }

  const orderedGroups = MEAL_ORDER
    .filter(mt => groupMap[mt])
    .map(mt => groupMap[mt]);

  // TodayMedication용 groups
  const groups = orderedGroups.map(g => {
    const entries = g.items.map(s => ({
      medicationId:     s.schedule_id,
      medicationName:   s.drug_name,
      dosageAmount:     s.dosage ?? '',
      dosageUnit:       '',
      categoryLabel:    '처방약',
      completionStatus: s.is_taken ? '완료' : '예정',
    }));
    const allDone  = entries.every(e => e.completionStatus === '완료');
    const noneDone = entries.every(e => e.completionStatus === '예정');
    return {
      mealTime:         g.mealTime,
      clockTime:        g.clockTime,
      timing:           g.timing,
      completionStatus: allDone ? '완료' : noneDone ? '예정' : '예정',
      entries,
    };
  });

  // MedicationRecordPage용 timeSlots
  const timeSlots = orderedGroups.map(g => ({
    id:    g.mealTime,
    label: g.mealTime,
    time:  g.clockTime,
    icon:  g.icon,
    medications: g.items.map(s => ({
      id:     s.schedule_id,
      name:   s.drug_name,
      dosage: s.dosage ?? '',
      timing: s.dosage_message ?? '',
      type:   'prescription',
      status: s.is_taken ? 'done' : 'pending',
    })),
  }));

  return {
    dateLabel,
    completedCount,
    totalCount,
    completionRate,
    groups,
    doneCount: completedCount,
    timeSlots,
  };
}

// ── 실제 API 서비스 ─────────────────────────────────────────
const RealService = {
  // ✅ 변환 적용
  getMedications: async () => {
    const raw = await apiClient.get('/prescriptions');
    const result = transformPrescriptions(raw);
    console.log('raw:', raw);        // API 응답 확인
    console.log('result:', result);  // 변환 후 확인
    return transformPrescriptions(raw);
  },
  getTodayMedication: async () => {
    const raw = await apiClient.get('/today');
    return { success: true, data: transformSchedules(raw) };
  },
  fetchMedicationsByDate: async (dateStr) => {
    const raw = await apiClient.get(`/by-date?date=${dateStr}`);
    return { success: true, data: transformSchedules(raw) };
  },

  // 기존 그대로
  getMedicationById:      (id)                     => apiClient.get(`/prescriptions/${id}`),
  addMedication:          (req)                    => apiClient.post('/prescriptions', req),
  deleteMedication:       (id)                     => apiClient.delete(`/prescriptions/${id}`),
  checkMedication:        (req)                    => apiClient.patch('/check', req),

  fetchCalendar:          (year, month)            => apiClient.get(`/calendar?year=${year}&month=${month}`),
  fetchAnalysis:          ()                       => apiClient.get('/analysis'),
  takeMedication:         (dateStr, medicationId)  => apiClient.post('/take', { date: dateStr, medicationId }),
  undoTakeMedication:     (dateStr, medicationId)  => apiClient.delete(`/take?date=${dateStr}&medicationId=${medicationId}`),

  createSchedule: async (medicationId, req) => {
    const payload = {
      drug_name:         req.name,
      intake_time:       req.mealTimes?.length
        ? (req.mealTimes.includes('아침') ? '08:00'
          : req.mealTimes.includes('점심') ? '12:00'
          : req.mealTimes.includes('저녁') ? '18:00'
          : '22:00')
        : '08:00',
      dosage_message:    req.mealTimes?.map(t =>
        `${t} ${req.timing ?? '식후'}`
      ).join(', ') ?? null,
      notification_type: 'PUSH',
      days:              req.cycleType === 'weekdays' ? req.weekDays : [],
      is_custom:         false,
    };
    const query = medicationId ? `?medication_id=${medicationId}` : '';
    return apiClient.post(`/schedules${query}`, payload);
  },

  updateSchedule:         (medicationId, req)      => apiClient.put(`/${medicationId}/schedules`, req),
  getSchedules:           (medicationId)           => apiClient.get(`/${medicationId}/schedules`),
  updateAlarm:            (alarmId, req)           => apiClient.patch(`/alarms/${alarmId}`, req),
  fetchDashboard:         (period)                 => apiClient.get(`/dashboard?period=${period}`),
  fetchScheduleHistory:   (startDate, endDate)     => apiClient.get(`/schedules?start_date=${startDate}&end_date=${endDate}`),
};

// ── 서비스 선택 ─────────────────────────────────────────────
const Service = USE_MOCK ? MockService : RealService;

// ── export ───────────────────────────────────────────────────
export const getMedications         = (filter = {}) => Service.getMedications(filter);
export const getMedicationById      = (id)          => Service.getMedicationById(id);
export const addMedication          = (req)         => Service.addMedication(req);
export const deleteMedication       = (id)          => Service.deleteMedication(id);
export const getTodayMedication     = ()            => Service.getTodayMedication();
export const checkMedication        = (req)         => Service.checkMedication(req);

export const fetchCalendar          = (year, month)           => Service.fetchCalendar(year, month);
export const fetchAnalysis          = ()                      => Service.fetchAnalysis();
export const fetchMedicationsByDate = (dateStr)               => Service.fetchMedicationsByDate(dateStr);
export const takeMedication         = (dateStr, medicationId) => Service.takeMedication(dateStr, medicationId);
export const undoTakeMedication     = (dateStr, medicationId) => Service.undoTakeMedication(dateStr, medicationId);

export const createSchedule         = (medicationId, req)    => Service.createSchedule(medicationId, req);
export const updateSchedule         = (medicationId, req)    => Service.updateSchedule(medicationId, req);
export const getSchedules           = (medicationId)         => Service.getSchedules(medicationId);

export const updateAlarm            = (alarmId, req)         => Service.updateAlarm(alarmId, req);
export const fetchDashboard         = (period)               => Service.fetchDashboard(period);
export const fetchScheduleHistory   = (startDate, endDate)   => Service.fetchScheduleHistory(startDate, endDate);

if (import.meta.env.DEV) {
  console.log(`[medication.js] 모드: ${USE_MOCK ? '🟡 Mock' : '🟢 Real API'}`);
}
