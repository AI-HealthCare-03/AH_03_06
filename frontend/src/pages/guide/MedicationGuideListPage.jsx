import { useEffect, useState } from 'react'
import Header from '../../components/Header.jsx'
import MedicationGuideCard from '../../components/MedicationGuideCard.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPills } from '@fortawesome/free-solid-svg-icons'
import {
  listMedicationGuides,
  deleteMedicationGuide,
} from '../../api/medicationGuides.js'


function MedicationGuideListPage() {
  const [guides, setGuides] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    listMedicationGuides()
      .then((data) => {
        if (cancelled) return
        setGuides(Array.isArray(data?.guides) ? data.guides : [])
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.message ?? '가이드 목록을 불러오지 못했어요.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const handleDelete = async (guideId) => {
    if (!window.confirm('이 복약 가이드를 삭제할까요?')) return
    try {
      await deleteMedicationGuide(guideId)
      setGuides((prev) => prev.filter((g) => g.guide_id !== guideId))
    } catch (err) {
      window.alert(err?.message ?? '삭제에 실패했어요.')
    }
  }

  return (
    <div className="bg-white md:bg-[#F4F4F5] w-full min-h-[100dvh] flex justify-center">
      <div className="w-full bg-white relative flex flex-col min-h-[100dvh] mx-auto md:max-w-[480px] md:rounded-[24px] md:shadow-2xl md:my-8 pb-10">

        <Header variant="back" title="복약 가이드" />

        <main className="px-5 pt-5 pb-2 space-y-3">

          {loading && (
            <p className="text-[13px] text-mute text-center py-10">불러오는 중…</p>
          )}

          {!loading && error && (
            <p className="text-[13px] text-error text-center py-10">{error}</p>
          )}

          {!loading && !error && guides.length === 0 && (
            <section className="bg-bgSubtle border border-borderHairline rounded-[12px] p-6 text-center mt-6">
              <FontAwesomeIcon icon={faPills} className="text-mute text-[24px] mb-3" />
              <h2 className="text-[14px] font-[700] text-textHeading mb-1">
                아직 생성된 복약 가이드가 없어요
              </h2>
              <p className="text-[12px] text-subtext leading-relaxed">
                복약관리에서 처방약을 등록한 뒤 가이드를 생성할 수 있어요.
              </p>
            </section>
          )}

          {!loading && !error && guides.length > 0 && (
            <>
              <p className="text-[11px] text-mute pt-1">총 {guides.length}건</p>
              {guides.map((g) => (
                <MedicationGuideCard
                  key={g.guide_id}
                  guide={g}
                  onDelete={handleDelete}
                />
              ))}
            </>
          )}

        </main>
      </div>
    </div>
  )
}

export default MedicationGuideListPage
