// src/pages/medication/MedicationFormPage.jsx
// 약 등록(mode="create") / 수정(mode="edit") 통합 폼
// 수정 모드: updateSchedule + updateAlarm(PATCH /alarms/{id}) 분리 호출

import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../../components/Header.jsx';
import MobileFrame from '../../components/MobileFrame.jsx';
import {
  addDirectMedication,
  deleteMedication,
  getMedicationById,
  updateMedication,
} from '../../api/medication';
import { fetchDrugSuggest } from '../../api/medicationGuides.js';

// ── 상수 ──────────────────────────────────────────────────────
const MEAL_TIMES   = ['아침', '점심', '저녁', '취침 전'];
const TIMINGS      = ['식전', '식후', '식간', '상관없음'];
const TIMING_MINS  = [15, 30, 60, 120];
const fmtMin       = (m) => (m >= 60 ? `${m / 60}시간` : `${m}분`);
const UNITS        = ['정', 'mg', 'ml', '캡슐', '포', '개'];
const PURPOSES     = ['혈압', '당뇨', '고지혈증', '통증', '소화', '수면', '기타'];
const QUICK_DAYS   = [7, 14, 30, 90];
const WEEK_DAYS    = ['월', '화', '수', '목', '금', '토', '일'];
const DAY_TO_EN    = { 월: 'MON', 화: 'TUE', 수: 'WED', 목: 'THU', 금: 'FRI', 토: 'SAT', 일: 'SUN' };
const ALL_DAYS_EN  = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const today = () => new Date().toISOString().slice(0, 10);

// 복용 시간 ↔ 시간대 매핑 (수정 폼 로드용)
const TIME_TO_MEAL = { '08:00': '아침', '13:00': '점심', '18:00': '저녁', '22:00': '취침 전' };
const DAY_TO_KO = { MON: '월', TUE: '화', WED: '수', THU: '목', FRI: '금', SAT: '토', SUN: '일' };

// "1정" → { amount: 1, unit: '정' }
function parseDosage(msg) {
  const m = String(msg ?? '').match(/^\s*([\d.]+)\s*(.*)$/);
  if (!m) return { amount: 1, unit: '정' };
  return { amount: parseFloat(m[1]) || 1, unit: (m[2] || '정').trim() || '정' };
}

// ── 초기 폼 상태 ───────────────────────────────────────────────
const defaultForm = () => ({
  name:           '',
  isCustom:       true,          // true=일반의약품, false=처방약 (직접등록 기본=일반)
  dosageAmount:   1,
  dosageUnit:     '정',
  purpose:        '',
  startDate:      today(),
  endDate:        '',
  ongoing:        false,
  mealTimes:      ['아침'], 
  mealTimeTimes:      {
    '아침': '08:00',
    '점심': '13:00',
    '저녁': '18:00',
    '취침 전': '22:00',
  },
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
  const source    = params.get('source') || 'prescription';   // 'prescription' | 'custom'

  const [form,       setForm]       = useState(defaultForm());
  const [loading,    setLoading]    = useState(false);
  const [fetchError, setFetchError] = useState('');
  // 약품 자동완성 — 선택 시 item_seq 확보 (Phase A: DUR 코드 매칭 대비, 백엔드 미사용이면 무시됨)
  const [drugList,   setDrugList]   = useState([]);
  const debounceRef = useRef(null);
  const abortRef    = useRef(null);

  // ── 수정 모드: 기존 데이터 로드 ──────────────────────────────
  useEffect(() => {
    if (mode !== 'edit' || !medId) return;
    (async () => {
      try {
        setLoading(true);
        const res = await getMedicationById(medId, source);
        const med = res.data ?? res;

        // 복용 시간 → 시간대/직접시간 분리
        const mealTimes = [];
        const clockTimes = [];
        const mealTimeTimes = { '아침': '08:00', '점심': '13:00', '저녁': '18:00', '취침 전': '22:00' };
        for (const t of (med.times ?? [])) {
          const meal = TIME_TO_MEAL[t];
          if (meal) { mealTimes.push(meal); mealTimeTimes[meal] = t; }
          else clockTimes.push(t);
        }
        const { amount, unit } = parseDosage(med.dosage_message);
        const days = med.days ?? [];
        const isWeekdays = days.length > 0 && days.length < 7;

        setForm(prev => ({
          ...prev,
          name:          med.drug_name ?? '',
          dosageAmount:  amount,
          dosageUnit:    unit,
          startDate:     med.start_date?.slice(0, 10) ?? today(),
          endDate:       med.end_date?.slice(0, 10) ?? '',
          ongoing:       !med.end_date,
          mealTimes:     mealTimes.length ? mealTimes : (clockTimes.length ? [] : ['아침']),
          mealTimeTimes,
          clockTimes,
          cycleType:     med.interval_days ? 'interval' : (isWeekdays ? 'weekdays' : 'daily'),
          intervalDays:  med.interval_days ?? 2,
          weekDays:      isWeekdays ? days.map(d => DAY_TO_KO[d]).filter(Boolean) : [],
          isAsNeeded:    med.is_as_needed ?? false,
          isCustom:      med.is_custom ?? (source === 'custom'),
          timing:        med.meal_basis ?? prev.timing,
          timingMinutes: med.timing_offset_min ?? prev.timingMinutes,
          alarmEnabled:  true,
        }));
      } catch (e) {
        setFetchError('약 정보를 불러오지 못했어요.');
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [mode, medId, source]);

  // ── 폼 헬퍼 ──────────────────────────────────────────────────
  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  // 약 이름 변경 시 자동완성 질의 (250ms 디바운스 + AbortController). 실패해도 수동 입력 가능.
  useEffect(() => {
    const q = form.name.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();
    if (!q) { setDrugList([]); return; }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await fetchDrugSuggest({ q, limit: 30 }, ctrl.signal);
        if (!ctrl.signal.aborted) setDrugList(data.drugs ?? []);
      } catch (err) {
        if (err?.name !== 'AbortError') setDrugList([]);
      }
    }, 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [form.name]);

  // 입력이 목록의 약명과 정확히 일치하면 item_seq 추출 (없으면 undefined → 기존 이름매칭 폴백)
  const matchedDrug = useMemo(
    () => drugList.find(d => d.drug_name === form.name.trim()),
    [drugList, form.name],
  );

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

    const mealTimeMap = { '아침': '08:00', '점심': '13:00', '저녁': '18:00', '취침 전': '22:00' };
    const prn = form.isAsNeeded;
    const days = form.cycleType === 'weekdays'
      ? form.weekDays.map(d => DAY_TO_EN[d])
      : ALL_DAYS_EN;
    const intervalDays = (!prn && form.cycleType === 'interval') ? (parseInt(form.intervalDays) || null) : null;
    // 식사 기준(식전/식후/식간/상관없음) + 오프셋(분). '상관없음'이면 오프셋 없음
    const mealBasis = form.timing || null;
    const timingOffsetMin = (form.timing && form.timing !== '상관없음') ? form.timingMinutes : null;
    // PRN(필요시)이면 명목상 1개(08:00 — 화면엔 '필요시'로 표시), 아니면 시간대+직접시간
    const times = prn ? ['08:00'] : [...new Set([
      ...form.mealTimes.map(m => form.mealTimeTimes[m] || mealTimeMap[m] || '08:00'),
      ...form.clockTimes,
    ].filter(Boolean))];

    if (!prn && times.length === 0) {
      alert('복용 시간을 한 개 이상 선택해 주세요.');
      return;
    }

    try {
      setLoading(true);

      if (mode === 'create') {
        // 복용 시간마다 각각 스케줄 등록 (PRN은 1개)
        for (const t of times) {
          await addDirectMedication({
            intake_time:       t,
            drug_name:         form.name.trim(),
            item_seq:          matchedDrug?.item_seq ?? null, // 자동완성 선택 시 DUR 코드 (Phase A: 백엔드 미수신이면 무시)
            dosage_message:    `${form.dosageAmount || 1}${form.dosageUnit}`,
            notification_type: 'PUSH',
            days,
            is_custom:         form.isCustom,
            start_date:        form.startDate || null,
            end_date:          form.ongoing ? null : (form.endDate || null),
            interval_days:     intervalDays,
            is_as_needed:      prn,
            meal_basis:        mealBasis,
            timing_offset_min: timingOffsetMin,
          });
        }
      } else {
        // 수정 — times를 백엔드가 스케줄 재생성
        await updateMedication(medId, source, {
          drug_name:         form.name.trim(),
          item_seq:          matchedDrug?.item_seq ?? null, // 자동완성 선택 시 DUR 코드 (Phase A: 백엔드 미수신이면 무시)
          dosage_message:    `${form.dosageAmount}${form.dosageUnit}`,
          start_date:        form.startDate || null,
          end_date:          form.ongoing ? null : (form.endDate || null),
          times,
          days,
          notification_type: 'PUSH',
          interval_days:     intervalDays,
          is_as_needed:      prn,
          meal_basis:        mealBasis,
          timing_offset_min: timingOffsetMin,
          is_custom:         form.isCustom,
        });
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
    <MobileFrame
      contentBg="white"
      header={<Header variant="back" title={mode === 'edit' ? '복용 약 수정' : '복용 약 등록'} />}
    >
      <div className="px-4 py-5 space-y-4 pb-32">

        {/* ── 약 기본 정보 ── */}
        <Section title="약 기본 정보">
          <Label>약 이름</Label>
          <input
            type="text"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            list="med-drug-suggest"
            placeholder="예) 아스피린 100mg"
            className="w-full border border-[#E4E4E7] rounded-xl px-4 py-3 text-sm text-[#09090B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          />
          <datalist id="med-drug-suggest">
            {drugList.map(d => (
              <option key={d.item_seq} value={d.drug_name} />
            ))}
          </datalist>
          {matchedDrug && (
            <p className="text-[11px] text-primary mt-1">등록 약품 매칭됨</p>
          )}

          {/* 약 구분 — 처방 수정 시엔 숨김(처방약 고정) */}
          {(mode === 'create' || source === 'custom') && (
            <>
              <Label mt>약 구분</Label>
              <div className="flex gap-2">
                <ChipButton active={!form.isCustom} onClick={() => set('isCustom', false)}>처방약</ChipButton>
                <ChipButton active={form.isCustom} onClick={() => set('isCustom', true)}>일반의약품</ChipButton>
              </div>
            </>
          )}

          <Label mt>1회 복용량</Label>
          <div className="flex gap-2">
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={form.dosageAmount}
              onChange= {e => {
                const val = e.target.value;
                set('dosageAmount', val === '' ? '' : parseFloat(val));
              }}
              className="w-24 border border-borderHairline rounded-xl px-3 py-3 text-sm text-center text-textHeading focus:outline-none focus:ring-2 focus:ring-primary"
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
          <Toggle
            label="진행 중 (종료일 없음)"
            checked={form.ongoing}
            onChange={v => set('ongoing', v)}
          />

          {/* 시작일 ~ 종료일 — 이력 조회와 동일하게 한 줄 가로 배치 */}
          <div className="mt-3 flex items-center gap-2">
            <input
              type="date"
              value={form.startDate}
              onChange={e => set('startDate', e.target.value)}
              className="flex-1 min-w-0 border border-borderHairline rounded-xl px-3 py-2.5 text-sm text-textHeading focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            />
            {!form.ongoing && (
              <>
                <span className="text-mute text-sm flex-shrink-0">~</span>
                <input
                  type="date"
                  value={form.endDate}
                  min={form.startDate}
                  onChange={e => set('endDate', e.target.value)}
                  className="flex-1 min-w-0 border border-borderHairline rounded-xl px-3 py-2.5 text-sm text-textHeading focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                />
              </>
            )}
          </div>

          {/* 빠른 기간 선택 */}
          {!form.ongoing && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {QUICK_DAYS.map(d => {
                const end = new Date(form.startDate);
                end.setDate(end.getDate() + d - 1);
                const endStr = end.toISOString().slice(0, 10);
                const isActive = form.endDate === endStr;
                return (
                  <button
                    key={d}
                    onClick={() => set('endDate', endStr)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                      ${isActive
                        ? 'bg-[#2563EB] text-white'
                        : 'bg-[#EFF6FF] text-[#2563EB]'}`}
                  >
                    {d}일
                  </button>
                );
              })}
            </div>
          )}
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
                  <Label mt>시간</Label>
                  <div className="flex gap-2">
                    {TIMING_MINS.map(m => (
                      <ChipButton
                        key={m}
                        active={form.timingMinutes === m}
                        onClick={() => set('timingMinutes', m)}
                      >
                        {fmtMin(m)}
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

        {/* ── 복약 알림 ── */}
        <Section title="복약 알림">
          <Toggle
            label="알림 받기"
            checked={form.alarmEnabled}
            onChange={v => set('alarmEnabled', v)}
          />

          {form.alarmEnabled && (
            <div className="mt-3 p-3 bg-[#F4F4F5] rounded-xl">
              <p className="text-[12px] text-[#71717A] mb-2">복용 시간대별 알림 시간을 설정해요</p>
              <div className="flex flex-col gap-2">
                {form.mealTimes.map(mealTime => (
                  <div key={mealTime} className="flex items-center justify-between">
                    <span className="text-[13px] text-[#52525B] font-medium">{mealTime}</span>
                    <input
                      type="time"
                      value={form.mealTimeTimes[mealTime]}
                      onChange={e => set('mealTimeTimes', {
                        ...form.mealTimeTimes,
                        [mealTime]: e.target.value
                      })}
                      className="border border-[#E4E4E7] rounded-lg px-2 py-1.5 text-sm text-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
                    />
                  </div>
                ))}
              </div>
            </div>
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
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full md:max-w-[480px] px-4 pb-6 pt-3 bg-white border-t border-[#E4E4E7]">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3.5 bg-[#2563EB] text-white rounded-xl text-sm font-semibold disabled:opacity-50 max-w-lg mx-auto block"
        >
          {loading ? '저장 중...' : mode === 'edit' ? '수정 완료' : '등록 완료'}
        </button>
      </div>
    </MobileFrame>
  );
}

// ── 공통 서브 컴포넌트 ─────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div className="bg-white border border-borderHairline rounded-2xl px-4 py-4 shadow-sm">
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
      <span className="text-sm text-textHeading">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full transition-colors relative
          ${checked ? 'bg-primary' : 'bg-borderHairline'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
            ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
    </div>
  );
}