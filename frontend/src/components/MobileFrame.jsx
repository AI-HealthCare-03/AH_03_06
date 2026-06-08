// 모든 페이지 공용 외곽 프레임 (디자인 통일)
// 데스크탑(md+): 480px 카드 — 회색 배경 위에 라운드·그림자·상단 여백으로 떠 보임. 모바일: 전체폭
// header / bottomNav 슬롯, contentBg(white|gray)로 본문 배경 선택
function MobileFrame({ header, bottomNav, children, contentBg = 'white' }) {
  const innerBg = contentBg === 'gray' ? 'bg-[#F4F4F5]' : 'bg-white'
  return (
    <div className="bg-white md:bg-[#F4F4F5] w-full min-h-[100dvh] flex justify-center">
      <div className={`relative ${innerBg} w-full min-w-0 flex flex-col min-h-[100dvh] mx-auto md:max-w-[480px] md:rounded-[24px] md:shadow-2xl md:my-8`}>
        {header}
        <div className={`flex flex-col flex-1 min-w-0 ${bottomNav ? 'pb-24' : ''}`}>{children}</div>
        {bottomNav}
      </div>
    </div>
  )
}

export default MobileFrame
