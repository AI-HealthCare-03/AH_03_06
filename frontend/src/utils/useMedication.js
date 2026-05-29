// ============================================================
// utils/useMedication.js
// 복약 관련 React Custom Hooks
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
  getMedications,
  getMedicationById,
  addMedication,
  deleteMedication,
  getTodayMedication,
  checkMedication,
} from '../api/medication.js';

// ────────────────────────────────────────────────────────────
// [Image 1] 복약 관리 목록
// ────────────────────────────────────────────────────────────

/**
 * 복약 목록 조회 훅
 *
 * @param {Object} filter - { status, category, keyword, sortBy }
 *
 * @example
 * const { medications, isLoading, error, refetch } = useMedications({ status: '진행 중' });
 */
export function useMedications(filter = {}) {
  const [medications, setMedications] = useState([]);
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState(null);

  const filterKey = JSON.stringify(filter);

  const fetch = useCallback(async (f = filter) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getMedications(f);
      if (res.success) {
        setMedications(res.data);
      } else {
        setError(res.message ?? '데이터를 불러오지 못했습니다.');
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [filterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch(); }, [filterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { medications, isLoading, error, refetch: fetch };
}

/**
 * 복약 추가 훅
 *
 * @example
 * const { add, isLoading } = useAddMedication();
 * const newMed = await add({ name: '...' });
 */
export function useAddMedication() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState(null);

  const add = useCallback(async (req) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await addMedication(req);
      if (res.success) return res.data;
      setError(res.message ?? '추가에 실패했습니다.');
      return null;
    } catch {
      setError('네트워크 오류가 발생했습니다.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { add, isLoading, error };
}

/**
 * 복약 삭제(종료) 훅
 *
 * @example
 * const { remove, isLoading } = useDeleteMedication();
 * const success = await remove('med-001');
 */
export function useDeleteMedication() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState(null);

  const remove = useCallback(async (id) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await deleteMedication(id);
      if (res.success) return true;
      setError(res.message ?? '삭제에 실패했습니다.');
      return false;
    } catch {
      setError('네트워크 오류가 발생했습니다.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { remove, isLoading, error };
}

// ────────────────────────────────────────────────────────────
// [Image 2] 오늘의 복약
// ────────────────────────────────────────────────────────────

/**
 * 오늘의 복약 현황 조회 훅
 *
 * @example
 * const { todayMedication, isLoading, refetch } = useTodayMedication();
 */
export function useTodayMedication() {
  const [todayMedication, setTodayMedication] = useState(null);
  const [isLoading, setIsLoading]             = useState(false);
  const [error, setError]                     = useState(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getTodayMedication();
      if (res.success) {
        setTodayMedication(res.data);
      } else {
        setError(res.message ?? '데이터를 불러오지 못했습니다.');
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { todayMedication, isLoading, error, refetch: fetch };
}

/**
 * 복약 체크/해제 훅 (카드 탭 액션)
 *
 * @example
 * const { check, isLoading } = useCheckMedication();
 * await check({
 *   medicationId: 'med-001',
 *   mealTime: '아침',
 *   takenAt: new Date().toISOString(),
 *   isChecked: true
 * });
 */
export function useCheckMedication() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState(null);
  const [result, setResult]       = useState(null);

  const check = useCallback(async (req) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await checkMedication(req);
      if (res.success) {
        setResult(res.data);
        return res.data;
      }
      setError(res.message ?? '처리에 실패했습니다.');
      return null;
    } catch {
      setError('네트워크 오류가 발생했습니다.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { check, result, isLoading, error };
}
