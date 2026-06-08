// src/pages/medication/MedicationHistoryPage.jsx
// GET /schedules?start_date=&end_date= — 복약 이력 기간별 조회

import { useState, useCallback } from 'react';
import Header from '../../components/Header.jsx';
import MobileFrame from '../../components/MobileFrame.jsx';
import { fetchScheduleHistory, mealFromFrequency } from '../../api/medication';
import { exportMedicationHistory } from '../../api/medicationHistories.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClockRotateLeft, faDownload } from '@fortawesome/free-solid-svg-icons';

// ── 상수 ─────────────────────────────────────────────────────
const QUICK_RANGES = [
  { label: '7일',  days: 7  },
  { label: '14일', days: 14 },
  { label: '30일', days: 30 },
  { label: '90일', days: 90 },
];

const STATUS_META = {
  taken:   { label: '완료',   bg: 'bg-[#EFF6FF]', text: 'text-[#2563EB]',  dot: 'bg-[#2563EB]'  },
  missed:  { label: '누락',   bg: 'bg-[#FEF2F2]', text: 'text-[#DC2626]',  dot: 'bg-[#EF4444]'  },
  pending: { label: '예정',   bg: 'bg-[#F4F4F5]', text: 'text-[#71717A]',  dot: 'bg-[#A1A1AA]'  },
};

// ── 유틸 ─────────────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10);

const addDays = (dateStr, n) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const fmtDate = (dateStr) => {
  const d   = new Date(dateStr);
  const day = ['일','월','화','수','목','금','토'][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}(${day})`;
};

const fmtTime = (isoStr) => {
  if (!isoStr) return null;
  const d = new Date(isoStr);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h < 12 ? '오전' : '오후';
  return `${ampm} ${h % 12 || 12}:${m}`;
};

// ISO(UTC+Z) → 로컬(KST) 'YYYY-MM-DD'. 시각 표시와 같은 기준으로 묶어 새벽 복용이 전날로 새지 않게.
const kstDateKey = (iso) => {
  if (!iso) return 'unknown';
  const d = new Date(iso);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

// 날짜별로 records 그룹화 (KST 기준, 완료 시각 우선)
const groupByDate = (records) => {
  const map = {};
  for (const r of records) {
    const dateKey = kstDateKey(r.checked_at ?? r.created_at);
    if (!map[dateKey]) map[dateKey] = [];
    map[dateKey].push(r);
  }
  // 날짜 내림차순
  return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
};

// ── 서브 컴포넌트 ─────────────────────────────────────────────

function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending;
  return (
    <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${meta.bg} ${meta.text}`}>
      {meta.label}
    </span>
  );
}

// HistoryRecord 컴포넌트 수정
function HistoryRecord({ record }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-[#F4F4F5] last:border-0">
      <span className="w-2 h-2 rounded-full flex-shrink-0 bg-[#2563EB]" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[#09090B] truncate">{record.drug_name}</p>
        <p className="text-[11px] text-[#A1A1AA] mt-0.5">
          {/* 용량 · 식사기준(frequency 정규화). 백엔드 _meal_from_frequency와 어휘 동기화 */}
          {[record.dosage, mealFromFrequency(record.frequency)].filter(Boolean).join(' · ')}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-[11px] text-[#71717A]">{fmtTime(record.checked_at ?? record.created_at)}</p>
        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#EFF6FF] text-[#2563EB]">
          완료
        </span>
      </div>
    </div>
  )
}

function DateSection({ dateStr, records }) {
  const taken  = records.length;
  const total  = records.length;
  const rate   = total > 0 ? 100 : 0;

  const rateColor =
    rate >= 80 ? 'text-[#2563EB] bg-[#EFF6FF]' :
    rate >= 50 ? 'text-[#D97706] bg-[#FFFBEB]' :
                 'text-[#DC2626] bg-[#FEF2F2]';

  return (
    <div className="bg-white border border-borderHairline rounded-2xl px-4 py-1 shadow-sm mb-3">
      {/* 날짜 헤더 */}
      <div className="flex items-center justify-between py-3 border-b border-[#F4F4F5]">
        <span className="text-[13px] font-semibold text-[#09090B]">{fmtDate(dateStr)}</span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#A1A1AA]">{taken}/{total}회</span>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${rateColor}`}>
            {rate}%
          </span>
        </div>
      </div>

      {/* 기록 목록 */}
      {records.map(r => (
        <HistoryRecord key={r.id} record={r} />
      ))}
    </div>
  );
}

// ── 통계 요약 카드 ────────────────────────────────────────────
function SummaryCard({ records }) {
  const taken  = records.length;
  const missed = records.filter(r => r.status === 'missed').length;
  const total  = records.length;
  const rate   = 100;

  return (
    <div className="bg-white border border-borderHairline rounded-2xl px-5 py-4 shadow-sm mb-3">
      <div className="flex items-center justify-between">
        {/* 달성율 */}
        <div>
          <p className="text-[12px] text-mute mb-0.5">전체 달성율</p>
          <p className="text-[28px] font-bold text-textHeading leading-tight">
            {rate}<span className="text-[16px] font-normal text-mute">%</span>
          </p>
        </div>

        {/* 구분선 */}
        <div className="w-px h-12 bg-borderLight" />

        {/* 완료 */}
        <div className="text-center">
          <p className="text-[12px] text-mute mb-0.5">완료</p>
          <p className="text-[20px] font-bold text-primary">
            {taken}<span className="text-[12px] font-normal text-mute">회</span>
          </p>
        </div>

        {/* 구분선 */}
        <div className="w-px h-12 bg-borderLight" />

        {/* 누락 — 0회면 회색, 1회 이상일 때만 빨강 */}
        <div className="text-center">
          <p className="text-[12px] text-mute mb-0.5">누락</p>
          <p className={`text-[20px] font-bold ${missed > 0 ? 'text-error' : 'text-mute'}`}>
            {missed}<span className="text-[12px] font-normal text-mute">회</span>
          </p>
        </div>

        {/* 구분선 */}
        <div className="w-px h-12 bg-borderLight" />

        {/* 총 횟수 */}
        <div className="text-center">
          <p className="text-[12px] text-mute mb-0.5">총 횟수</p>
          <p className="text-[20px] font-bold text-textHeading">
            {total}<span className="text-[12px] font-normal text-mute">회</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export default function MedicationHistoryPage() {

  const [startDate, setStartDate] = useState(addDays(today(), -6));
  const [endDate,   setEndDate]   = useState(today());
  const [records,   setRecords]   = useState(null);   // null = 미조회
  const [loading,   setLoading]   = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [error,     setError]     = useState('');

  // ── 빠른 기간 선택 ──
  const applyQuickRange = (days) => {
    const end   = today();
    const start = addDays(end, -(days - 1));
    setStartDate(start);
    setEndDate(end);
    setRecords(null);
  };

  // ── 조회 ──
  const handleSearch = useCallback(async () => {
    setError('');
    if (!startDate || !endDate) { setError('기간을 선택해 주세요.'); return; }
    if (startDate > endDate)    { setError('시작일이 종료일보다 늦을 수 없어요.'); return; }

    try {
      setLoading(true);
      const res = await fetchScheduleHistory(startDate, endDate);
      const data = res.data ?? res;
      setRecords(data.items ?? []);
    } catch (e) {
      console.error(e);
      setError('이력을 불러오지 못했어요. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  // ── CSV 다운로드 (조회에 쓴 기간 그대로 재사용) ──
  const handleDownloadCsv = async () => {
    setError('');
    try {
      setCsvLoading(true);
      const blob = await exportMedicationHistory(startDate, endDate);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `medication_history_${startDate}_${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      setError('CSV 다운로드에 실패했어요. 다시 시도해 주세요.');
    } finally {
      setCsvLoading(false);
    }
  };

  const grouped = records ? groupByDate(records) : [];

  return (
    <MobileFrame
      contentBg="white"
      header={<Header variant="back" title="복약 이력 조회" />}
    >
      <div className="px-4 py-4 space-y-3">

        {/* ── 기간 선택 카드 ── */}
        <div className="bg-white border border-borderHairline rounded-2xl px-4 py-4 shadow-sm">
          {/* 헤더 — 다운로드 카드와 동일 톤(아이콘+제목+부제) */}
          <div className="flex items-start gap-2 mb-3">
            <FontAwesomeIcon icon={faClockRotateLeft} className="text-[#71717A] text-[14px] mt-0.5" />
            <div>
              <h2 className="text-[15px] font-semibold text-[#09090B] leading-tight">조회 기간</h2>
              <p className="text-[11px] text-[#A1A1AA] mt-1 leading-tight">기간을 선택해 복약 기록을 확인하세요</p>
            </div>
          </div>

          {/* 빠른 선택 */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {QUICK_RANGES.map(({ label, days }) => {
              const end   = today();
              const start = addDays(end, -(days - 1));
              const isActive = startDate === start && endDate === end;
              return (
                <button
                  key={days}
                  onClick={() => applyQuickRange(days)}
                  className={`w-full py-1.5 rounded-lg text-sm font-medium transition-colors
                    ${isActive
                      ? 'bg-primary text-white'
                      : 'bg-borderLight text-subtext hover:bg-borderHairline'}`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* 직접 날짜 입력 */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={e => { setStartDate(e.target.value); setRecords(null); }}
              className="flex-1 min-w-0 border border-borderHairline rounded-xl px-3 py-2.5 text-sm text-textHeading focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="text-[#A1A1AA] text-sm flex-shrink-0">~</span>
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={today()}
              onChange={e => { setEndDate(e.target.value); setRecords(null); }}
              className="flex-1 min-w-0 border border-borderHairline rounded-xl px-3 py-2.5 text-sm text-textHeading focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* 조회 버튼 */}
          <button
            onClick={handleSearch}
            disabled={loading}
            className="w-full mt-3 py-3 bg-[#2563EB] text-white rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {loading ? '조회 중...' : '이력 조회'}
          </button>
        </div>

        {/* ── 에러 ── */}
        {error && (
          <p className="text-center text-sm text-[#DC2626] py-2">{error}</p>
        )}

        {/* ── 결과 ── */}
        {records !== null && !loading && (
          <>
            {records.length === 0 ? (
              <div className="py-12 text-center text-sm text-mute">
                해당 기간의 복약 이력이 없어요
              </div>
            ) : (
              <>
                {/* CSV 다운로드 — 조회 기간 그대로 재사용 (작은 버튼) */}
                <div className="flex justify-end">
                  <button
                    onClick={handleDownloadCsv}
                    disabled={csvLoading}
                    className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary disabled:opacity-50"
                  >
                    <FontAwesomeIcon icon={faDownload} className="text-[12px]" />
                    {csvLoading ? '다운로드 중…' : 'CSV 다운로드'}
                  </button>
                </div>

                {/* 요약 */}
                <SummaryCard records={records} />

                {/* 날짜별 목록 */}
                {grouped.map(([dateStr, recs]) => (
                  <DateSection key={dateStr} dateStr={dateStr} records={recs} />
                ))}
              </>
            )}
          </>
        )}

        {/* ── 초기 안내 (미조회 상태) ── */}
        {records === null && !loading && (
          <div className="py-12 text-center">
            <div className="w-12 h-12 bg-[#EFF6FF] rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <p className="text-sm text-[#71717A]">기간을 선택하고 조회해 보세요</p>
          </div>
        )}

        <div className="h-4" />
      </div>
    </MobileFrame>
  );
}
