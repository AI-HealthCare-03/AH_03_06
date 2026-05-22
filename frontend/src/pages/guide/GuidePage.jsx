import Header from '../../components/Header.jsx'
import BottomNav from '../../components/BottomNav.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTriangleExclamation, faPills } from '@fortawesome/free-solid-svg-icons'

const mockGuide = {
  safety_warn: "이트라코나졸과 함께 복용 시 횡문근융해증 위험이 있습니다.",
  main_content: "이 약은 하루 1회 식후에 복용합니다. ...",
  references: "식품의약품안전처 e약은요, 2026.",
  disclaimer: "본 안내는 참고용이며 의학적 판단을 대체하지 않습니다.",
}

function GuidePage() {
  return (
    <div className="bg-white md:bg-[#F4F4F5] w-full min-h-[100dvh] flex justify-center">
      <div className="w-full bg-white relative flex flex-col min-h-[100dvh] mx-auto md:max-w-[480px] md:rounded-[24px] md:shadow-2xl md:my-8 pb-24">

        <Header variant="default" title="가이드" />

        <main className="px-5 pt-5 pb-2 space-y-4">

          {/* 안전 경고 카드 */}
          <section className="bg-[#FEF2F2] border border-[#FECACA] rounded-[12px] p-4 flex gap-3">
            <div className="w-9 h-9 rounded-[10px] bg-[#FEE2E2] flex items-center justify-center shrink-0">
              <FontAwesomeIcon icon={faTriangleExclamation} className="text-[16px] text-[#DC2626]" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="inline-block text-[11px] font-[700] text-[#DC2626] bg-white border border-[#FECACA] rounded-full px-2 py-0.5 mb-2">
                안전 경고
              </span>
              <p className="text-[14px] font-[500] text-[#7F1D1D] leading-relaxed">
                {mockGuide.safety_warn}
              </p>
            </div>
          </section>

          {/* 복약 안내 본문 카드 */}
          <section className="bg-white border border-[#E4E4E7] rounded-[12px] p-5">
            <div className="flex items-center gap-2 mb-3">
              <FontAwesomeIcon icon={faPills} className="text-[14px] text-primary" />
              <h2 className="text-[15px] font-[700] text-[#18181B]">복약 안내</h2>
            </div>
            <p className="text-[14px] text-[#3F3F46] leading-[1.7] whitespace-pre-line">
              {mockGuide.main_content}
            </p>
          </section>

          {/* 출처 */}
          <p className="text-[12px] text-[#71717A] px-1">
            출처: {mockGuide.references}
          </p>

          {/* 면책 */}
          <p className="text-[11px] text-[#A1A1AA] pt-4 pb-2 text-center">
            {mockGuide.disclaimer}
          </p>

        </main>

        <BottomNav />
      </div>
    </div>
  )
}

export default GuidePage
