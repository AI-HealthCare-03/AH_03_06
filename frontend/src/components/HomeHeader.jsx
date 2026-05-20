import { useNavigate } from 'react-router-dom'

function HomeHeader({ nickname }) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#F4F4F5] px-5 h-[72px] flex items-center justify-between">
      <div>
        <h1 className="text-[17px] font-[700] text-[#18181B] leading-tight tracking-tight">안녕하세요, {nickname}님 👋</h1>
        <p className="text-[12px] text-[#52525B] mt-0.5">오늘도 건강한 하루 보내세요</p>
      </div>
      <button className="relative w-10 h-10 flex items-center justify-center text-[#09090B] rounded-[8px]">
        <i className="fa-regular fa-bell text-[18px]"></i>
        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
      </button>
    </header>
  )
}

export default HomeHeader