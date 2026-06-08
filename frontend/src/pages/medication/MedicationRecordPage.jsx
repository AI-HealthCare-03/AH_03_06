// src/pages/medication/MedicationRecordPage.jsx

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header.jsx';
import MobileFrame from '../../components/MobileFrame.jsx';
import {
  fetchCalendar,
  fetchAnalysis,
  fetchMedicationsByDate,
  takeMedication,
  undoTakeMedication,
} from '../../api/medication';

// ── 상수 ─────────────────────────────────────────────────────
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const MONTH_KO   = (m) => `${m}월`;

// ── 아이콘 SVG ───────────────────────────────────────────────
const SunIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);
const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const MoonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);
const ChevronLeft = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#09090B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6"/>
  </svg>
);
const ChevronRight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#09090B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const SLOT_ICONS = { sun: SunIcon, clock: ClockIcon, moon: MoonIcon };

// ── 달력 유틸 ─────────────────────────────────────────────────
function buildCalendarGrid(year, month) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const lastDate = new Date(year, month, 0).getDate();
  const prevLast = new Date(year, month - 1, 0).getDate();

  const cells = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: prevLast - i, cur: false });
  for (let d = 1; d <= lastDate; d++)    cells.push({ day: d, cur: true });
  const remain = 42 - cells.length;
  for (let d = 1; d <= remain; d++)      cells.push({ day: d, cur: false });
  return cells;
}

function toDateStr(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ── 복약 카드 ─────────────────────────────────────────────────
function MedCard({ med, onTake, onUndo }) {
  const isDone    = med.status === 'done';
  const isPending = med.status === 'pending';
  const isMissed  = med.status === 'missed';

  return (
    <div className={`flex items-center gap-3 bg-white border border-borderHairline rounded-2xl px-4 py-3.5 mb-2 shadow-sm
      ${isPending ? 'border border-[#DBEAFE]' : ''}`}
    >
      <div className="flex-1 min-w-0">
        <p className={`text-[14px] font-medium truncate
          ${isDone ? 'text-[#A1A1AA] line-through' : 'text-[#09090B]'}`}>
          {med.name}
        </p>
        {/* 용량 · 식사기준 */}
        <p className="text-[11px] text-[#A1A1AA] mt-0.5 truncate">{[med.dosage, med.timing].filter(Boolean).join(' · ')}</p>
      </div>

      {/* ✅ 복용하기 버튼 — 클릭 시 onTake 호출 */}
      {isPending && (
        <button
          onClick={() => onTake(med.id)}
          className="flex-shrink-0 px-3 py-1.5 bg-[#2563EB] text-white text-[11px] font-semibold rounded-lg active:opacity-80"
        >
          복용하기
        </button>
      )}

      {/* ✅ 완료 상태 — 클릭 시 취소 */}
      {isDone && (
        <button
          onClick={() => onUndo(med.id)}
          className="w-7 h-7 rounded-full bg-[#2563EB] flex items-center justify-center flex-shrink-0 active:opacity-80"
        >
          <CheckIcon />
        </button>
      )}

      {isMissed && (
        <span className="flex-shrink-0 px-3 py-1.5 bg-[#FEF2F2] text-[#DC2626] text-[11px] font-medium rounded-lg">
          패함
        </span>
      )}
      {med.status === 'scheduled' && (
        <span className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-[#E4E4E7]" />
      )}
    </div>
  );
}

// ── 분석 배너 ─────────────────────────────────────────────────
function AnalysisBanner({ periodLabel, achievementRate, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 bg-white border border-borderHairline rounded-2xl px-4 py-3.5 shadow-sm text-left"
    >
      <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#09090B]">기간별 복약 분석</p>
        <p className="text-[11px] text-[#71717A] mt-0.5">
          {periodLabel} 복약 달성률 <span className="text-[#2563EB] font-semibold">{achievementRate}%</span>
        </p>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </button>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export default function MedicationRecordPage() {
  const navigate = useNavigate();
  const now      = new Date();

  const [year,       setYear]       = useState(now.getFullYear());
  const [month,      setMonth]      = useState(now.getMonth() + 1);
  const [selected,   setSelected]   = useState(now.getDate());
  const [calData,    setCalData]    = useState(null);
  const [analysis,   setAnalysis]   = useState(null);
  const [dayData,    setDayData]    = useState(null);
  const [dayLoading, setDayLoading] = useState(false);

  // ── 달력 로드 ──
  useEffect(() => {
    fetchCalendar(year, month)
      .then(res => setCalData(res.data ?? res))
      .catch(console.error);
  }, [year, month]);

  // ── 분석 로드 (1회) ──
  useEffect(() => {
    fetchAnalysis()
      .then(res => setAnalysis(res.data ?? res))
      .catch(console.error);
  }, []);

  // ── 날짜별 복약 목록 로드 ──
  useEffect(() => {
    const dateStr = toDateStr(year, month, selected);
    setDayLoading(true);
    fetchMedicationsByDate(dateStr)
      .then(res => setDayData(res.data ?? res))
      .catch(() => setDayData(null))
      .finally(() => setDayLoading(false));
  }, [year, month, selected]);

  // ── 월 이동 ──
  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1);
    setSelected(1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1);
    setSelected(1);
  };

  // ── ✅ 복용하기 — 로컬 상태 즉시 업데이트 ──
  const handleTake = useCallback(async (medId) => {
    // UI 즉시 반영
    setDayData(prev => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        timeSlots: prev.timeSlots.map(slot => ({
          ...slot,
          medications: slot.medications.map(m =>
            m.id === medId ? { ...m, status: 'done' } : m
          ),
        })),
      };
      // doneCount 재계산
      const doneCount = updated.timeSlots
        .flatMap(s => s.medications)
        .filter(m => m.status === 'done').length;
      return { ...updated, doneCount };
    });

    // 백엔드 반영(영속화)
    try {
      const dateStr = toDateStr(year, month, selected);
      await takeMedication(dateStr, medId);
    } catch (e) {
      console.error(e);
    }
  }, [year, month, selected]);

  // ── ✅ 복용 취소 — 로컬 상태 즉시 업데이트 ──
  const handleUndo = useCallback(async (medId) => {
    setDayData(prev => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        timeSlots: prev.timeSlots.map(slot => ({
          ...slot,
          medications: slot.medications.map(m =>
            m.id === medId ? { ...m, status: 'pending' } : m
          ),
        })),
      };
      const doneCount = updated.timeSlots
        .flatMap(s => s.medications)
        .filter(m => m.status === 'done').length;
      return { ...updated, doneCount };
    });

    try {
      const dateStr = toDateStr(year, month, selected);
      await undoTakeMedication(dateStr, medId);
    } catch (e) {
      console.error(e);
    }
  }, [year, month, selected]);

  const cells      = buildCalendarGrid(year, month);
  const doneDays   = new Set(calData?.doneDays   ?? []);
  const missedDays = new Set(calData?.missedDays ?? []);

  return (
    <MobileFrame
      contentBg="white"
      header={<Header variant="back" title="복약 기록" />}
    >
        <div className="px-4 py-4 space-y-3">

        {/* 달력 카드 */}
        <div className="bg-white border border-borderHairline rounded-2xl px-4 py-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-[#F4F4F5]"><ChevronLeft /></button>
            <span className="text-[15px] font-semibold text-[#09090B]">{year}년 {MONTH_KO(month)}</span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-[#F4F4F5]"><ChevronRight /></button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {DAY_LABELS.map((d, i) => (
              <div key={d} className={`text-center text-[11px] font-medium py-1
                ${i === 0 ? 'text-[#EF4444]' : i === 6 ? 'text-[#2563EB]' : 'text-[#A1A1AA]'}`}>
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((cell, idx) => {
              const col    = idx % 7;
              const isSun  = col === 0;
              const isSat  = col === 6;
              const isSel  = cell.cur && cell.day === selected;
              const isDone = cell.cur && doneDays.has(cell.day);
              const isMiss = cell.cur && missedDays.has(cell.day);

              return (
                <button
                  key={idx}
                  onClick={() => cell.cur && setSelected(cell.day)}
                  disabled={!cell.cur}
                  className={`flex flex-col items-center py-1 rounded-xl transition-colors
                    ${isSel ? 'bg-[#2563EB]' : cell.cur ? 'hover:bg-[#F4F4F5]' : ''}`}
                >
                  <span className={`text-[13px] font-medium w-7 h-7 flex items-center justify-center rounded-full
                    ${!cell.cur ? 'text-[#D4D4D8]' : isSel ? 'text-white' : isSun ? 'text-[#EF4444]' : isSat ? 'text-[#2563EB]' : 'text-[#09090B]'}`}>
                    {cell.day}
                  </span>
                  {cell.cur && (isDone || isMiss) && (
                    <span className={`w-1 h-1 rounded-full mt-0.5
                      ${isSel ? 'bg-white/60' : isDone ? 'bg-[#2563EB]' : 'bg-[#A1A1AA]'}`} />
                  )}
                  {cell.cur && !isDone && !isMiss && <span className="h-1.5 mt-0.5" />}
                </button>
              );
            })}
          </div>

          <div className="flex gap-4 justify-center mt-3 pt-3 border-t border-[#F4F4F5]">
            <span className="flex items-center gap-1.5 text-[11px] text-[#71717A]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] inline-block" /> 성실
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-[#71717A]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A1A1AA] inline-block" /> 누락
            </span>
          </div>
        </div>

        {/* 분석 배너 */}
        {analysis && (
          <AnalysisBanner
            periodLabel={analysis.periodLabel}
            achievementRate={analysis.achievementRate}
            onClick={() => navigate('/medication/dashboard')}
          />
        )}

        {/* 날짜별 복약 목록 */}
        {dayLoading && (
          <div className="py-6 text-center text-sm text-[#71717A]">불러오는 중...</div>
        )}

        {!dayLoading && dayData && (
          <div>
            <div className="flex items-center justify-between px-1 py-2">
              <h2 className="text-[15px] font-semibold text-[#09090B]">{dayData.dateLabel}</h2>
              <span className="text-[11px] font-semibold text-[#16A34A] bg-[#F0FDF4] px-3 py-1 rounded-full">
                {dayData.doneCount}/{dayData.totalCount} 완료
              </span>
            </div>

            {dayData.timeSlots?.map((slot) => {
              const Icon = SLOT_ICONS[slot.icon] ?? ClockIcon;
              return (
                <div key={slot.id} className="mb-1">
                  <div className="flex items-center gap-1.5 px-1 py-2 text-[12px] text-[#A1A1AA]">
                    <Icon />
                    <span>{slot.label} {slot.time}</span>
                  </div>
                  {slot.medications?.map((med) => (
                    <MedCard
                      key={med.id}
                      med={med}
                      onTake={handleTake}
                      onUndo={handleUndo}
                    />
                  ))}
                </div>
              );
            })}

            <div className="flex gap-4 justify-center py-4">
              <span className="flex items-center gap-1.5 text-[11px] text-[#71717A]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] inline-block" /> 처방약
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-[#71717A]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#A1A1AA] inline-block" /> 일반의약품
              </span>
            </div>
          </div>
        )}

        {!dayLoading && !dayData && (
          <div className="py-10 text-center text-sm text-[#A1A1AA]">
            해당 날짜의 복약 기록이 없어요
          </div>
        )}
        <div className="h-6" />
        </div>
    </MobileFrame>
  );
}
