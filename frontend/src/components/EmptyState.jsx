import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

// Empty State 공유 컴포넌트 (가이드 v0.3 §4 C-1 · §5.8)
// 복약 이력 조회 화면의 톤을 표준으로 채택: 옅은 파란 원형 + 진한 파란 아이콘 + 제목 + 부제 + 옵션 액션
// 그동안 페이지마다 카드+회색아이콘 / 텍스트만 등으로 갈렸던 빈 상태를 한 톤으로 모음
function EmptyState({ icon, title, description, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center text-center px-6 py-12 ${className}`}>
      {icon && (
        <div className="w-14 h-14 rounded-full bg-primarySoft flex items-center justify-center">
          <FontAwesomeIcon icon={icon} className="text-primary text-[22px]" />
        </div>
      )}
      {title && <h3 className="mt-3 text-[16px] font-[600] text-[#18181B]">{title}</h3>}
      {description && (
        <p className="mt-1 text-[13px] text-subtext leading-relaxed whitespace-pre-line">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export default EmptyState
