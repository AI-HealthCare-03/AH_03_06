// ============================================================
// utils/mockMedicationService.js
// Mock 서비스 함수 (API 연결 전 임시 사용)
// ============================================================

import { MOCK_MEDICATIONS, MOCK_TODAY_MEDICATION } from './mockMedicationData.js';

// ────────────────────────────────────────────────────────────
// 유틸
// ────────────────────────────────────────────────────────────

/** 네트워크 지연 시뮬레이션 */
const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

/** 성공 응답 래퍼 */
const ok = (data, message) => ({ success: true, data, message });

/** 실패 응답 래퍼 */
const fail = (message, errorCode) => ({ success: false, data: null, message, errorCode });

// In-memory 상태 (런타임 동안 유지)
let _medications = [...MOCK_MEDICATIONS];
let _todayMedication = JSON.parse(JSON.stringify(MOCK_TODAY_MEDICATION));

// ────────────────────────────────────────────────────────────
// [Image 1] 복약 관리 목록
// ────────────────────────────────────────────────────────────

/**
 * 복약 목록 조회
 * GET /medications
 *
 * @param {Object} filter
 * @param {'전체'|'진행 중'|'종료'} filter.status
 * @param {'전체'|'처방약'|'일반의약품'} filter.category
 * @param {string} filter.keyword
 * @param {'latest'|'name'} filter.sortBy
 */
export async function getMedications(filter = {}) {
  await delay();

  const { status = '전체', category = '전체', keyword = '', sortBy = 'latest' } = filter;

  let result = [..._medications];

  // 상태 필터
  if (status !== '전체') {
    result = result.filter((m) => m.status === status);
  }

  // 카테고리 필터
  if (category !== '전체') {
    result = result.filter((m) => m.category === category);
  }

  // 키워드 검색 (약 이름, 효능)
  if (keyword.trim()) {
    const kw = keyword.trim().toLowerCase();
    result = result.filter(
      (m) =>
        m.name.toLowerCase().includes(kw) ||
        m.description.toLowerCase().includes(kw)
    );
  }

  // 정렬
  if (sortBy === 'latest') {
    result.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  } else if (sortBy === 'name') {
    result.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }

  return ok(result);
}

/**
 * 복약 단건 조회
 * GET /medications/:id
 *
 * @param {string} id
 */
export async function getMedicationById(id) {
  await delay(200);

  const found = _medications.find((m) => m.id === id);
  if (!found) return fail('해당 약을 찾을 수 없습니다.', 'NOT_FOUND');

  return ok(found);
}

/**
 * 복약 추가
 * POST /medications
 *
 * @param {Object} req
 * @param {string} req.name
 * @param {'처방약'|'일반의약품'} req.category
 * @param {string} req.description
 * @param {Object} req.schedule
 * @param {string} req.startDate
 */
export async function addMedication(req) {
  await delay(600);

  const newMed = {
    id: `med-${Date.now()}`,
    ...req,
    status: '진행 중',
  };

  _medications = [newMed, ..._medications];

  return ok(newMed, '복약이 추가되었습니다.');
}

/**
 * 복약 삭제 (종료 처리)
 * DELETE /medications/:id
 *
 * @param {string} id
 */
export async function deleteMedication(id) {
  await delay(400);

  const idx = _medications.findIndex((m) => m.id === id);
  if (idx === -1) return fail('해당 약을 찾을 수 없습니다.', 'NOT_FOUND');

  _medications[idx] = {
    ..._medications[idx],
    status: '종료',
    endDate: new Date().toISOString().slice(0, 10),
  };

  return ok({ id }, '복약이 종료 처리되었습니다.');
}

// ────────────────────────────────────────────────────────────
// [Image 2] 오늘의 복약
// ────────────────────────────────────────────────────────────

/**
 * 오늘의 복약 현황 조회
 * GET /medications/today
 */
export async function getTodayMedication() {
  await delay();
  return ok(_todayMedication);
}

/**
 * 복약 체크 / 체크 해제 (카드 탭)
 * PATCH /medications/today/check
 *
 * @param {Object} req
 * @param {string} req.medicationId
 * @param {'아침'|'점심'|'저녁'|'필요시'} req.mealTime
 * @param {string} req.takenAt  - ISO datetime
 * @param {boolean} req.isChecked
 */
export async function checkMedication(req) {
  await delay(300);

  const { medicationId, mealTime, takenAt, isChecked } = req;

  // 해당 그룹 찾기
  const group = _todayMedication.groups.find((g) => g.mealTime === mealTime);
  if (!group) return fail('해당 시간대를 찾을 수 없습니다.', 'NOT_FOUND');

  // 해당 항목 업데이트
  const entry = group.entries.find((e) => e.medicationId === medicationId);
  if (!entry) return fail('해당 복약 항목을 찾을 수 없습니다.', 'NOT_FOUND');

  entry.completionStatus = isChecked ? '완료' : '예정';
  entry.takenAt = isChecked ? takenAt : undefined;

  // 그룹 완료 상태 재계산
  const allDone = group.entries.every((e) => e.completionStatus === '완료');
  group.completionStatus = allDone ? '완료' : '예정';

  // 전체 완료 카운트 재계산
  const allEntries = _todayMedication.groups.flatMap((g) => g.entries);
  const completedCount = allEntries.filter((e) => e.completionStatus === '완료').length;

  _todayMedication = {
    ..._todayMedication,
    completedCount,
    completionRate: Math.round((completedCount / _todayMedication.totalCount) * 100),
  };

  return ok(
    _todayMedication,
    isChecked ? '복약 완료로 기록되었습니다.' : '복약 체크가 해제되었습니다.'
  );
}

// ────────────────────────────────────────────────────────────
// 개발 편의 유틸 (테스트용 초기화)
// ────────────────────────────────────────────────────────────

export function __resetMockData() {
  _medications = [...MOCK_MEDICATIONS];
  _todayMedication = JSON.parse(JSON.stringify(MOCK_TODAY_MEDICATION));
}
