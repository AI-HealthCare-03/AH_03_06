// components/SafetyCheckSection.jsx
// 진료기록 상세의 "복약 안전 점검" 섹션 — 처방 묶음의 DUR 경고를 레벨별로 표시.
// 데이터: GET /medical-records/{id}/safety-check. record 상세 로드와 독립적으로 비동기 조회.

import { useEffect, useState } from 'react'
import { fetchSafetyCheck } from '../api/safetyCheck.js'

// 레벨별 스타일 (BLOCK=차단/red, WARN=주의/amber, INFO=참고/blue)
const LEVEL_STYLE = {
  BLOCK: { box: 'bg-red-50 border-red-200', text: 'text-red-700', icon: '🚫', label: '함께 복용 주의' },
  WARN:  { box: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: '⚠️', label: '확인 필요' },
  INFO:  { box: 'bg-blue-50 border-blue-200', text: 'text-blue-700', icon: 'ⓘ', label: '참고' },
}

export default function SafetyCheckSection({ recordId }) {
  const [state, setState] = useState({ loading: true, error: null, data: null })

  // 부모가 key={recordId} 로 렌더해 record 전환 시 재마운트(초기 loading 상태) → 여기선 조회만.
  useEffect(() => {
    let alive = true
    fetchSafetyCheck(recordId)
      .then(data => { if (alive) setState({ loading: false, error: null, data }) })
      .catch(err => { if (alive) setState({ loading: false, error: err.message, data: null }) })
    return () => { alive = false }
  }, [recordId])

  const { loading, error, data } = state

  return (
    <div className="bg-white border border-neutral-100 rounded-2xl shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🛡️</span>
        <h3 className="text-sm font-bold text-neutral-900">복약 안전 점검</h3>
      </div>

      {loading && (
        <p className="text-sm text-neutral-400 py-2">안전 점검을 확인하고 있어요…</p>
      )}

      {!loading && error && (
        <p className="text-sm text-neutral-400 py-2">안전 점검을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
      )}

      {!loading && !error && data && (
        <>
          {data.alerts.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-3 py-2.5">
              <span>✅</span>
              <p className="text-sm text-green-700">함께 복용 시 특이사항이 발견되지 않았어요.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {data.alerts.map((a, i) => {
                const s = LEVEL_STYLE[a.level] ?? LEVEL_STYLE.INFO
                return (
                  <li key={i} className={`rounded-xl border px-3 py-2.5 ${s.box}`}>
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5">{s.icon}</span>
                      <div className="min-w-0">
                        <p className={`text-xs font-bold ${s.text}`}>{s.label}</p>
                        <p className="text-sm text-neutral-700 mt-0.5">{a.message}</p>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {data.skipped?.length > 0 && (
            <p className="text-[11px] text-neutral-400 mt-2">
              일부 약은 자동 점검에서 제외됐어요: {data.skipped.join(', ')}
            </p>
          )}

          <p className="text-[11px] text-neutral-400 mt-3 leading-relaxed">{data.disclaimer}</p>
        </>
      )}
    </div>
  )
}
