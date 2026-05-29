// ============================================================
// pages/medication/MedicationRecordPage.jsx
// 복약 기록 (달력) 화면 - 기존 MedicationPage.jsx와 별개 파일
//
// 진입 예시 (기존 MedicationPage에서 라우팅):
//   navigate('/medication/record')
//   또는 MedicationPage 내부에서 view 상태로 전환
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
  fetchCalendar,
  fetchAnalysis,
  fetchMedicationsByDate,
  takeMedication,
} from '../../api/medication.js';
import { useNavigate } from 'react-router-dom';

// ── 유틸 ──────────────────────────────────────────────────────
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

const toDateStr = (year, month, day) =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

// ── 서브 컴포넌트: 달력 ───────────────────────────────────────

function Calendar({ year, month, doneDays, missedDays, selectedDay, onSelectDay }) {
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const daysInMonth    = new Date(year, month, 0).getDate();
  const prevMonthDays  = new Date(year, month - 1, 0).getDate();

  const cells = [];
  for (let i = firstDayOfWeek - 1; i >= 0; i--)
    cells.push({ day: prevMonthDays - i, currentMonth: false });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ day: d, currentMonth: true });
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7)
    for (let d = 1; d <= remaining; d++)
      cells.push({ day: d, currentMonth: false });

  return (
    <div className="bg-white rounded-[14px] mx-2 p-4 border border-[#E4E4E7] shadow-sm">
      {/* 달력 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <button className="p-1 text-[#A1A1AA] hover:text-[#52525B]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="text-[15px] font-[600] text-[#09090B]">{year}년 {month}월</span>
        <button className="p-1 text-[#A1A1AA] hover:text-[#52525B]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((d, i) => (
          <div key={d} className={`text-center text-[11px] font-[600] py-1
            ${i === 0 ? 'text-red-400' : i === 6 ? 'text-[#2563EB]' : 'text-[#A1A1AA]'}`}>
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 셀 */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map(({ day, currentMonth }, idx) => {
          const colIndex  = idx % 7;
          const isSelected = currentMonth && day === selectedDay;
          const isDone    = currentMonth && doneDays.includes(day);
          const isMissed  = currentMonth && missedDays.includes(day);

          return (
            <button
              key={idx}
              onClick={() => currentMonth && onSelectDay(day)}
              className="flex flex-col items-center py-1 min-h-[36px] rounded-[8px] focus:outline-none"
            >
              <span className={[
                'text-[13px] w-[22px] h-[22px] flex items-center justify-center rounded-full leading-none',
                !currentMonth  ? 'text-[#D4D4D8]'
                : isSelected   ? 'bg-[#2563EB] text-white font-[700]'
                : colIndex === 0 ? 'text-red-400'
                : colIndex === 6 ? 'text-[#2563EB]'
                : 'text-[#09090B]',
              ].join(' ')}>
                {day}
              </span>
              {(isDone || isMissed) && (
                <span className={`w-1 h-1 rounded-full mt-0.5 ${isDone ? 'bg-[#2563EB]' : 'bg-[#D4D4D8]'}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="flex gap-4 justify-center mt-3">
        <span className="flex items-center gap-1.5 text-[11px] text-[#A1A1AA]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] inline-block" />완료
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-[#A1A1AA]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D4D4D8] inline-block" />누락
        </span>
      </div>
    </div>
  );
}

// ── 서브 컴포넌트: 분석 배너 ──────────────────────────────────

function AnalysisBanner({ periodLabel, achievementRate }) {
  return (
    <div className="mx-2 my-2 bg-[#EFF6FF] border border-[#BFDBFE] rounded-[14px] px-4 py-3 flex items-center gap-3 cursor-pointer">
      <div className="w-9 h-9 bg-white rounded-[10px] flex items-center justify-center text-[#2563EB] shrink-0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      </div>
      <div>
        <p className="text-[13px] font-[700] text-[#1D4ED8]">기간별 복약 분석</p>
        <p className="text-[11px] text-[#3B82F6] mt-0.5">{periodLabel} 복약 달성율 {achievementRate}%</p>
      </div>
      <svg className="w-4 h-4 text-[#93C5FD] ml-auto shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 18l6-6-6-6" />
      </svg>
    </div>
  );
}

// ── 서브 컴포넌트: 복약 카드 ──────────────────────────────────

const TimeIcon = {
  sun: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  ),
  clock: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  moon: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
};

function MedCard({ med, dateStr, onTake }) {
  const [loading, setLoading] = useState(false);

  const handleTake = async () => {
    setLoading(true);
    await onTake(dateStr, med.id);
    setLoading(false);
  };

  return (
    <div className={[
      'bg-white rounded-[14px] border flex items-center gap-2.5 px-3.5 py-3 mb-1.5 shadow-sm',
      med.status === 'pending'
        ? 'border-l-[3px] border-l-[#2563EB] border-t-[#E4E4E7] border-r-[#E4E4E7] border-b-[#E4E4E7] rounded-l-none'
        : 'border-[#E4E4E7]',
    ].join(' ')}>
      {/* 약 아이콘 */}
      <div className="w-9 h-9 rounded-[10px] bg-[#F4F4F5] flex items-center justify-center shrink-0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v3" />
          <circle cx="18" cy="18" r="3" /><path d="M22 22l-1.5-1.5" />
        </svg>
      </div>

      {/* 텍스트 */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-[600] text-[#09090B] truncate">{med.name}</p>
        <p className="text-[11px] text-[#71717A] mt-0.5">{med.dosage} · {med.category} · {med.timing}</p>
      </div>

      {/* 상태 */}
      <div className="shrink-0">
        {med.status === 'done' && (
          <div className="w-6 h-6 rounded-full border border-[#E4E4E7] bg-[#F4F4F5] flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}
        {med.status === 'pending' && (
          <button
            onClick={handleTake}
            disabled={loading}
            className="bg-[#2563EB] text-white text-[12px] font-[600] px-3.5 py-1.5 rounded-full disabled:opacity-60 active:scale-95 transition-transform"
          >
            {loading ? '처리 중...' : '복용하기'}
          </button>
        )}
        {med.status === 'scheduled' && (
          <span className="text-[11px] text-[#A1A1AA] bg-[#F4F4F5] px-2.5 py-1 rounded-full">예정</span>
        )}
      </div>
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────

export default function MedicationRecordPage({ onBack }) {
  const navigate = useNavigate()
  const handleBack = onBack ?? (() => navigate(-1))
  const [calendar,    setCalendar]    = useState(null);
  const [analysis,    setAnalysis]    = useState(null);
  const [dayData,     setDayData]     = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  const YEAR = 2026, MONTH = 5;

  // 초기 로드
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [calRes, anaRes] = await Promise.all([
          fetchCalendar(YEAR, MONTH),
          fetchAnalysis(),
        ]);
        if (!calRes.success) throw new Error(calRes.message);
        setCalendar(calRes.data);
        setAnalysis(anaRes.data);
        setSelectedDay(calRes.data?.selectedDay ?? new Date().getDate());
      } catch {
        setError('데이터를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // 날짜 변경 시 복약 목록 로드
  useEffect(() => {
    if (!selectedDay) return;
    const dateStr = toDateStr(YEAR, MONTH, selectedDay);
    fetchMedicationsByDate(dateStr).then((res) => {
      setDayData(res.success ? res.data : null);
    });
  }, [selectedDay]);

  // 복용하기 - 낙관적 업데이트
  const handleTake = useCallback(async (dateStr, medId) => {
    const res = await takeMedication(dateStr, medId);
    if (!res.success) return;
    setDayData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        doneCount: prev.doneCount + 1,
        timeSlots: prev.timeSlots.map((slot) => ({
          ...slot,
          medications: slot.medications.map((m) =>
            m.id === medId ? { ...m, status: 'done' } : m
          ),
        })),
      };
    });
  }, []);

  return (
    <div className="bg-[#FAFAFA] w-full min-h-[100dvh] flex justify-center">
      <div className="w-full bg-[#FAFAFA] relative flex flex-col min-h-[100dvh] mx-auto md:max-w-[480px] pb-10">

        {/* 헤더 */}
        <div className="flex items-center justify-center px-5 pt-5 pb-3 relative bg-[#FAFAFA]">
          <button onClick={handleBack} className="absolute left-5 text-[#09090B]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 className="text-[17px] font-[700] text-[#09090B]">복약 기록</h1>
        </div>

        {/* 로딩 */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* 에러 */}
        {error && <p className="text-center text-[14px] text-red-400 py-8">{error}</p>}

        {!loading && !error && (
          <>
            {/* 달력 */}
            {calendar && (
              <div className="mt-2">
                <Calendar
                  year={YEAR}
                  month={MONTH}
                  doneDays={calendar.doneDays}
                  missedDays={calendar.missedDays}
                  selectedDay={selectedDay}
                  onSelectDay={setSelectedDay}
                />
              </div>
            )}

            {/* 분석 배너 */}
            {analysis && (
              <AnalysisBanner
                periodLabel={analysis.periodLabel}
                achievementRate={analysis.achievementRate}
              />
            )}

            {/* 날짜별 복약 목록 */}
            {dayData && (
              <section className="mt-1 px-2">
                <div className="flex items-center justify-between px-2 py-3">
                  <h2 className="text-[15px] font-[700] text-[#09090B]">{dayData.dateLabel}</h2>
                  <span className="text-[11px] font-[600] text-[#16A34A] bg-[#F0FDF4] px-3 py-1 rounded-full">
                    {dayData.doneCount}/{dayData.totalCount} 완료
                  </span>
                </div>

                {dayData.timeSlots.map((slot) => (
                  <div key={slot.id} className="mb-2">
                    <div className="flex items-center gap-1.5 px-1 pb-1.5 text-[12px] text-[#71717A]">
                      {TimeIcon[slot.icon]}
                      <span>{slot.label} {slot.time}</span>
                    </div>
                    {slot.medications.map((med) => (
                      <MedCard
                        key={med.id}
                        med={med}
                        dateStr={dayData.date}
                        onTake={handleTake}
                      />
                    ))}
                  </div>
                ))}

                {/* 하단 범례 */}
                <div className="flex gap-4 justify-center py-3">
                  <span className="flex items-center gap-1.5 text-[11px] text-[#A1A1AA]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] inline-block" />처방약
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] text-[#A1A1AA]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#A1A1AA] inline-block" />일반약·영양제
                  </span>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
