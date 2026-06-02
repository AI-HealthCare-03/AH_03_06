// 운동 가이드 목록 — 운동 백엔드 미구현 단계라 현재는 항상 빈 상태.
// 식단/수면 목록과 동일한 EmptyState + FAB 패턴(일관성). FAB는 결과 화면 샘플 미리보기로
// 연결(시연용). 백엔드 연결 시 실제 목록·생성 흐름으로 교체.

import { useNavigate } from 'react-router-dom'
import Header from '../../components/Header.jsx'
import EmptyState from '../../components/EmptyState.jsx'
import FloatingButton from '../../components/FloatingButton.jsx'
import { faPersonRunning } from '@fortawesome/free-solid-svg-icons'

function ExerciseGuideListPage() {
  const navigate = useNavigate()

  return (
    <div className="bg-white md:bg-[#F4F4F5] w-full min-h-[100dvh] flex justify-center">
      <div className="w-full bg-white relative flex flex-col min-h-[100dvh] mx-auto md:max-w-[480px] md:rounded-[24px] md:shadow-2xl md:my-8 pb-10">

        <Header variant="back" title="운동 가이드" />

        <main className="px-5 pt-5 pb-2">
          <EmptyState
            icon={faPersonRunning}
            title="아직 생성된 운동 가이드가 없어요"
            description={'아래 + 버튼을 눌러\n나에게 맞는 운동 가이드를 받아보세요.'}
          />
        </main>

        {/* 백엔드 연결 전 — 결과 화면 샘플 미리보기로 연결 */}
        <FloatingButton onClick={() => navigate('/guide/exercise')} />
      </div>
    </div>
  )
}

export default ExerciseGuideListPage
