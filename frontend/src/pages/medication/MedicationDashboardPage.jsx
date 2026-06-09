// src/pages/medication/MedicationDashboardPage.jsx
// GET /dashboard?period=weekly|monthly — 복약 완료율 대시보드
// MedicationRecordPage의 분석 배너 클릭 시 진입

import { useState, useEffect } from 'react';
import Header from '../../components/Header.jsx';
import MobileFrame from '../../components/MobileFrame.jsx';
import { fetchDashboard } from '../../api/medication';

// ── 상수 ────────────────────────────────────────────────────
const PERIODS = [
  { value: 'weekly',  label: '주간' },
  { value: 'monthly', label: '월간' },
];

const DAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

// ── 유틸 ────────────────────────────────────────────────────
const fmtDate = (dateStr) => {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}(${DAY_KO[d.getDay()]})`;
};

const rateColor = (rate) => {
  if (rate >= 80) return '#2563EB';
  if (rate >= 50) return '#F59E0B';
  return '#EF4444';
};

const rateBg = (rate) => {
  if (rate >= 80) return 'bg-[#EFF6FF] text-[#2563EB]';
  if (rate >= 50) return 'bg-[#FFFBEB] text-[#D97706]';
  return 'bg-[#FEF2F2] text-[#DC2626]';
};

// ── 도넛 차트 (SVG) ─────────────────────────────────────────
function DonutChart({ rate, size = 120 }) {
  const r = 44;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const filled = (rate / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* 배경 트랙 */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E4E4E7" strokeWidth="12" />
      {/* 진행 호 */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={rateColor(rate)}
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference - filled}`}
        strokeDashoffset={circumference / 4}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      {/* 중앙 텍스트 */}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="22" fontWeight="700" fill="#09090B">
        {rate}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="11" fill="#71717A">
        %
      </text>
    </svg>
  );
}

// ── 일별 바 차트 ─────────────────────────────────────────────
function DailyBarChart({ dailyRates, period }) {
  const max = 100;
  const barW = period === 'weekly' ? 32 : 8;
  const gap  = period === 'weekly' ? 8  : 3;
  const totalW = dailyRates.length * (barW + gap) - gap;

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: totalW + 32 }} className="px-4">
        {/* 바 그래프 */}
        <div className="flex items-end gap-0" style={{ gap }}>
          {dailyRates.map((d) => {
            const h = Math.max(4, Math.round((d.rate / max) * 80));
            return (
              <div key={d.date} className="flex flex-col items-center" style={{ width: barW }}>
                {/* 높이 표시 (주간만) */}
                {period === 'weekly' && d.rate > 0 && (
                  <span className="text-[9px] text-[#71717A] mb-0.5">{d.rate}%</span>
                )}
                <div
                  style={{
                    height: h,
                    width: barW,
                    backgroundColor: rateColor(d.rate),
                    borderRadius: 4,
                    transition: 'height 0.4s ease',
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* X축 라벨 (주간만) */}
        {period === 'weekly' && (
          <div className="flex mt-1.5" style={{ gap }}>
            {dailyRates.map((d) => (
              <div key={d.date} className="text-center text-[10px] text-[#71717A]" style={{ width: barW }}>
                {fmtDate(d.date).split('(')[1]?.replace(')', '') ?? ''}
              </div>
            ))}
          </div>
        )}

        {/* X축 라벨 (월간: 1일·15일·말일만) */}
        {period === 'monthly' && (
          <div className="flex mt-1.5" style={{ gap }}>
            {dailyRates.map((d, i) => {
              const day = parseInt(d.date.slice(8));
              const show = day === 1 || day === 15 || i === dailyRates.length - 1;
              return (
                <div key={d.date} className="text-center text-[10px] text-[#71717A]" style={{ width: barW }}>
                  {show ? `${day}일` : ''}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 약별 달성율 행 ───────────────────────────────────────────
function MedRateRow({ med }) {
  return (
    <div className="flex items-center gap-3">
      {/* 약 이름 */}
      <span className="w-32 text-[13px] text-[#09090B] truncate">{med.name}</span>

      {/* 프로그레스 바 */}
      <div className="flex-1 h-2 bg-[#F4F4F5] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${med.rate}%`, backgroundColor: rateColor(med.rate) }}
        />
      </div>

      {/* 달성율 + 횟수 */}
      <div className="text-right">
        <span className={`text-[12px] font-semibold px-2 py-0.5 rounded-full ${rateBg(med.rate)}`}>
          {med.rate}%
        </span>
        <p className="text-[10px] text-[#A1A1AA] mt-0.5">{med.taken}/{med.total}회</p>
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ────────────────────────────────────────────
export default function MedicationDashboardPage() {
  const [period,  setPeriod]  = useState('weekly');
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetchDashboard(period);
        if (!cancelled) setData(res.data ?? res);
      } catch (e) {
        if (!cancelled) setError('데이터를 불러오지 못했어요.');
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [period]);

  // ── 기간 라벨 ──
  const periodLabel = (() => {
    if (!data?.daily_rates?.length) return '';
    const dates = data.daily_rates.map(d => d.date);
    const start = fmtDate(dates[0]);
    const end   = fmtDate(dates[dates.length - 1]);
    return `${start} ~ ${end}`;
  })();

  return (
    <MobileFrame
      contentBg="white"
      header={<Header variant="back" title="복약 달성 현황" />}
    >

      {/* ── 기간 탭 ── */}
      <div className="bg-white px-4 pt-3 pb-0 border-b border-[#E4E4E7]">
        <div className="flex gap-0">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`flex-1 py-2.5 text-[14px] font-medium border-b-2 transition-colors
                ${period === p.value
                  ? 'border-[#2563EB] text-[#2563EB]'
                  : 'border-transparent text-[#A1A1AA]'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 본문 ── */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <span className="text-[#71717A] text-sm">불러오는 중...</span>
        </div>
      )}

      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="text-[#09090B] text-sm">{error}</p>
          <button
            onClick={() => setPeriod(p => p)}
            className="text-[#2563EB] text-sm"
          >
            다시 시도
          </button>
        </div>
      )}

      {data && !loading && (
        <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">

          {/* ── 카드 1: 전체 달성율 ── */}
          <div className="bg-white border border-borderHairline rounded-2xl px-5 py-5 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[13px] font-semibold text-[#71717A] uppercase tracking-wide">
                전체 달성율
              </h2>
              <span className="text-[11px] text-[#A1A1AA]">{periodLabel}</span>
            </div>

            <div className="flex items-center gap-6 mt-4">
              {/* 도넛 */}
              <DonutChart rate={data.overall_rate} size={120} />

              {/* 요약 */}
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-[11px] text-[#71717A]">총 복약 달성율</p>
                  <p className="text-[28px] font-bold text-[#09090B] leading-tight">
                    {data.overall_rate}
                    <span className="text-[16px] font-normal text-[#71717A]">%</span>
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 bg-[#EFF6FF] rounded-xl px-3 py-2 text-center">
                    <p className="text-[10px] text-[#71717A]">완료</p>
                    <p className="text-[16px] font-bold text-[#2563EB]">
                      {data.daily_rates?.reduce((s, d) => s + d.taken, 0) ?? 0}
                      <span className="text-[10px] font-normal">회</span>
                    </p>
                  </div>
                  <div className="flex-1 bg-[#F4F4F5] rounded-xl px-3 py-2 text-center">
                    <p className="text-[10px] text-[#71717A]">전체</p>
                    <p className="text-[16px] font-bold text-[#09090B]">
                      {data.daily_rates?.reduce((s, d) => s + d.total, 0) ?? 0}
                      <span className="text-[10px] font-normal">회</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── 카드 2: 일별 복약 완료율 ── */}
          {data.daily_rates?.length > 0 && (
            <div className="bg-white border border-borderHairline rounded-2xl px-5 py-5 shadow-sm">
              <h2 className="text-[13px] font-semibold text-[#71717A] uppercase tracking-wide mb-4">
                일별 완료율
              </h2>
              <DailyBarChart dailyRates={data.daily_rates} period={period} />

              {/* 범례 */}
              <div className="flex gap-4 mt-3 justify-end">
                {[['#2563EB', '80% 이상'], ['#F59E0B', '50~79%'], ['#EF4444', '50% 미만']].map(([color, label]) => (
                  <span key={label} className="flex items-center gap-1 text-[10px] text-[#71717A]">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: color }} />
                    {label}
                  </span>
                ))}
              </div>

              {/* 주간: 날짜별 간략 목록 */}
              {period === 'weekly' && (
                <div className="mt-4 space-y-2 border-t border-[#F4F4F5] pt-3">
                  {data.daily_rates.map((d) => (
                    <div key={d.date} className="flex items-center justify-between">
                      <span className="text-[12px] text-[#71717A]">{fmtDate(d.date)}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-[#A1A1AA]">{d.taken}/{d.total}회</span>
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${rateBg(d.rate)}`}>
                          {d.rate}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── 카드 3: 약별 달성율 ── */}
          {data.medication_rates?.length > 0 && (
            <div className="bg-white border border-borderHairline rounded-2xl px-5 py-5 shadow-sm">
              <h2 className="text-[13px] font-semibold text-[#71717A] uppercase tracking-wide mb-4">
                약별 달성율
              </h2>
              <div className="space-y-4">
                {data.medication_rates.map((med) => (
                  <MedRateRow key={med.id} med={med} />
                ))}
              </div>
            </div>
          )}

          {/* ── 하단 여백 ── */}
          <div className="h-4" />
        </div>
      )}
    </MobileFrame>
  );
}
