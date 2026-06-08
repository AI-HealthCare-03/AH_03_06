// src/api/medication.js
import { getAccessToken as getToken } from '../utils/token';

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
// ── 응답 변환 (실제 API → 프론트 기대 모양) ──────────────────
const ok = (data) => ({ success: true, data });

// 식사 기준(식전/식후/식간) + 오프셋(분) → "식후 30분". '상관없음'·미지정은 빈 값.
const fmtMealTiming = (basis, offMin) => {
  if (!basis || basis === '상관없음') return '';
  if (!offMin) return basis;
  const off = offMin >= 60 ? `${offMin / 60}시간` : `${offMin}분`;
  return `${basis} ${off}`;
};

// frequency 텍스트 → 표시용 식사기준. 백엔드 _meal_from_frequency와 어휘 동기화.
// 어휘: 식후/식전/식간/취침 전/공복 (+ 'N분' 오프셋). 상관없·관계없 또는 미매칭은 '' .
export const mealFromFrequency = (frequency) => {
  if (!frequency) return '';
  const t = String(frequency);
  if (t.includes('상관없') || t.includes('관계없')) return '';
  let basis = '';
  if (t.includes('취침')) basis = '취침 전';
  else if (t.includes('공복')) basis = '공복';
  else { const m = t.match(/식(후|전|간)/); if (m) basis = '식' + m[1]; }
  if (!basis) return '';
  const mo = t.match(/식[후전간]\s*(\d+)\s*분/);
  return fmtMealTiming(basis, mo ? parseInt(mo[1], 10) : null);
};

const toMedicationCard = (p) => ({
  id:          p.id,
  source:      p.source,
  name:        p.drug_name,
  status:      p.is_active ? '진행 중' : '종료',
  category:    p.source === 'custom' ? '일반의약품' : '처방약',
  description: p.dosage_text || p.frequency || p.dosage || '',
  times:       p.times || [],
  isAsNeeded:  p.is_as_needed || false,
  mealTiming:  fmtMealTiming(p.meal_basis, p.timing_offset_min),
  startDate:   p.start_date,
  endDate:     p.end_date,
});

const mealLabelOf = (hhmm) => {
  const hour = parseInt(String(hhmm).slice(0, 2), 10);
  if (hour < 11) return '아침';
  if (hour < 17) return '점심';
  return '저녁';
};

const toTodayView = (res) => {
  const schedules = res.schedules || [];
  const total     = schedules.length;
  const completed = schedules.filter((s) => s.is_taken).length;

  const groupMap = new Map();
  for (const s of schedules) {
    const clockTime = String(s.intake_time).slice(0, 5);
    if (!groupMap.has(clockTime)) {
      groupMap.set(clockTime, {
        mealTime: mealLabelOf(clockTime),
        clockTime,
        timing: '',
        entries: [],
        id:          clockTime,
        label:       mealLabelOf(clockTime),
        time:        clockTime,
        icon:        timeToIcon(clockTime),
        medications: [],
      });
    }
    groupMap.get(clockTime).entries.push({
      medicationId:     s.schedule_id,
      medicationName:   s.drug_name,
      dosageAmount:     s.dosage ?? s.dosage_message ?? '',
      dosageUnit:       '',
      categoryLabel:    s.is_custom ? '일반의약품' : '처방약',
      mealTiming:       fmtMealTiming(s.meal_basis, s.timing_offset_min),
      completionStatus: s.is_taken ? '완료' : '예정',
    });
    groupMap.get(clockTime).medications.push({
      id:     s.schedule_id,
      name:   s.drug_name,
      dosage: s.dosage_message ?? '',
      timing: fmtMealTiming(s.meal_basis, s.timing_offset_min),   // 식사기준(저장값/폴백)
      type:   s.is_custom ? 'custom' : 'prescription',
      status: s.is_taken ? 'done' : 'pending',
    });
  }

  const [y, m, d] = String(res.date).split('-');

  const groups = [...groupMap.values()].map((g) => ({
    ...g,
    completionStatus: g.entries.every((e) => e.completionStatus === '완료') ? '완료' : '예정',
  }));

  const timeSlots = [...groupMap.values()].map((g) => ({
    id:          g.id,
    label:       g.label,
    time:        g.time,
    icon:        g.icon,
    medications: g.medications,
  }));

  return {
    dateLabel:      `${y}년 ${Number(m)}월 ${Number(d)}일`,
    totalCount:     total,
    completedCount: completed,
    doneCount:      completed,
    completionRate: total ? Math.round((completed / total) * 100) : 0,
    groups,
    timeSlots,
  };
};

// ── 실제 API 서비스 ─────────────────────────────────────────
const RealService = {
  // ✅ 변환 적용
  getMedications:         async (filter)           => ok((await apiClient.get('/list')).medications.map(toMedicationCard)),
  addDirectMedication:    (req)                    => apiClient.post('/schedules', req),

  getTodayMedication:     async ()                 => ok(toTodayView(await apiClient.get('/today'))),

  fetchMedicationsByDate: async (dateStr) => {
    const raw = await apiClient.get(`/by-date?date=${dateStr}`);
    return ok(toTodayView(raw));
  },

  // 기존 그대로
  getMedicationById:      (id, source)             => apiClient.get(`/${id}?source=${source ?? 'prescription'}`),
  updateMedication:       (id, source, req)        => apiClient.put(`/${id}?source=${source ?? 'prescription'}`, req),
  addMedication:          (req)                    => apiClient.post('/prescriptions', req),
  deleteMedication:       (id)                     => apiClient.delete(`/prescriptions/${id}`),
  deleteSchedule:         (id)                     => apiClient.delete(`/schedules/${id}`),
  checkMedication:        (req)                    => apiClient.patch('/check', req),

  fetchCalendar:          (year, month)            => apiClient.get(`/calendar?year=${year}&month=${month}`),
  fetchAnalysis:          ()                       => apiClient.get('/analysis'),
  takeMedication: (dateStr, medicationId) => apiClient.patch('/check', {
    medicationId,
    takenAt: new Date().toISOString(),
    isChecked: true,
  }),
  undoTakeMedication: (dateStr, medicationId) => apiClient.patch('/check', {
    medicationId,
    takenAt: new Date().toISOString(),
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

const Service = RealService;

// ── export ───────────────────────────────────────────────────
export const getMedications         = (filter = {}) => Service.getMedications(filter);
export const getMedicationById      = (id, source) => Service.getMedicationById(id, source);
export const updateMedication       = (id, source, req) => Service.updateMedication(id, source, req);
export const addDirectMedication    = (req)         => (Service.addDirectMedication ?? Service.addMedication)(req);
export const deleteMedication       = (id)          => Service.deleteMedication(id);
export const deleteSchedule = (id) => Service.deleteSchedule(id)
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
