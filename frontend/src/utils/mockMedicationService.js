// ============================================================
// utils/mockMedicationService.js
// Mock 서비스 함수 (API 연결 전 임시 사용)
// ============================================================

import {
  MOCK_MEDICATIONS, MOCK_TODAY_MEDICATION,
  MOCK_CALENDAR, MOCK_ANALYSIS, MOCK_MEDICATIONS_BY_DATE
} from './mockMedicationData.js';

// ────────────────────────────────────────────────────────────
// 유틸
// ────────────────────────────────────────────────────────────

const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));
const ok   = (data, message) => ({ success: true, data, message });
const fail = (message, errorCode) => ({ success: false, data: null, message, errorCode });

// In-memory 상태 (런타임 동안 유지)
let _medications     = [...MOCK_MEDICATIONS];
let _todayMedication = JSON.parse(JSON.stringify(MOCK_TODAY_MEDICATION));
let medicationRecordState = structuredClone(MOCK_MEDICATIONS_BY_DATE);

// ────────────────────────────────────────────────────────────
// 복약 관리 목록
// ────────────────────────────────────────────────────────────

export async function getMedications(filter = {}) {
  await delay();
  const { status = '전체', category = '전체', keyword = '', sortBy = 'latest' } = filter;
  let result = [..._medications];

  if (status !== '전체')   result = result.filter((m) => m.status === status);
  if (category !== '전체') result = result.filter((m) => m.category === category);
  if (keyword.trim()) {
    const kw = keyword.trim().toLowerCase();
    result = result.filter(
      (m) => m.name.toLowerCase().includes(kw) || m.description.toLowerCase().includes(kw)
    );
  }
  if (sortBy === 'latest') result.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  else if (sortBy === 'name') result.sort((a, b) => a.name.localeCompare(b.name, 'ko'));

  return ok(result);
}

export async function getMedicationById(id) {
  await delay(200);
  const found = _medications.find((m) => m.id === id);
  if (!found) return fail('해당 약을 찾을 수 없습니다.', 'NOT_FOUND');
  return ok(found);
}

export async function addMedication(req) {
  await delay(600);
  const newMed = {
    id:          `med-${Date.now()}`,
    name:        req.drug_name ?? req.name ?? '',
    description: req.purpose  ?? '',
    category:    '일반의약품',
    status:      '진행 중',
    startDate:   req.start_date ?? req.startDate ?? '',
    endDate:     req.end_date   ?? req.endDate   ?? null,
    schedule: {
      isAsNeeded: false,
      slots: req.dosage ? [{
        dosageAmount:  req.dosage.replace(/[^0-9.]/g, ''),
        dosageUnit:    req.dosage.replace(/[0-9.]/g, '').trim(),
        mealTime:      '아침',
        timing:        '식후',
        timingMinutes: 30,
      }] : [],
    },
    ...req,
  };
  _medications = [newMed, ..._medications];
  return ok(newMed, '복약이 추가되었습니다.');
}

export async function deleteMedication(id) {
  await delay(400);
  const idx = _medications.findIndex((m) => m.id === id);
  if (idx === -1) return fail('해당 약을 찾을 수 없습니다.', 'NOT_FOUND');
  _medications[idx] = {
    ..._medications[idx],
    status:  '종료',
    endDate: new Date().toISOString().slice(0, 10),
  };
  return ok({ id }, '복약이 종료 처리되었습니다.');
}

// ────────────────────────────────────────────────────────────
// 오늘의 복약
// ────────────────────────────────────────────────────────────

export async function getTodayMedication() {
  await delay();
  return ok(_todayMedication);
}

export async function checkMedication(req) {
  await delay(300);
  const { medicationId, mealTime, takenAt, isChecked } = req;

  const group = _todayMedication.groups.find((g) => g.mealTime === mealTime);
  if (!group) return fail('해당 시간대를 찾을 수 없습니다.', 'NOT_FOUND');

  const entry = group.entries.find((e) => e.medicationId === medicationId);
  if (!entry) return fail('해당 복약 항목을 찾을 수 없습니다.', 'NOT_FOUND');

  entry.completionStatus = isChecked ? '완료' : '예정';
  entry.takenAt = isChecked ? takenAt : undefined;

  const allDone = group.entries.every((e) => e.completionStatus === '완료');
  group.completionStatus = allDone ? '완료' : '예정';

  const allEntries     = _todayMedication.groups.flatMap((g) => g.entries);
  const completedCount = allEntries.filter((e) => e.completionStatus === '완료').length;

  _todayMedication = {
    ..._todayMedication,
    completedCount,
    completionRate: Math.round((completedCount / _todayMedication.totalCount) * 100),
  };

  return ok(_todayMedication, isChecked ? '복약 완료로 기록되었습니다.' : '복약 체크가 해제되었습니다.');
}

// ────────────────────────────────────────────────────────────
// 개발 편의 유틸
// ────────────────────────────────────────────────────────────

export function __resetMockData() {
  _medications     = [...MOCK_MEDICATIONS];
  _todayMedication = JSON.parse(JSON.stringify(MOCK_TODAY_MEDICATION));
}

// ────────────────────────────────────────────────────────────
// 복약 기록 (달력)
// ────────────────────────────────────────────────────────────

export const fetchCalendar = (year, month) =>
  new Promise((resolve) => setTimeout(() => resolve(ok(MOCK_CALENDAR)), 300));

export const fetchAnalysis = () =>
  new Promise((resolve) => setTimeout(() => resolve(ok(MOCK_ANALYSIS)), 300));

export const fetchMedicationsByDate = (dateStr) =>
  new Promise((resolve) => {
    const data = medicationRecordState[dateStr] ?? null;
    setTimeout(() => resolve(data ? ok(data) : fail('해당 날짜의 복약 데이터가 없습니다.')), 300);
  });

export const takeMedication = (dateStr, medicationId) =>
  new Promise((resolve) => {
    const dayData = medicationRecordState[dateStr];
    if (!dayData) return setTimeout(() => resolve(fail('날짜 데이터 없음')), 300);

    let updatedMed = null;
    dayData.timeSlots = dayData.timeSlots.map((slot) => ({
      ...slot,
      medications: slot.medications.map((med) => {
        if (med.id === medicationId) {
          updatedMed = { ...med, status: 'done' };
          return updatedMed;
        }
        return med;
      }),
    }));
    dayData.doneCount = dayData.timeSlots
      .flatMap((s) => s.medications)
      .filter((m) => m.status === 'done').length;

    setTimeout(() => resolve(ok({ updatedMedication: updatedMed })), 300);
  });

export const undoTakeMedication = (dateStr, medicationId) =>
  new Promise((resolve) => {
    const dayData = medicationRecordState[dateStr];
    if (!dayData) return setTimeout(() => resolve(fail('날짜 데이터 없음')), 300);

    dayData.timeSlots = dayData.timeSlots.map((slot) => ({
      ...slot,
      medications: slot.medications.map((med) =>
        med.id === medicationId ? { ...med, status: 'pending' } : med
      ),
    }));
    dayData.doneCount = dayData.timeSlots
      .flatMap((s) => s.medications)
      .filter((m) => m.status === 'done').length;

    setTimeout(() => resolve(ok(null)), 300);
  });

export const createSchedule = (medicationId, req) =>
  new Promise((resolve) =>
    setTimeout(() => resolve(ok({ id: Date.now(), medication_id: medicationId, ...req })), 300)
  );

export const updateSchedule = (medicationId, req) =>
  new Promise((resolve) =>
    setTimeout(() => resolve(ok({ id: medicationId, ...req })), 300)
  );

export const getSchedules = (medicationId) =>
  new Promise((resolve) => {
    const med = _medications.find((m) => m.id === medicationId || m.id === String(medicationId));
    if (!med) return setTimeout(() => resolve(fail('해당 약을 찾을 수 없습니다.', 'NOT_FOUND')), 300);

    const schedules = med.schedule?.slots?.map((slot, i) => ({
      id:                i + 1,
      medication_id:     medicationId,
      intake_time:       '08:00',
      dosage_message:    `${slot.dosageAmount}${slot.dosageUnit}`,
      notification_type: 'PUSH',
      is_active:         true,
      days:              ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
    })) ?? [];

    setTimeout(() => resolve(ok({ schedules })), 300);
  });

// ────────────────────────────────────────────────────────────
// 신규 API Mock
// ────────────────────────────────────────────────────────────

export const updateAlarm = (alarmId, req) => {
  console.log('[Mock] updateAlarm', alarmId, req);
  return new Promise((resolve) =>
    setTimeout(() =>
      resolve({
        ok: true,
        data: {
          id:          alarmId,
          enabled:     req.enabled,
          alarm_time:  req.alarm_time,
          updated_at:  new Date().toISOString(),
        },
      }),
    300)
  );
};

export const fetchDashboard = (period) => {
  console.log('[Mock] fetchDashboard', period);
  const isWeekly = period === 'weekly';
  return new Promise((resolve) =>
    setTimeout(() =>
      resolve({
        ok: true,
        data: {
          period,
          overall_rate: 78,
          daily_rates: isWeekly
            ? [
                { date: '2026-05-22', rate: 100, taken: 3, total: 3 },
                { date: '2026-05-23', rate: 67,  taken: 2, total: 3 },
                { date: '2026-05-24', rate: 100, taken: 3, total: 3 },
                { date: '2026-05-25', rate: 33,  taken: 1, total: 3 },
                { date: '2026-05-26', rate: 100, taken: 3, total: 3 },
                { date: '2026-05-27', rate: 67,  taken: 2, total: 3 },
                { date: '2026-05-28', rate: 100, taken: 3, total: 3 },
              ]
            : Array.from({ length: 30 }, (_, i) => {
                const d = new Date('2026-05-01');
                d.setDate(d.getDate() + i);
                const rate = Math.floor(Math.random() * 60) + 40;
                return {
                  date:  d.toISOString().slice(0, 10),
                  rate,
                  taken: Math.round((rate / 100) * 3),
                  total: 3,
                };
              }),
          medication_rates: [
            { id: 'med-001', name: '아스피린 100mg', rate: 92, taken: 23, total: 25 },
            { id: 'med-002', name: '오메가3',        rate: 68, taken: 17, total: 25 },
            { id: 'med-003', name: '비타민D 1000IU', rate: 72, taken: 18, total: 25 },
          ],
        },
      }),
    400)
  );
};

export const fetchScheduleHistory = (startDate, endDate) => {
  console.log('[Mock] fetchScheduleHistory', startDate, endDate);
  const names    = ['아스피린 100mg', '오메가3', '비타민D 1000IU'];
  const slots    = ['아침 식후', '점심 식후', '저녁 식후'];
  const statuses = ['taken', 'taken', 'taken', 'missed', 'pending'];

  const days = [];
  const cur  = new Date(startDate);
  const end  = new Date(endDate);
  while (cur <= end) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }

  const records = days.flatMap((date) =>
    names.map((name, idx) => ({
      id:              `hist-${date}-${idx}`,
      date,
      medication_name: name,
      slot:            slots[idx % slots.length],
      status:          statuses[Math.floor(Math.random() * statuses.length)],
      taken_at:
        statuses[Math.floor(Math.random() * statuses.length)] === 'taken'
          ? `${date}T0${8 + idx * 4}:12:00`
          : null,
    }))
  );

  return new Promise((resolve) =>
    setTimeout(() =>
      resolve({
        ok: true,
        data: { start_date: startDate, end_date: endDate, records },
      }),
    350)
  );
};