// ============================================================
// api/medication.js
// 복약 관리 서비스 - Mock ↔ 실제 API 전환 포인트
//
// ✅ 현재: Mock 사용 (API 개발 전)
// 🔄 전환: .env에서 VITE_USE_MOCK=false 로 변경
// ============================================================

import * as MockService from '../utils/mockMedicationService.js';

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

// ────────────────────────────────────────────────────────────
// Real API 구현체 (팀원이 API 완성되면 여기를 채워주세요)
// ────────────────────────────────────────────────────────────

// TODO: 팀 공통 axios 인스턴스로 교체
const apiClient = {
  get: async (url, params) => {
    throw new Error(`[Real API] GET ${url} 미구현`);
  },
  post: async (url, body) => {
    throw new Error(`[Real API] POST ${url} 미구현`);
  },
  patch: async (url, body) => {
    throw new Error(`[Real API] PATCH ${url} 미구현`);
  },
  delete: async (url) => {
    throw new Error(`[Real API] DELETE ${url} 미구현`);
  },
};

const RealService = {
  getMedications:     (filter) => apiClient.get('/medications', filter),
  getMedicationById:  (id)     => apiClient.get(`/medications/${id}`),
  addMedication:      (req)    => apiClient.post('/medications', req),
  deleteMedication:   (id)     => apiClient.delete(`/medications/${id}`),
  getTodayMedication: ()       => apiClient.get('/medications/today'),
  checkMedication:    (req)    => apiClient.patch('/medications/today/check', req),
};

// ────────────────────────────────────────────────────────────
// 외부에서 사용하는 서비스 함수 (이 이름으로만 호출하세요)
// ────────────────────────────────────────────────────────────

const Service = USE_MOCK ? MockService : RealService;

export const getMedications     = (filter = {}) => Service.getMedications(filter);
export const getMedicationById  = (id)          => Service.getMedicationById(id);
export const addMedication      = (req)          => Service.addMedication(req);
export const deleteMedication   = (id)           => Service.deleteMedication(id);
export const getTodayMedication = ()             => Service.getTodayMedication();
export const checkMedication    = (req)          => Service.checkMedication(req);

if (import.meta.env.DEV) {
  console.log(`[medication.js] 모드: ${USE_MOCK ? '🟡 Mock' : '🟢 Real API'}`);
}
