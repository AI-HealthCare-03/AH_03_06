// 복약 카드 표시용 포맷 헬퍼 — 텍스트 오버플로 정책(긴 시간 나열·요일 나열 축약).
// 표시 계층 전용. 백엔드 시간/요일 데이터 자체는 건드리지 않는다.

// 복용 시간 나열 축약.
//  - 3개 이하: 그대로 나열 "08:00 · 13:00 · 18:00"
//  - 4개 이상: 정렬 후 첫·끝 + 횟수 "06:00~22:00 · 5회" (잘림 대신 의미 보존)
export const fmtTimes = (times) => {
  const list = (times || []).filter(Boolean);
  if (list.length === 0) return '';
  if (list.length <= 3) return list.join(' · ');
  const sorted = [...list].sort();
  return `${sorted[0]}~${sorted[sorted.length - 1]} · ${sorted.length}회`;
};

const DAY_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_KO = { MON: '월', TUE: '화', WED: '수', THU: '목', FRI: '금', SAT: '토', SUN: '일' };

// 요일 나열 축약.
//  - 7일 전부 또는 빈 배열: null (호출부가 "매일"로 처리 — 기존 동작 유지)
//  - 연속 구간(3일 이상): 범위 "월~금"
//  - 그 외(비연속·2일): 나열 "월 · 수 · 금"
// 순환 연속(토·일·월)은 고려하지 않고 나열로 둔다.
export const fmtDays = (days) => {
  const set = new Set(days || []);
  if (set.size === 0 || set.size === 7) return null;
  const idx = DAY_ORDER.map((d, i) => (set.has(d) ? i : -1)).filter((i) => i >= 0);
  const consecutive = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
  if (consecutive && idx.length >= 3) {
    return `${DAY_KO[DAY_ORDER[idx[0]]]}~${DAY_KO[DAY_ORDER[idx[idx.length - 1]]]}`;
  }
  return idx.map((i) => DAY_KO[DAY_ORDER[i]]).join(' · ');
};
