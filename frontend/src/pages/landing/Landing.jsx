import { useNavigate } from 'react-router-dom'

function Landing() {
  const navigate = useNavigate()

  return (
    <div className="flex justify-center items-center min-h-[100dvh] bg-white md:bg-[#F4F4F5]">
      <div className="w-full bg-white relative overflow-hidden flex flex-col min-h-[100dvh] md:max-w-[480px] md:min-h-[760px] md:my-8 md:rounded-[24px] md:shadow-2xl">
        <main className="flex-1 flex flex-col px-6 relative">

          {/* 브랜드 블록 */}
          <section className="flex flex-col items-center w-full mt-[160px]">
            <div className="w-[96px] h-[96px] bg-primary rounded-[24px] flex justify-center items-center mb-4">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 24H14L18 12L26 36L30 24H44" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M30 16C30 14.8954 29.1046 14 28 14C26.8954 14 26 14.8954 26 16C26 17.5 28 20 28 20C28 20 30 17.5 30 16Z" fill="white"/>
              </svg>
            </div>
            <h1 className="text-[32px] font-bold text-text-body mb-2 tracking-tight">Viva</h1>
            <p className="text-[14px] font-normal text-text-sub">매일의 건강을 더 가깝게</p>
          </section>

          {/* 히어로 메시지 블록 */}
          <section className="flex flex-col items-center w-full mt-[40px] text-center">
            <h2 className="text-[22px] font-bold text-text-body leading-[1.4] mb-3">
              진료기록부터 생활습관까지<br/>
              AI가 챙기는 내 건강 가이드
            </h2>
            <p className="text-[14px] font-normal text-text-sub leading-[1.5]">
              복약·식단·운동·수면을 한 곳에서<br/>
              내 데이터에 맞춰 매일 새로워져요
            </p>
          </section>

          {/* 하단 액션 블록 */}
          <section className="absolute bottom-[40px] left-6 right-6 flex flex-col">
            <button
              onClick={() => navigate('/register')}
              className="w-full h-[56px] bg-primary hover:bg-primary-dark transition-colors duration-200 rounded-[14px] text-white text-[16px] font-bold mb-4 flex justify-center items-center"
            >
              시작하기
            </button>
            <div className="flex justify-center items-center gap-1.5">
              <span className="text-[14px] font-medium text-text-sub">이미 계정이 있으신가요?</span>
              <span
                onClick={() => navigate('/login')}
                className="text-[14px] font-bold text-primary cursor-pointer"
              >
                로그인
              </span>
            </div>
          </section>

        </main>
      </div>
    </div>
  )
}

export default Landing