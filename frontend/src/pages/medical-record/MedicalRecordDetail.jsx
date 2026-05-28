// pages/medical-record/MedicalRecordDetail.jsx
// 진료기록 상세 조회
// - 진료 정보 (날짜, 진단명, 병원명, 진료과)
// - 처방약 목록
// - AI 복약 안내 (is_generated 여부에 따라 로딩/내용 분기)
// - AI 생활습관 가이드 (동일)
// - 하단 시트: 수정 / 삭제 / 취소

import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getMedicalRecord, deleteMedicalRecord } from '../../api/medicalRecord'
import { fetchDrugSuggest } from '../../api/medicationGuides.js'
import MedicationGuideButton from '../../components/MedicationGuideButton.jsx'

// 처방 약명 → drug-suggest 검색 prefix. KB 약명이 "밀리그램/밀리그람"으로 섞여 있어
// substring 검색이 단위어에서 어긋나므로, 단위어 앞까지만 잘라 질의한다.
const drugQueryPrefix = (name) =>
  String(name ?? '').split(/밀리그램|밀리그람|마이크로그램|마이크로그람|밀리리터|그램|그람/)[0].trim()

// 약명 정규화 — 단위 표기차(밀리그램↔밀리그람)·괄호 성분명·공백 흡수. 후보 중 정확 매칭 선택용.
const normDrugName = (name) =>
  String(name ?? '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/밀리그램|밀리그람/g, 'mg')
    .replace(/마이크로그램|마이크로그람/g, 'ug')
    .replace(/밀리리터/g, 'ml')
    .replace(/그램|그람/g, 'g')
    .replace(/\s+/g, '')
    .toLowerCase()

// ── 진료과 매핑 ───────────────────────────────────────────────
const DEPT_MAP = {
  1: '내과', 2: '외과', 3: '정형외과', 4: '치과', 5: '안과',
  6: '이비인후과', 7: '피부과', 8: '산부인과', 9: '소아청소년과',
  10: '신경과', 11: '정신건강의학과', 12: '비뇨기과',
}

// ── 날짜 포맷 (2026-05-02 → 2026.05.02 (목)) ─────────────────
function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const days = ['일', '월', '화', '수', '목', '금', '토']
  const ymd = dateStr.replace(/-/g, '.')
  return `${ymd} (${days[d.getDay()]})`
}

// ── 섹션 카드 래퍼 ────────────────────────────────────────────
function Card({ children, className = '' }) {
  return (
    <div className={`bg-white border border-neutral-100 rounded-2xl shadow-sm ${className}`}>
      {children}
    </div>
  )
}

// ── 처방약 아이템 ─────────────────────────────────────────────
function PrescriptionItem({ drug, onGuideSuccess, onAsk, asking }) {
  const dosageText = [
    drug.dosage && `${drug.dosage}정`,
    drug.frequency && `1일 ${drug.frequency}회`,
    drug.duration_days && `${drug.duration_days}일분`,
  ].filter(Boolean).join(' · ')

  // 기존 dosage 필드도 fallback으로 지원 (하위 호환)
  const sub = dosageText || [drug.dosage, drug.frequency, drug.duration_days != null ? `${drug.duration_days}일분` : '']
    .filter(Boolean).join(' · ')

  return (
    <div className="flex items-start gap-3 py-3 border-b border-neutral-50 last:border-0">
      <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
        <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-neutral-900">{drug.drug_name}</p>
        {sub && <p className="text-xs text-neutral-400 mt-0.5">{sub}</p>}
      </div>
      <div className="flex flex-col gap-1.5 shrink-0 self-center">
        <MedicationGuideButton
          medicationId={drug.id}
          medicationName={drug.drug_name}
          variant="compact"
          label="AI 가이드"
          onSuccess={onGuideSuccess}
        />
        <button
          type="button"
          onClick={onAsk}
          disabled={asking}
          className="h-8 px-3 rounded-md text-[12px] font-[700] border border-blue-200 text-blue-600 bg-white hover:bg-blue-50 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
        >
          {asking ? '여는 중…' : '질문하기'}
        </button>
      </div>
    </div>
  )
}

// ── AI 가이드 섹션 ────────────────────────────────────────────
function GuideSection({ title, icon, guide }) {
  if (!guide) return null

  return (
    <Card className="overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-50">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className="text-sm font-bold text-neutral-900">{title}</span>
        </div>
        <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">AI</span>
      </div>

      {/* 내용 */}
      <div className="px-5 py-4">
        {!guide.is_generated ? (
          // 생성 중 상태
          <div className="flex items-center gap-3 py-2">
            <div className="w-5 h-5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin shrink-0" />
            <p className="text-sm text-neutral-400">AI가 가이드를 생성하고 있어요...</p>
          </div>
        ) : (
          // 생성 완료
          <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line">
            {guide.content}
          </p>
        )}
      </div>
    </Card>
  )
}

// ── 하단 액션 시트 ────────────────────────────────────────────
function ActionSheet({ onEdit, onDelete, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[375px] bg-white rounded-t-3xl px-5 pt-5 pb-8 shadow-2xl">
        <div className="w-10 h-1 rounded-full bg-neutral-200 mx-auto mb-5" />
        <div className="flex flex-col gap-2">
          <button
            onClick={onEdit}
            className="w-full h-13 py-3.5 rounded-xl text-sm font-semibold text-neutral-700 flex items-center gap-3 px-4 hover:bg-neutral-50 transition-colors"
          >
            <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            진료기록 수정
          </button>
          <button
            onClick={onDelete}
            className="w-full h-13 py-3.5 rounded-xl text-sm font-semibold text-red-500 flex items-center gap-3 px-4 hover:bg-red-50 transition-colors"
          >
            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            진료기록 삭제
          </button>
          <div className="w-full h-px bg-neutral-100 my-1" />
          <button
            onClick={onClose}
            className="w-full h-13 py-3.5 rounded-xl text-sm font-semibold text-neutral-500 flex items-center justify-center hover:bg-neutral-50 transition-colors"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 삭제 확인 모달 ────────────────────────────────────────────
function DeleteConfirmModal({ onConfirm, onCancel, deleting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-[320px] bg-white rounded-3xl px-6 py-7 shadow-2xl">
        <h3 className="text-base font-bold text-neutral-900 mb-2 text-center">진료기록 삭제</h3>
        <p className="text-sm text-neutral-500 text-center leading-relaxed mb-6">
          진료기록을 삭제하면 처방약과<br />AI 가이드도 함께 삭제돼요.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-12 rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-700"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 h-12 rounded-xl bg-red-500 text-white text-sm font-bold disabled:opacity-50"
          >
            {deleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export default function MedicalRecordDetail() {
  const navigate = useNavigate()
  const { id: recordId } = useParams()

  const [record, setRecord]           = useState(null)
  const [loading, setLoading]         = useState(true)
  const [showActions, setShowActions] = useState(false)
  const [showDelete, setShowDelete]   = useState(false)
  const [deleting, setDeleting]       = useState(false)
  const [askingId, setAskingId]       = useState(null)

  // ── "이 약 물어보기" — drug-suggest로 item_seq 해결 후 preset 질문 화면으로 ──
  async function handleAskDrug(drug) {
    setAskingId(drug.id)
    try {
      const prefix = drugQueryPrefix(drug.drug_name) || drug.drug_name
      const { drugs = [] } = await fetchDrugSuggest({ q: prefix, limit: 30 })
      const target = normDrugName(drug.drug_name)
      const best = drugs.find((d) => normDrugName(d.drug_name) === target) ?? drugs[0]
      const params = new URLSearchParams()
      if (best?.item_seq) params.set('item_seq', best.item_seq)
      params.set('drug_name', best?.drug_name ?? drug.drug_name)
      navigate(`/medication-guides/preview?${params.toString()}`)
    } catch {
      navigate(`/medication-guides/preview?drug_name=${encodeURIComponent(drug.drug_name)}`)
    } finally {
      setAskingId(null)
    }
  }

  // ── 상세 조회 ─────────────────────────────────────────────
  useEffect(() => {
    ;(async () => {
      try {
        const data = await getMedicalRecord(recordId)
        setRecord(data)
      } catch (e) {
        alert('진료기록을 불러오지 못했어요.')
        navigate(-1)
      } finally {
        setLoading(false)
      }
    })()
  }, [recordId])

  // ── 삭제 ──────────────────────────────────────────────────
  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteMedicalRecord(recordId)
      navigate('/medical-records', { replace: true })
    } catch (e) {
      alert(e.message ?? '삭제에 실패했어요.')
      setDeleting(false)
      setShowDelete(false)
    }
  }

  // ── 로딩 ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mobile-container flex flex-col min-h-dvh bg-white font-['Pretendard',sans-serif] items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!record) return null

  const deptName = record.department_id ? DEPT_MAP[record.department_id] : null

  return (
    <div className="mobile-container flex flex-col min-h-dvh bg-neutral-50 font-['Pretendard',sans-serif]">

      {/* 앱바 */}
      <header className="w-full h-14 flex items-center justify-between px-4 bg-white shrink-0 border-b border-neutral-50">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center -ml-1 text-neutral-900"
          aria-label="뒤로가기"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-base font-bold text-neutral-900">진료기록 상세</h1>
        {/* 더보기 버튼 */}
        <button
          onClick={() => setShowActions(true)}
          className="w-10 h-10 flex items-center justify-center text-neutral-500"
          aria-label="더보기"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
          </svg>
        </button>
      </header>

      {/* 스크롤 영역 */}
      <main className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 pb-16">

        {/* ── 진료 정보 카드 ─────────────────────────────── */}
        <Card className="px-5 py-5">
          <div className="flex items-center gap-1.5 mb-3">
            <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span className="text-xs text-neutral-400">{formatDate(record.visit_date)}</span>
          </div>

          <h2 className="text-xl font-bold text-neutral-900 mb-4">{record.diagnosis_name}</h2>

          <div className="flex flex-col gap-2">
            {record.hospital_name && (
              <div className="flex gap-3">
                <span className="text-sm text-neutral-400 w-14 shrink-0">병원</span>
                <span className="text-sm font-medium text-neutral-900">{record.hospital_name}</span>
              </div>
            )}
            {deptName && (
              <div className="flex gap-3">
                <span className="text-sm text-neutral-400 w-14 shrink-0">진료과</span>
                <span className="text-sm font-medium text-neutral-900">{deptName}</span>
              </div>
            )}
          </div>
        </Card>

        {/* ── 처방약 ─────────────────────────────────────── */}
        {record.prescriptions?.length > 0 && (
          <Card className="px-5 py-4">
            <p className="text-sm font-bold text-neutral-900 mb-1">처방약</p>
            <div>
              {record.prescriptions.map(drug => (
                <PrescriptionItem
                  key={drug.id}
                  drug={drug}
                  onGuideSuccess={() => navigate('/medication-guides')}
                  onAsk={() => handleAskDrug(drug)}
                  asking={askingId === drug.id}
                />
              ))}
            </div>
          </Card>
        )}

        {/* ── AI 복약 안내 ────────────────────────────────── */}
        <GuideSection
          title="AI 복약 안내"
          icon="💊"
          guide={record.medication_guide}
        />

        {/* ── AI 생활습관 가이드 ──────────────────────────── */}
        <GuideSection
          title="AI 생활습관 가이드"
          icon="🏃"
          guide={record.lifestyle_guide}
        />

        {/* ── AI 면책 문구 ────────────────────────────────── */}
        {(record.medication_guide?.is_generated || record.lifestyle_guide?.is_generated) && (
          <p className="text-[11px] text-neutral-400 text-center leading-relaxed px-2">
            AI가 생성한 참고용 정보로, 의학적 진단·처방·치료를 대체할 수 없어요.<br />
            증상이 지속되거나 악화되면 반드시 의료진과 상담해 주세요.
          </p>
        )}
      </main>

      {/* 액션 시트 */}
      {showActions && (
        <ActionSheet
          onEdit={() => { setShowActions(false); navigate(`/medical-records/${recordId}/edit`) }}
          onDelete={() => { setShowActions(false); setShowDelete(true) }}
          onClose={() => setShowActions(false)}
        />
      )}

      {/* 삭제 확인 모달 */}
      {showDelete && (
        <DeleteConfirmModal
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
          deleting={deleting}
        />
      )}
    </div>
  )
}
