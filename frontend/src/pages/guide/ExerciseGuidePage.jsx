// 운동 가이드 결과(상세) 화면 — 구조화 출력 가이드의 결과 카드.
// 운동 백엔드 API 미구현 단계라 현재는 샘플 데이터로 렌더(추후 API 연결 시 props/fetch로 교체).
// 시스템 토큰(S-701) 사용. success/successSoft 토큰은 아직 미정의라 해당 부분만 raw hex.

import { useState } from 'react'
import Header from '../../components/Header.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faEllipsisVertical,
  faGaugeHigh,
  faCalendar,
  faClock,
  faCircleCheck,
  faHeartPulse,
  faDumbbell,
  faTriangleExclamation,
  faWandMagicSparkles,
  faChevronDown,
  faCircleInfo,
  faBookmark,
  faShareNodes,
} from '@fortawesome/free-solid-svg-icons'

// 샘플 데이터 — API 연결 전 결과 화면 형태 확인용
const PLAN = {
  category: '맞춤 운동 플랜',
  title: '심혈관 강화 플랜',
  intensity: '중',
  createdAt: '2026.06.01',
  frequency: '주 4회 · 회당 30~45분',
  risk: { badge: '저위험', text: '심혈관 위험도 낮음', emphasis: '유산소 운동 적합' },
  heart: { zone: '120–145', max: '185', weekly: '150–180', zoneLeft: 65, zoneRight: 22 },
  week: [
    { d: '월', on: true }, { d: '화', on: false }, { d: '수', on: true }, { d: '목', on: false },
    { d: '금', on: true }, { d: '토', on: false }, { d: '일', on: true },
  ],
  sessions: [
    { day: '월', name: '빠르게 걷기', tag: '중강도', strong: true, dur: '40분' },
    { day: '수', name: '실내 자전거', tag: '중강도', strong: true, dur: '30분' },
    { day: '금', name: '수영 (자유형)', tag: '중강도', strong: true, dur: '30분' },
    { day: '일', name: '근력 운동', tag: '저강도', strong: false, dur: '20분' },
  ],
  recommended: [
    { name: '빠르게 걷기', note: '심박수 120~135 유지', dur: '30분' },
    { name: '실내 자전거', note: '저항 레벨 3~5 권장', dur: '25분' },
    { name: '수영 (자유형)', note: '관절 부담 최소화 유산소', dur: '20분' },
    { name: '요가 (심호흡)', note: '스트레스 완화 보조', dur: '15분' },
    { name: '계단 오르기', note: '하체 근력 + 심폐 기능', dur: '10분' },
  ],
  cautions: [
    { name: '고강도 인터벌 (HIIT)', note: '심박수 급상승 위험 — 현재 단계 부적합' },
    { name: '무거운 웨이트 리프팅', note: '혈압 급등 가능성, 의사 상담 권장' },
    { name: '공복 상태 운동', note: '저혈당 위험, 식후 1시간 후 권장' },
    { name: '고온 환경 외부 운동', note: '체온 조절 부담 — 실내 운동 우선' },
  ],
  coachingPreview: [
    '현재 심혈관 위험도가 낮아 유산소 운동을 무리 없이 시작할 수 있는 단계입니다. 주 4회, 회당 30~45분의 중강도 유산소를 기본으로 권합니다.',
    '운동 중 목표 심박수(120~145 bpm)를 유지하되, 대화가 어려울 만큼 숨이 차면 강도를 한 단계 낮추는 편이 안전합니다.',
  ],
  coachingQuote: '근력 운동은 큰 근육군 위주로 가볍게, 호흡을 멈추지 않고 진행하십시오.',
  coachingMore: '4주 단위로 운동 시간을 10% 내외로 점진적으로 늘리고, 컨디션이 나쁜 날은 휴식일로 전환해도 괜찮습니다. 다음 건강검진 수치에 따라 강도 구간이 조정될 수 있습니다.',
}

function ExerciseGuidePage() {
  const [coachingOpen, setCoachingOpen] = useState(false)
  const p = PLAN

  return (
    <div className="bg-white md:bg-[#F4F4F5] w-full min-h-[100dvh] flex justify-center">
      <div className="w-full bg-white relative flex flex-col min-h-[100dvh] mx-auto md:max-w-[480px] md:rounded-[24px] md:shadow-2xl md:my-8 md:overflow-hidden">

        <Header
          variant="back"
          title="운동 가이드"
          rightAction={
            <button className="w-10 h-10 flex items-center justify-center text-mute" aria-label="더보기">
              <FontAwesomeIcon icon={faEllipsisVertical} className="text-[16px]" />
            </button>
          }
        />

        <main className="flex-1 overflow-y-auto">
          {/* 샘플 미리보기 고지 — 운동 백엔드 미구현 단계 (생성 흐름 연결 시 제거) */}
          <div className="mx-5 mt-4 flex items-start gap-2 rounded-[12px] bg-bgSubtle border border-borderHairline px-3.5 py-2.5">
            <FontAwesomeIcon icon={faCircleInfo} className="text-mute text-[12px] mt-0.5" />
            <p className="text-[11px] text-mute leading-relaxed">샘플 미리보기예요. 운동 가이드 생성 기능은 준비 중입니다.</p>
          </div>
          {/* 제목 블록 */}
          <section className="px-5 pt-4 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[12px] font-[500] text-primary mb-1">{p.category}</p>
                <h2 className="text-[22px] font-[700] text-textHeading leading-tight">{p.title}</h2>
              </div>
              <span className="shrink-0 mt-1 inline-flex items-center gap-1 rounded-full bg-primarySoft text-primary px-2.5 py-1 text-[12px] font-[600]">
                <FontAwesomeIcon icon={faGaugeHigh} className="text-[10px]" />강도 · {p.intensity}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-3 text-[12px] text-subtext">
              <span className="inline-flex items-center gap-1">
                <FontAwesomeIcon icon={faCalendar} className="text-mute text-[11px]" />{p.createdAt} 생성
              </span>
              <span className="w-1 h-1 rounded-full bg-borderStrong" />
              <span className="inline-flex items-center gap-1">
                <FontAwesomeIcon icon={faClock} className="text-mute text-[11px]" />{p.frequency}
              </span>
            </div>
          </section>

          {/* 위험도 */}
          <section className="px-5 pb-5">
            <div className="flex items-center gap-2 rounded-[12px] border border-borderHairline bg-bgSubtle px-3.5 py-3">
              <span className="inline-flex items-center gap-1 rounded-md bg-[#ECFDF5] text-[#16A34A] px-2 py-0.5 text-[12px] font-[600]">
                <FontAwesomeIcon icon={faCircleCheck} className="text-[11px]" />{p.risk.badge}
              </span>
              <p className="text-[13px] text-subtext">
                {p.risk.text} — <span className="text-textHeading font-[600]">{p.risk.emphasis}</span>
              </p>
            </div>
          </section>

          {/* 목표 심박수 카드 */}
          <section className="px-5 pb-5">
            <div className="bg-white rounded-[12px] border border-borderHairline p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-primarySoft flex items-center justify-center">
                    <FontAwesomeIcon icon={faHeartPulse} className="text-primary text-[15px]" />
                  </div>
                  <h3 className="text-[14px] font-[600] text-textHeading">목표 심박수 구간</h3>
                </div>
                <div className="text-right">
                  <p className="text-[18px] font-[700] text-primary leading-none">{p.heart.zone}</p>
                  <p className="text-[10px] text-mute mt-0.5">bpm</p>
                </div>
              </div>

              <div className="relative h-2.5 rounded-full bg-borderLight overflow-hidden">
                <div
                  className="absolute top-0 bottom-0 rounded-full bg-primary"
                  style={{ left: `${p.heart.zoneLeft}%`, right: `${p.heart.zoneRight}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-[10px] text-mute">
                <span>안정</span>
                <span className="text-primary font-[600]">목표 {p.heart.zone}</span>
                <span>최대 {p.heart.max}</span>
              </div>

              <div className="mt-4 pt-3 border-t border-borderHairline grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-[10px] text-mute mb-0.5">최대 심박수</p>
                  <p className="text-[14px] font-[700] text-textHeading">{p.heart.max} <span className="text-[9px] font-[400] text-mute">bpm</span></p>
                </div>
                <div className="text-center border-x border-borderHairline">
                  <p className="text-[10px] text-mute mb-0.5">목표 심박수</p>
                  <p className="text-[14px] font-[700] text-textHeading">{p.heart.zone} <span className="text-[9px] font-[400] text-mute">bpm</span></p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-mute mb-0.5">주당 운동 시간</p>
                  <p className="text-[14px] font-[700] text-textHeading">{p.heart.weekly} <span className="text-[9px] font-[400] text-mute">분</span></p>
                </div>
              </div>
              <p className="text-[10px] text-mute mt-3 leading-relaxed">
                최대 심박수는 220 − 나이 공식으로 산출한 값이며, 목표 구간은 중강도(최대의 60~80%) 기준입니다.
              </p>
            </div>
          </section>

          {/* 주간 운동 계획 */}
          <section className="px-5 pb-5">
            <h3 className="text-[14px] font-[600] text-textHeading mb-3">주간 운동 계획</h3>

            <div className="flex justify-between mb-4">
              {p.week.map(({ d, on }) => (
                <div key={d} className="flex flex-col items-center gap-1.5">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${on ? 'bg-primary' : 'bg-borderLight'}`}>
                    <span className={`text-[12px] ${on ? 'font-[700] text-white' : 'font-[500] text-mute'}`}>{d}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {p.sessions.map((s, i) => (
                <div key={i} className="flex items-center gap-3 rounded-[12px] border border-borderHairline px-3.5 py-3">
                  <span className="w-6 text-[13px] font-[700] text-primary">{s.day}</span>
                  <span className="flex-1 text-[14px] font-[600] text-textHeading">{s.name}</span>
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-[600] ${s.strong ? 'bg-primarySoft text-primary' : 'bg-borderLight text-subtext'}`}>{s.tag}</span>
                  <span className="text-[13px] text-subtext">{s.dur}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 추천 운동 */}
          <section className="px-5 pb-5">
            <div className="bg-white rounded-[12px] border border-borderHairline p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-primarySoft flex items-center justify-center">
                  <FontAwesomeIcon icon={faDumbbell} className="text-primary text-[12px]" />
                </div>
                <h3 className="text-[14px] font-[600] text-textHeading">추천 운동</h3>
                <span className="ml-auto text-[11px] bg-primarySoft text-primary px-2 py-0.5 rounded-full font-[600]">{p.recommended.length}가지</span>
              </div>
              <ul className="space-y-3">
                {p.recommended.map((r, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <div className="flex-1 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[14px] font-[600] text-textHeading">{r.name}</p>
                        <p className="text-[12px] text-subtext mt-0.5">{r.note}</p>
                      </div>
                      <span className="text-[13px] text-subtext whitespace-nowrap">{r.dur}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* 주의·금기 운동 */}
          <section className="px-5 pb-5">
            <div className="bg-white rounded-[12px] border border-borderHairline p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center">
                  <FontAwesomeIcon icon={faTriangleExclamation} className="text-warning text-[12px]" />
                </div>
                <h3 className="text-[14px] font-[600] text-textHeading">주의·금기 운동</h3>
                <span className="ml-auto text-[11px] bg-warning/10 text-warning px-2 py-0.5 rounded-full font-[600]">{p.cautions.length}가지</span>
              </div>
              <ul className="space-y-3">
                {p.cautions.map((c, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
                    <div>
                      <p className="text-[14px] font-[600] text-textHeading">{c.name}</p>
                      <p className="text-[12px] text-subtext mt-0.5">{c.note}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* AI 코칭 */}
          <section className="px-5 pb-5">
            <div className="bg-white rounded-[12px] border border-borderHairline p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-primarySoft flex items-center justify-center">
                  <FontAwesomeIcon icon={faWandMagicSparkles} className="text-primary text-[12px]" />
                </div>
                <h3 className="text-[14px] font-[600] text-textHeading">AI 코칭</h3>
              </div>

              {p.coachingPreview.map((para, i) => (
                <p key={i} className={`text-[14px] text-textBody leading-[1.85] ${i > 0 ? 'mt-3' : ''}`}>{para}</p>
              ))}

              {coachingOpen && (
                <div>
                  <blockquote className="border-l-4 border-primary bg-primarySoft py-3 px-4 mt-4 text-[14px] text-textBody leading-relaxed">
                    {p.coachingQuote}
                  </blockquote>
                  <p className="text-[14px] text-textBody leading-[1.85] mt-3">{p.coachingMore}</p>
                </div>
              )}

              <div className="mt-3 flex justify-center">
                <button
                  onClick={() => setCoachingOpen((v) => !v)}
                  aria-expanded={coachingOpen}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] text-mute hover:text-textBody transition-colors"
                >
                  <span>{coachingOpen ? '접기' : '더보기'}</span>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className={`text-[10px] transition-transform ${coachingOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* 면책 고지 */}
          <section className="px-5 pb-6">
            <div className="flex items-start gap-2 rounded-[12px] bg-bgSubtle border border-borderHairline px-3.5 py-3">
              <FontAwesomeIcon icon={faCircleInfo} className="text-mute text-[12px] mt-0.5" />
              <p className="text-[11px] text-mute leading-relaxed">
                본 운동 가이드는 참고용이며 의학적 진단을 대체하지 않습니다. 심장 질환·고혈압·당뇨 등 기저질환이 있는 경우 전문 의료진과 상담 후 운동을 시작하십시오.
              </p>
            </div>
          </section>
        </main>

        {/* 하단 액션: 저장(보조) + 공유(주) */}
        <footer className="shrink-0 bg-white border-t border-borderHairline px-5 py-3">
          <div className="flex gap-2.5">
            <button className="flex-1 h-12 rounded-[10px] border border-primary text-primary text-[14px] font-[700] inline-flex items-center justify-center gap-2">
              <FontAwesomeIcon icon={faBookmark} className="text-[13px]" />저장
            </button>
            <button className="flex-1 h-12 rounded-[10px] bg-primary hover:bg-primaryDark text-white text-[14px] font-[700] inline-flex items-center justify-center gap-2 transition-colors">
              <FontAwesomeIcon icon={faShareNodes} className="text-[13px]" />공유
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default ExerciseGuidePage
