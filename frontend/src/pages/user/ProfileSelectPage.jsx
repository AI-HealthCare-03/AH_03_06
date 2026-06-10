// 프로필 선택 — 아바타 그리드. 잠금=포인트로 해금 후 선택, 해금됨=바로 선택.
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/Header.jsx'
import MobileFrame from '../../components/MobileFrame.jsx'
import BottomNav from '../../components/BottomNav.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faLock, faLockOpen } from '@fortawesome/free-solid-svg-icons'
import { getProfileItems, unlockProfileItem, selectProfileItem, resolveProfileImage } from '../../api/profile.js'
import { getPointBalance } from '../../api/point.js'

export default function ProfileSelectPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [balance, setBalance] = useState(0)
  const [unlockingId, setUnlockingId] = useState(null)   // 진행 중인 아바타 id

  const load = () => {
    getProfileItems().then(d => setItems(d?.items ?? [])).catch(() => {})
    getPointBalance().then(d => setBalance(d?.balance ?? 0)).catch(() => {})
  }
  useEffect(load, [])

  const handleTap = async (item) => {
    if (unlockingId === item.id || item.is_selected) return
    setUnlockingId(item.id)
    try {
      if (!item.is_unlocked) {
        // 무료(0P)는 확인 없이 바로 해금, 유료만 잔액 확인 + 확인창
        if (item.required_point > 0) {
          if (balance < item.required_point) { alert(`포인트가 부족해요 (필요 ${item.required_point}P · 보유 ${balance}P)`); return }
          if (!window.confirm(`${item.required_point}P로 이 프로필을 해금할까요?`)) return
        }
        await unlockProfileItem(item.id)
      }
      await selectProfileItem(item.id)
      load()   // 잔액·상태 갱신
    } catch (e) {
      const msg = String(e?.message ?? '')
      alert(msg.includes('insufficient_point') ? '포인트가 부족해요' : '처리 중 오류가 발생했어요. 다시 시도해주세요.')
    } finally {
      setUnlockingId(null)
    }
  }

  return (
    <MobileFrame header={<Header variant="back" title="프로필 선택" onBack={() => navigate(-1)} />} bottomNav={<BottomNav />} contentBg="white">
      <div className="px-5 pt-5 space-y-4">

        {/* 보유 포인트 */}
        <div className="bg-white rounded-[14px] border border-[#E4E4E7] p-4 flex items-center justify-between shadow-sm">
          <span className="text-[13px] text-[#71717A]">보유 포인트</span>
          <span className="text-[16px] font-bold text-primary">{balance.toLocaleString()} P</span>
        </div>

        {/* 아바타 그리드 */}
        <div className="grid grid-cols-3 gap-3">
          {items.map(item => (
            <button key={item.id} onClick={() => handleTap(item)} disabled={unlockingId === item.id}
              className={`relative bg-white rounded-[14px] border p-3 flex flex-col items-center gap-2 active:bg-[#FAFAFA] transition-colors
                ${item.is_selected ? 'border-primary' : 'border-[#E4E4E7]'}`}>
              <div className="relative">
                <img src={resolveProfileImage(item.image_url)} alt={item.name}
                  className={`w-16 h-16 rounded-full bg-[#F4F4F5] object-cover ${item.is_unlocked ? '' : 'opacity-40'}`} />
                {!item.is_unlocked && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FontAwesomeIcon icon={faLock} className="text-[#52525B] text-[15px]" />
                  </div>
                )}
                {item.is_selected && (
                  <div className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center ring-2 ring-white">
                    <FontAwesomeIcon icon={faCheck} className="text-white text-[10px]" />
                  </div>
                )}
                {unlockingId === item.id && !item.is_unlocked && (
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                    <FontAwesomeIcon icon={faLockOpen} className="text-teal-400 text-[15px] animate-unlock" />
                  </div>
                )}
              </div>
              <span className="text-[11px] text-[#52525B] truncate w-full text-center">{item.name}</span>
              {unlockingId === item.id && !item.is_unlocked
                ? <span className="text-[10px] font-medium text-primary">해제 중</span>
                : item.is_selected
                ? <span className="text-[10px] font-bold text-primary">선택중</span>
                : item.is_unlocked
                  ? <span className="text-[10px] text-[#A1A1AA]">보유</span>
                  : <span className="text-[10px] font-medium text-[#71717A]">{item.required_point > 0 ? `${item.required_point}P` : '무료'}</span>}
            </button>
          ))}
        </div>

        <p className="text-[12px] text-[#A1A1AA] text-center pt-1">포인트로 새 프로필을 해금하고 선택할 수 있어요</p>
      </div>
    </MobileFrame>
  )
}
