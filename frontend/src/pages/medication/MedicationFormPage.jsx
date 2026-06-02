// src/pages/medication/MedicationFormPage.jsx
// 약 등록(mode="create") / 수정(mode="edit") 통합 폼
// 수정 모드: updateSchedule + updateAlarm(PATCH /alarms/{id}) 분리 호출

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  addMedication,
  deleteMedication,
  getMedicationById,
  createSchedule,
  updateSchedule,
  getSchedules,
  updateAlarm,          // ✅ 신규
} from '../../api/medication';

// ── 상수 ──────────────────────────────────────────────────────
const MEAL_TIMES   = ['아침', '점심', '저녁', '취침 전'];
const TIMINGS      = ['식전', '식후', '상관없음'];
const TIMING_MINS  = [15, 30];
const UNITS        = ['정', 'mg', 'ml', '캡슐', '포', '개'];
const PURPOSES     = ['혈압', '당뇨', '고지혈증', '통증', '소화', '수면', '기타'];
const QUICK_DAYS   = [7, 14, 30, 90];
const WEEK_DAYS    = ['월', '화', '수', '목', '금', '토', '일'];

const today = () => new Date().toISOString().slice(0, 10);

// ── 초기 폼 상태 ───────────────────────────────────────────────
const defaultForm = () => ({
  name:           '',
  dosageAmount:   1,
  dosageUnit:     '정',
  purpose:        '',
  startDate:      today(),
  endDate:        '',
  ongoing:        false,
  mealTimes:      ['아침'],
  timing:         '식후',
  timingMinutes:  30,
  isAsNeeded:     false,
  cycleType:      'daily',       // 'daily' | 'interval' | 'weekdays'
  intervalDays:   2,
  weekDays:       [],
  clockTimes:     [],            // 직접 입력 시간 ['08:00', ...]
  alarmEnabled:   false,
  alarmTime:      '08:00',
  // 수정 모드 전용
  alarmId:        null,          // 서버에서 받아온 alarm id
  scheduleId:     null,
});

export default function MedicationFormPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const params    = new URLSearchParams(location.search);
  const mode      = params.get('mode') || 'create';   // 'create' | 'edit'
  const medId     = params.get('id');                  // edit 모드일 때 medication id

  const [form,       setForm]       = useState(defaultForm());
  const [loading,    setLoading]    = useState(false);
  const [fetchError, setFetchError] = useState('');

  // ── 수정 모드: 기존 데이터 로드 ──────────────────────────────
  useEffect(() => {
    if (mode !== 'edit' || !medId) return;
    (async () => {
      try {
        setLoading(true);
        const [medRes, schedRes] = await Promise.all([
          getMedicationById(medId),
          getSchedules(medId),
        ]);
        const med   = medRes.data  ?? medRes;
        const sched = schedRes.data ?? schedRes;

        setForm(prev => ({
          ...prev,
          name:          med.name           ?? '',
          dosageAmount:  med.dosage_amount   ?? 1,
          dosageUnit:    med.dosage_unit     ?? '정',
          purpose:       med.purpose         ?? '',
          startDate:     med.start_date?.slice(0,10) ?? today(),
          endDate:       med.end_date?.slice(0,10)   ?? '',
          ongoing:       !med.end_date,
          mealTimes:     sched.meal_times    ?? ['아침'],
          timing:        sched.timing        ?? '식후',
          timingMinutes: sched.timing_minutes ?? 30,
          isAsNeeded:    sched.is_as_needed  ?? false,
          cycleType:     sched.cycle_type    ?? 'daily',
          intervalDays:  sched.interval_days ?? 2,
          weekDays:      sched.week_days     ?? [],
          clockTimes:    sched.clock_times   ?? [],
          alarmEnabled:  sched.alarm_enabled ?? false,
          alarmTime:     sched.alarm_time    ?? '08:00',
          alarmId:       sched.alarm_id      ?? null,
          scheduleId:    sched.id            ?? null,
        }));
      } catch (e) {
        setFetchError('약 정보를 불러오지 못했어요.');
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [mode, medId]);

  // ── 폼 헬퍼 ──────────────────────────────────────────────────
  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const toggleMealTime = (t) =>
    set('mealTimes',
      form.mealTimes.includes(t)
        ? form.mealTimes.filter(x => x !== t)
        : [...form.mealTimes, t]
    );

  const toggleWeekDay = (d) =>
    set('weekDays',
      form.weekDays.includes(d)
        ? form.weekDays.filter(x => x !== d)
        : [...form.weekDays, d]
    );

  const addClockTime = () =>
    set('clockTimes', [...form.clockTimes, '08:00']);

  const updateClockTime = (i, val) =>
    set('clockTimes', form.clockTimes.map((t, idx) => idx === i ? val : t));

  const removeClockTime = (i) =>
    set('clockTimes', form.clockTimes.filter((_, idx) => idx !== i));

  // ── 제출 ─────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.name.trim()) { alert('약 이름을 입력해 주세요.'); return; }

    const schedulePayload = {
      meal_times:      form.mealTimes,
      timing:          form.timing,
      timing_minutes:  form.timingMinutes,
      is_as_needed:    form.isAsNeeded,
      cycle_type:      form.cycleType,
      interval_days:   form.cycleType === 'interval' ? form.intervalDays : null,
      week_days:       form.cycleType === 'weekdays' ? form.weekDays : null,
      clock_times:     form.clockTimes,
      alarm_enabled:   form.alarmEnabled,
      alarm_time:      form.alarmEnabled ? form.alarmTime : null,
    };

    const alarmPayload = {
      enabled:    form.alarmEnabled,
      alarm_time: form.alarmEnabled ? form.alarmTime : null,
    };

    try {
      setLoading(true);

      if (mode === 'create') {
        // 1️⃣ 약 등록
        await createSchedule(null, {
          name:         form.name.trim(),
          mealTimes:    form.mealTimes,
          timing:       form.timing,
          cycleType:    form.cycleType,
          weekDays:     form.cycleType === 'weekdays' ? form.weekDays : [],
          alarmEnabled: form.alarmEnabled,
          alarmTime:    form.alarmEnabled ? form.alarmTime : null,
        });
      } else {
        // 1️⃣ 일정 수정
        console.log('[수정] schedulePayload:', schedulePayload);
        await updateSchedule(medId, schedulePayload);

        // 2️⃣ 알람 수정 — PATCH /alarms/{id} ✅
        if (form.alarmId) {
          console.log('[수정] alarmId:', form.alarmId, 'alarmPayload:', alarmPayload);
          await updateAlarm(form.alarmId, alarmPayload);
        } else {
          // alarmId가 없으면 scheduleId로 대체 시도 (서버 구조에 따라 조정)
          const fallbackId = form.scheduleId ?? medId;
          console.log('[수정] alarmId 없음, fallback id:', fallbackId, 'alarmPayload:', alarmPayload);
          await updateAlarm(fallbackId, alarmPayload);
        }
      }

      navigate('/medication');
    } catch (e) {
      console.error(e);
      alert('저장 중 오류가 발생했어요. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  // ── 삭제 ─────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!window.confirm('이 약을 삭제하시겠어요?')) return;
    try {
      setLoading(true);
      await deleteMedication(medId);
      navigate('/medication');
    } catch (e) {
      console.error(e);
      alert('삭제 중 오류가 발생했어요.');
    } finally {
      setLoading(false);
    }
  };

  // ── 로딩 / 에러 ───────────────────────────────────────────────
  if (loading && mode === 'edit' && !form.name)
    return (
      <div className="min-h-screen bg-[#F4F4F5] flex items-center justify-center">
        <span className="text-[#71717A] text-sm">불러오는 중...</span>
      </div>
    );

  if (fetchError)
    return (
      <div className="min-h-screen bg-[#F4F4F5] flex flex-col items-center justify-center gap-4">
        <p className="text-[#09090B] text-sm">{fetchError}</p>
        <button onClick={() => navigate(-1)} className="text-[#2563EB] text-sm">돌아가기</button>
      </div>
    );

  // ── 렌더 ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F4F4F5]">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E4E4E7] px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-[#F4F4F5]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#09090B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-[16px] font-semibold text-[#09090B]">
          {mode === 'edit' ? '복용 약 수정' : '복용 약 등록'}
        </h1>
      </div>

      <div className="px-4 py-5 space-y-4 max-w-lg mx-auto pb-32">

        {/* ── 약 기본 정보 ── */}
        <Section title="약 기본 정보">
          <Label>약 이름</Label>
          <input
            type="text"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="예) 아스피린 100mg"
            className="w-full border border-[#E4E4E7] rounded-xl px-4 py-3 text-sm text-[#09090B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          />

          <Label mt>1회 복용량</Label>
          <div className="flex gap-2">
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={form.dosageAmount}
              onChange={e => set('dosageAmount', parseFloat(e.target.value) || 1)}
              className="w-24 border border-[#E4E4E7] rounded-xl px-3 py-3 text-sm text-[#09090B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
            <div className="flex flex-wrap gap-2">
              {UNITS.map(u => (
                <ChipButton key={u} active={form.dosageUnit === u} onClick={() => set('dosageUnit', u)}>
                  {u}
                </ChipButton>
              ))}
            </div>
          </div>

          <Label mt>복용 목적 (선택)</Label>
          <div className="flex flex-wrap gap-2">
            {PURPOSES.map(p => (
              <ChipButton key={p} active={form.purpose === p} onClick={() => set('purpose', form.purpose === p ? '' : p)}>
                {p}
              </ChipButton>
            ))}
          </div>
        </Section>

        {/* ── 투약 기간 ── */}
        <Section title="투약 기간">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label>시작일</Label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => set('startDate', e.target.value)}
                className="w-full border border-[#E4E4E7] rounded-xl px-3 py-3 text-sm text-[#09090B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>
            {!form.ongoing && (
              <div className="flex-1">
                <Label>종료일</Label>
                <input
                  type="date"
                  value={form.endDate}
                  min={form.startDate}
                  onChange={e => set('endDate', e.target.value)}
                  className="w-full border border-[#E4E4E7] rounded-xl px-3 py-3 text-sm text-[#09090B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>
            )}
          </div>

          {/* 빠른 기간 선택 */}
          {!form.ongoing && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {QUICK_DAYS.map(d => (
                <button
                  key={d}
                  onClick={() => {
                    const end = new Date(form.startDate);
                    end.setDate(end.getDate() + d - 1);
                    set('endDate', end.toISOString().slice(0, 10));
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#EFF6FF] text-[#2563EB] text-xs font-medium"
                >
                  {d}일
                </button>
              ))}
            </div>
          )}

          <Toggle
            mt
            label="진행 중 (종료일 없음)"
            checked={form.ongoing}
            onChange={v => set('ongoing', v)}
          />
        </Section>

        {/* ── 복용 시간 ── */}
        <Section title="복용 시간">
          <Toggle
            label="필요시 복용"
            checked={form.isAsNeeded}
            onChange={v => set('isAsNeeded', v)}
          />

          {!form.isAsNeeded && (
            <>
              <Label mt>복용 시간대</Label>
              <div className="flex gap-2 flex-wrap">
                {MEAL_TIMES.map(t => (
                  <ChipButton
                    key={t}
                    active={form.mealTimes.includes(t)}
                    onClick={() => toggleMealTime(t)}
                  >
                    {t}
                  </ChipButton>
                ))}
              </div>

              <Label mt>식사 기준</Label>
              <div className="flex gap-2">
                {TIMINGS.map(t => (
                  <ChipButton key={t} active={form.timing === t} onClick={() => set('timing', t)}>
                    {t}
                  </ChipButton>
                ))}
              </div>

              {form.timing !== '상관없음' && (
                <>
                  <Label mt>시간 (분)</Label>
                  <div className="flex gap-2">
                    {TIMING_MINS.map(m => (
                      <ChipButton
                        key={m}
                        active={form.timingMinutes === m}
                        onClick={() => set('timingMinutes', m)}
                      >
                        {m}분
                      </ChipButton>
                    ))}
                  </div>
                </>
              )}

              {/* 직접 시간 추가 */}
              <Label mt>직접 시간 추가 (선택)</Label>
              <div className="space-y-2">
                {form.clockTimes.map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="time"
                      value={t}
                      onChange={e => updateClockTime(i, e.target.value)}
                      className="border border-[#E4E4E7] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    />
                    <button onClick={() => removeClockTime(i)} className="text-[#EF4444] text-xs">삭제</button>
                  </div>
                ))}
                <button
                  onClick={addClockTime}
                  className="text-[#2563EB] text-sm font-medium"
                >
                  + 시간 추가
                </button>
              </div>
            </>
          )}
        </Section>

        {/* ── 복약 주기 ── */}
        <Section title="복약 주기">
          <div className="flex gap-2">
            {[['daily','매일'], ['interval','N일 간격'], ['weekdays','요일 선택']].map(([val, label]) => (
              <ChipButton key={val} active={form.cycleType === val} onClick={() => set('cycleType', val)}>
                {label}
              </ChipButton>
            ))}
          </div>

          {form.cycleType === 'interval' && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-sm text-[#71717A]">매</span>
              <input
                type="number"
                min={2}
                value={form.intervalDays}
                onChange={e => set('intervalDays', parseInt(e.target.value) || 2)}
                className="w-16 border border-[#E4E4E7] rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
              <span className="text-sm text-[#71717A]">일마다</span>
            </div>
          )}

          {form.cycleType === 'weekdays' && (
            <div className="flex gap-1.5 mt-3 flex-wrap">
              {WEEK_DAYS.map(d => (
                <button
                  key={d}
                  onClick={() => toggleWeekDay(d)}
                  className={`w-9 h-9 rounded-full text-sm font-medium transition-colors
                    ${form.weekDays.includes(d)
                      ? 'bg-[#2563EB] text-white'
                      : 'bg-[#F4F4F5] text-[#71717A]'}`}
                >
                  {d}
                </button>
              ))}
            </div>
          )}
        </Section>

        {/* ── 복약 알림 ── (수정 모드: updateAlarm PATCH 호출) */}
        <Section title="복약 알림">
          {/* 수정 모드 뱃지 */}
          {mode === 'edit' && (
            <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-[#EFF6FF] rounded-xl">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span className="text-xs text-[#2563EB]">
                알림 변경 시 <strong>PATCH /alarms/{'{id}'}</strong> 로 별도 저장돼요
              </span>
            </div>
          )}

          <Toggle
            label="알림 받기"
            checked={form.alarmEnabled}
            onChange={v => set('alarmEnabled', v)}
          />

          {form.alarmEnabled && (
            <div className="mt-3">
              <Label>알림 시간</Label>
              <input
                type="time"
                value={form.alarmTime}
                onChange={e => set('alarmTime', e.target.value)}
                className="border border-[#E4E4E7] rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>
          )}

          {/* 수정 모드: 알람 ID 표시 (디버그용) */}
          {mode === 'edit' && import.meta.env.DEV && (
            <p className="mt-2 text-[10px] text-[#A1A1AA]">
              alarm_id: {form.alarmId ?? '(서버 응답 대기중)'}
            </p>
          )}
        </Section>

        {/* ── 삭제 버튼 (수정 모드만) ── */}
        {mode === 'edit' && (
          <button
            onClick={handleDelete}
            disabled={loading}
            className="w-full py-3 rounded-xl border border-[#EF4444] text-[#EF4444] text-sm font-medium"
          >
            이 약 삭제하기
          </button>
        )}
      </div>

      {/* ── 하단 고정 버튼 ── */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-white border-t border-[#E4E4E7]">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3.5 bg-[#2563EB] text-white rounded-xl text-sm font-semibold disabled:opacity-50 max-w-lg mx-auto block"
        >
          {loading ? '저장 중...' : mode === 'edit' ? '수정 완료' : '등록 완료'}
        </button>
      </div>
    </div>
  );
}

// ── 공통 서브 컴포넌트 ─────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl px-4 py-4 shadow-sm">
      <h2 className="text-[13px] font-semibold text-[#71717A] uppercase tracking-wide mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Label({ children, mt }) {
  return (
    <p className={`text-[13px] text-[#09090B] font-medium ${mt ? 'mt-3 mb-1.5' : 'mb-1.5'}`}>
      {children}
    </p>
  );
}

function ChipButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
        ${active
          ? 'bg-[#2563EB] text-white'
          : 'bg-[#F4F4F5] text-[#71717A] hover:bg-[#E4E4E7]'}`}
    >
      {children}
    </button>
  );
}

function Toggle({ label, checked, onChange, mt }) {
  return (
    <div className={`flex items-center justify-between ${mt ? 'mt-3' : ''}`}>
      <span className="text-sm text-[#09090B]">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full transition-colors relative
          ${checked ? 'bg-[#2563EB]' : 'bg-[#E4E4E7]'}`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
            ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
        />
      </button>
    </div>
  );
}