// 오류 + 재시도 공유 컴포넌트
// 진료기록 목록 화면(MedicalRecordList)의 오류 처리 톤을 표준으로 추출.
// 빈 상태(EmptyState)와 형제 — 로딩·빈상태·오류를 시각적으로 구분하기 위함.
// onRetry가 있을 때만 수동 "다시 시도" 버튼을 노출(자동 재시도 없음).
function ErrorState({ message = '데이터를 불러오지 못했어요', onRetry, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center px-6 py-12 gap-3 ${className}`}>
      <p className="text-[14px] text-subtext whitespace-pre-line">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-[14px] text-primary font-semibold">
          다시 시도
        </button>
      )}
    </div>
  )
}

export default ErrorState
