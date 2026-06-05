import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Header from '../../components/Header.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faWandMagicSparkles, faPaperPlane, faChevronLeft,
  faRotateRight, faTrash, faPenToSquare, faChevronDown, faChevronUp,
  faEllipsisVertical, faUtensils, faHeartPulse, faMoon,
} from '@fortawesome/free-solid-svg-icons'
import {
  sendChatMessage, getChatHistory,
  deleteChatMessage, editChatMessage, regenerateChatMessage,
  clearChatMessages, deleteChatSession,
} from '../../api/chat.js'
import { getDietGuideByDate } from '../../api/dietGuides.js'
import { getHealthCheckupByYear } from '../../api/healthCheckup.js'

const CATEGORIES = {
  DIET_GUIDE: [
    {
      label: '식단 플랜이 궁금해요',
      questions: [
        { text: '왜 이 식단 플랜이 추천됐나요?',   prefill: false },
        { text: '다른 식단 플랜은 어떤 게 있나요?', prefill: false },
        { text: '이 식단 플랜이 제 건강에 맞나요?', prefill: false },
        { text: '식단 플랜을 바꿀 수 있나요?',      prefill: false },
      ],
    },
    {
      label: '영양소 계산이 궁금해요',
      questions: [
        { text: '권장 칼로리는 어떻게 계산됐나요?',      prefill: false },
        { text: '단백질을 더 먹어도 되나요?',            prefill: false },
        { text: '탄수화물을 줄이면 어떤 효과가 있나요?', prefill: false },
        { text: '지방은 어떤 종류를 먹어야 하나요?',     prefill: false },
      ],
    },
    {
      label: '실천 방법이 궁금해요',
      questions: [
        { text: '제한 식품을 꼭 지켜야 하나요?', prefill: false },
        { text: '이 음식 먹어도 되나요?',        prefill: true, placeholder: '이 음식 먹어도 되나요? 음식명: ' },
      ],
    },
    {
      label: '대체 식품이 궁금해요',
      questions: [
        { text: '이 식품 대신 뭐 먹을 수 있나요?', prefill: true, placeholder: '이 식품 대신 뭐 먹을 수 있나요? 식품명: ' },
      ],
    },
  ],
  HEALTH_CHECKUP: [
    {
      label: '혈압이 궁금해요',
      questions: [
        { text: '내 혈압 수치가 정상인가요?',          prefill: false },
        { text: '혈압을 낮추려면 어떻게 해야 하나요?', prefill: false },
        { text: '고혈압 위험이 있나요?',               prefill: false },
      ],
    },
    {
      label: '혈당이 궁금해요',
      questions: [
        { text: '혈당 수치가 위험한가요?',      prefill: false },
        { text: '혈당을 낮추는 방법이 있나요?', prefill: false },
        { text: '당뇨 전단계인가요?',           prefill: false },
      ],
    },
    {
      label: '전반적인 건강 상태가 궁금해요',
      questions: [
        { text: '어떤 부분을 개선해야 하나요?',    prefill: false },
        { text: '다음 검진은 언제 받아야 하나요?', prefill: false },
        { text: '가장 주의해야 할 수치가 뭔가요?', prefill: false },
      ],
    },
  ],
  PRESCRIPTION: [
    {
      label: '복용 방법이 궁금해요',
      questions: [
        { text: '언제 복용하는 게 좋나요?',            prefill: false },
        { text: '음식과 함께 먹어도 되나요?',          prefill: false },
        { text: '복용을 빠뜨리면 어떻게 해야 하나요?', prefill: false },
      ],
    },
    {
      label: '부작용이 궁금해요',
      questions: [
        { text: '이 약들 부작용이 있나요?',            prefill: false },
        { text: '부작용이 생기면 어떻게 해야 하나요?', prefill: false },
        { text: '장기 복용해도 괜찮나요?',             prefill: false },
      ],
    },
    {
      label: '약 조합이 궁금해요',
      questions: [
        { text: '이 약들 함께 먹어도 되나요?',   prefill: false },
        { text: '주의해야 할 음식이 있나요?',     prefill: false },
        { text: '다른 약과 함께 먹어도 되나요?', prefill: false },
      ],
    },
  ],
  SLEEP_GUIDE: [
    {
      label: '수면 상태가 궁금해요',
      questions: [
        { text: '내 수면 시간이 적절한가요?',     prefill: false },
        { text: '수면 리듬이 불규칙한가요?',      prefill: false },
        { text: '전반적인 수면 상태는 어떤가요?', prefill: false },
      ],
    },
    {
      label: '수면 개선 방법이 궁금해요',
      questions: [
        { text: '오늘 당장 실천할 수 있는 방법은?',  prefill: false },
        { text: '주간 목표를 어떻게 실천하나요?',    prefill: false },
        { text: '카페인이 수면에 영향을 주나요?',    prefill: false },
        { text: '생활 습관을 어떻게 바꿔야 하나요?', prefill: false },
      ],
    },
    {
      label: '졸음/피로가 걱정돼요',
      questions: [
        { text: '낮에 졸린 게 심각한가요?',         prefill: false },
        { text: '수면 부족으로 인한 위험이 있나요?', prefill: false },
        { text: '잠이 안 올 때 어떻게 해야 하나요?', prefill: false },
      ],
    },
    {
      label: '전문 상담이 필요한가요',
      questions: [
        { text: '병원에 가야 하나요?',              prefill: false },
        { text: '수면 장애 가능성이 있나요?',        prefill: false },
        { text: '다음 수면 점검은 언제 해야 하나요?', prefill: false },
      ],
    },
  ],
}

const MEAL_PLAN_KO = {
  'Balanced Diet':               '균형 식단',
  'Low-Sodium Diet':             '저염 식단',
  'Low-Carb Diet':               '저탄수화물 식단',
  'Low-Calorie Diet':            '저칼로리 식단',
  'Low-Carb Low-Sodium Diet':    '저탄수화물·저염 식단',
  'Low-Calorie Low-Sodium Diet': '저칼로리·저염 식단',
  'Low-Carb Low-Calorie Diet':   '저탄수화물·저칼로리 식단',
  'Therapeutic Diet':            '치료 식단',
}

const WELCOME_MESSAGE = {
  DIET_GUIDE:     '안녕하세요! AI 식단 상담사입니다.\n식단 플랜, 영양소, 제한 식품 등 궁금한 것을 자유롭게 물어보세요.\n아래 예시 질문을 참고하셔도 좋습니다.',
  HEALTH_CHECKUP: '안녕하세요! AI 건강검진 상담사입니다.\n혈압, 혈당, 건강 상태 등 궁금한 것을 자유롭게 물어보세요.\n아래 예시 질문을 참고하셔도 좋습니다.',
  PRESCRIPTION:   '안녕하세요! AI 처방약 상담사입니다.\n복용 방법, 부작용, 약 조합 등 궁금한 것을 자유롭게 물어보세요.\n아래 예시 질문을 참고하셔도 좋습니다.',
  SLEEP_GUIDE:    '안녕하세요! AI 수면 상담사입니다.\n수면 시간, 수면 리듬, 개선 방법 등 궁금한 것을 자유롭게 물어보세요.\n아래 예시 질문을 참고하셔도 좋습니다.',
}

const CONTEXT_TITLE = {
  DIET_GUIDE:     'AI 식단 상담',
  HEALTH_CHECKUP: 'AI 건강검진 상담',
  PRESCRIPTION:   'AI 처방약 상담',
  SLEEP_GUIDE:    'AI 수면 상담',
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function TypingDots() {
  return (
    <div className="px-4 py-3 bg-bgSubtle rounded-[12px] rounded-tl-none inline-block">
      <div className="flex gap-1 items-center">
        <span className="w-1.5 h-1.5 rounded-full bg-mute animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-mute animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-mute animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}

function DietGuidePanel({ guide }) {
  const [expanded, setExpanded] = useState(false)
  if (!guide) return null
  return (
    <div className="border-b border-borderHairline bg-primarySoft">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5"
      >
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faUtensils} className="text-primary text-[11px]" />
          <span className="text-[12px] font-[700] text-primary">
            {MEAL_PLAN_KO[guide.meal_plan_type] ?? guide.meal_plan_type}
          </span>
          <span className="text-[11px] text-primary/60">{guide.guide_date}</span>
        </div>
        <FontAwesomeIcon icon={expanded ? faChevronUp : faChevronDown} className="text-primary text-[10px]" />
      </button>
      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: '칼로리',   value: guide.nutrient_standard?.recommended_calories, unit: 'kcal' },
              { label: '탄수화물', value: guide.nutrient_standard?.recommended_carbs,    unit: 'g' },
              { label: '단백질',   value: guide.nutrient_standard?.recommended_protein,  unit: 'g' },
              { label: '지방',     value: guide.nutrient_standard?.recommended_fat,      unit: 'g' },
            ].map(({ label, value, unit }) => (
              <div key={label} className="bg-white rounded-[8px] px-2 py-1.5 text-center">
                <p className="text-[10px] text-mute mb-0.5">{label}</p>
                <p className="text-[12px] font-[700] text-textHeading">
                  {value}<span className="text-[10px] font-[400] text-mute ml-0.5">{unit}</span>
                </p>
              </div>
            ))}
          </div>
          {[['아침', guide.breakfast], ['점심', guide.lunch], ['저녁', guide.dinner]].map(([label, content]) => {
            if (!content) return null
            const summary = content.replace(/^[-•]\s*/gm, '').trim().split('\n').filter(Boolean).slice(0, 3).join(', ')
            return (
              <div key={label} className="flex gap-2">
                <span className="text-[11px] font-[700] text-primary w-6 shrink-0 leading-[1.6]">{label}</span>
                <span className="text-[12px] text-textBody leading-relaxed">{summary}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function HealthCheckupPanel({ checkup }) {
  const [expanded, setExpanded] = useState(false)
  if (!checkup) return null

  const bmi = checkup.height && checkup.weight
    ? (checkup.weight / ((checkup.height / 100) ** 2)).toFixed(1)
    : null

  const items = [
    { label: '수축기혈압',   value: checkup.bp_systolic,        unit: 'mmHg' },
    { label: '이완기혈압',   value: checkup.bp_diastolic,       unit: 'mmHg' },
    { label: '공복혈당',     value: checkup.fasting_glucose,    unit: 'mg/dL' },
    { label: '총콜레스테롤', value: checkup.total_cholesterol,  unit: 'mg/dL' },
    { label: 'HDL',         value: checkup.hdl,                unit: 'mg/dL' },
    { label: 'LDL',         value: checkup.ldl,                unit: 'mg/dL' },
    { label: '중성지방',     value: checkup.triglyceride,       unit: 'mg/dL' },
    { label: 'BMI',         value: bmi,                        unit: 'kg/m²' },
  ].filter(item => item.value !== null && item.value !== undefined)

  return (
    <div className="border-b border-borderHairline bg-primarySoft">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5"
      >
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faHeartPulse} className="text-primary text-[11px]" />
          <span className="text-[12px] font-[700] text-primary">{checkup.checkup_year}년 건강검진</span>
        </div>
        <FontAwesomeIcon icon={expanded ? faChevronUp : faChevronDown} className="text-primary text-[10px]" />
      </button>
      {expanded && (
        <div className="px-4 pb-3">
          <div className="grid grid-cols-4 gap-2">
            {items.map(({ label, value, unit }) => (
              <div key={label} className="bg-white rounded-[8px] px-2 py-1.5 text-center">
                <p className="text-[10px] text-mute mb-0.5">{label}</p>
                <p className="text-[12px] font-[700] text-textHeading">
                  {value}<span className="text-[10px] font-[400] text-mute ml-0.5">{unit}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SleepGuidePanel({ guideId }) {
  const [expanded, setExpanded] = useState(false)
  const [guide, setGuide] = useState(null)

  useEffect(() => {
    if (!guideId) return
    import('../../api/sleepGuides.js').then(({ getSleepGuide }) => {
      getSleepGuide(guideId)
        .then(data => setGuide(data))
        .catch(() => {})
    })
  }, [guideId])

  if (!guide) return null

  const STATUS_LABEL = { 0: '정상', 1: '주의', 2: '위험' }

  return (
    <div className="border-b border-borderHairline bg-primarySoft">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5"
      >
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faMoon} className="text-primary text-[11px]" />
          <span className="text-[12px] font-[700] text-primary">수면 분석</span>
          <span className="text-[11px] text-primary/60">{STATUS_LABEL[guide.overall_status] ?? ''} 단계</span>
        </div>
        <FontAwesomeIcon icon={expanded ? faChevronUp : faChevronDown} className="text-primary text-[10px]" />
      </button>
      {expanded && (
        <div className="px-4 pb-3">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: '평균 수면', value: guide.sleep_hours_avg ? `${guide.sleep_hours_avg}h` : '—' },
              { label: '주말 시차', value: guide.rhythm_diff_hours ? `${guide.rhythm_diff_hours}h` : '—' },
              { label: '카페인',   value: guide.caffeine_mg_daily != null ? `${guide.caffeine_mg_daily}mg` : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-[8px] px-2 py-1.5 text-center">
                <p className="text-[10px] text-mute mb-0.5">{label}</p>
                <p className="text-[12px] font-[700] text-textHeading">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ChatPage() {
  const navigate              = useNavigate()
  const { sessionId }         = useParams()
  const [searchParams]        = useSearchParams()
  const contextType           = searchParams.get('context_type') ?? 'DIET_GUIDE'
  const guideDate             = searchParams.get('guide_date') ?? null
  const checkupYear           = searchParams.get('checkup_year') ?? null
  const guideId               = searchParams.get('guide_id') ?? null
  const [messages,         setMessages]         = useState([])
  const [input,            setInput]            = useState('')
  const [loading,          setLoading]          = useState(false)
  const [loadingMessageId, setLoadingMessageId] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [showCategories,   setShowCategories]   = useState(false)
  const [editingId,        setEditingId]        = useState(null)
  const [editInput,        setEditInput]        = useState('')
  const [showMenu,         setShowMenu]         = useState(false)
  const [dietGuide,        setDietGuide]        = useState(null)
  const [checkupData,      setCheckupData]      = useState(null)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  const categories = CATEGORIES[contextType] ?? []
  const welcomeMsg = WELCOME_MESSAGE[contextType] ?? ''

  useEffect(() => {
    if (!sessionId) return
    getChatHistory(sessionId)
      .then((data) => { setMessages(data.messages ?? []) })
      .catch(() => {})
  }, [sessionId])

  useEffect(() => {
    if (contextType !== 'DIET_GUIDE' || !guideDate) return
    getDietGuideByDate(guideDate)
      .then(data => setDietGuide(data))
      .catch(() => {})
  }, [contextType, guideDate])

  useEffect(() => {
    if (contextType !== 'HEALTH_CHECKUP' || !checkupYear) return
    getHealthCheckupByYear(checkupYear)
      .then(data => setCheckupData(data))
      .catch(() => {})
  }, [contextType, checkupYear])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loadingMessageId])

  const handleQuestionClick = (q, categoryLabel) => {
    if (q.prefill) {
      setInput(q.placeholder)
      setShowCategories(false)
      setSelectedCategory(null)
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      handleSend(q.text, categoryLabel)
    }
  }

  const handleSend = async (text, category = null) => {
    const message = text || input.trim()
    if (!message || loading) return
    setInput('')
    setSelectedCategory(null)
    setShowCategories(false)
    setLoading(true)

    setMessages((prev) => [...prev, {
      id: Date.now(),
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
    }])

    try {
      const data = await sendChatMessage(sessionId, message, category ?? selectedCategory?.label ?? null)
      setMessages(data.history ?? [])
    } catch {
      setMessages((prev) => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: '답변을 가져오지 못했어요. 다시 시도해 주세요.',
        created_at: new Date().toISOString(),
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (messageId) => {
    if (!window.confirm('이 메시지를 삭제할까요?')) return
    try {
      const data = await deleteChatMessage(sessionId, messageId)
      setMessages(data.messages ?? [])
    } catch {}
  }

  const handleEditStart = (msg) => {
    setEditingId(msg.id)
    setEditInput(msg.content)
  }

  const handleEditSubmit = async (messageId) => {
    if (!editInput.trim() || loading) return
    setEditingId(null)
    setLoading(true)
    setMessages((prev) => {
      const idx = prev.findIndex(m => m.id === messageId)
      if (idx === -1) return prev
      return [...prev.slice(0, idx), { ...prev[idx], content: editInput.trim() }]
    })
    setLoadingMessageId('edit-' + messageId)
    try {
      const data = await editChatMessage(sessionId, messageId, editInput.trim(), selectedCategory?.label ?? null)
      setMessages(data.history ?? [])
    } catch {
      setMessages((prev) => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: '답변을 가져오지 못했어요. 다시 시도해 주세요.',
        created_at: new Date().toISOString(),
      }])
    } finally {
      setLoading(false)
      setLoadingMessageId(null)
    }
  }

  const handleRegenerate = async (messageId) => {
    if (loading) return
    setLoading(true)
    setLoadingMessageId(messageId)
    setMessages((prev) => prev.filter(m => m.id !== messageId))
    try {
      const data = await regenerateChatMessage(sessionId, messageId, selectedCategory?.label ?? null)
      setMessages(data.history ?? [])
    } catch {
      setMessages((prev) => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: '답변을 가져오지 못했어요. 다시 시도해 주세요.',
        created_at: new Date().toISOString(),
      }])
    } finally {
      setLoading(false)
      setLoadingMessageId(null)
    }
  }

  const handleClearMessages = async () => {
    if (!window.confirm('채팅 기록을 모두 삭제할까요?')) return
    setShowMenu(false)
    try {
      await clearChatMessages(sessionId)
      setMessages([])
    } catch {}
  }

  const handleLeaveSession = async () => {
    if (!window.confirm('채팅방을 나가시겠습니까? 채팅 기록이 모두 삭제됩니다.')) return
    setShowMenu(false)
    try {
      await deleteChatSession(sessionId)
    } catch {}
    navigate(-1)
  }

  const renderQuestions = (cat, size = 'md') => {
    const px   = size === 'sm' ? 'px-3 py-2.5' : 'px-4 py-3'
    const text = size === 'sm' ? 'text-[12px]' : 'text-[13px]'
    return cat.questions.map((q, i) => (
      <button
        key={i}
        onClick={() => handleQuestionClick(q, cat.label)}
        className={`w-full text-left ${px} bg-bgSubtle border border-borderHairline rounded-[10px] ${text} text-textBody hover:bg-primarySoft hover:border-primary transition-colors flex items-center justify-between gap-2`}
      >
        <span>{q.text}</span>
        {q.prefill && (
          <span className="text-[10px] text-primary shrink-0">직접 입력</span>
        )}
      </button>
    ))
  }

  return (
    <div className="bg-white md:bg-[#F4F4F5] w-full h-[100dvh] flex justify-center">
      <div className="w-full bg-white flex flex-col h-[100dvh] mx-auto md:max-w-[480px] md:rounded-[24px] md:shadow-2xl md:my-8 md:h-auto md:max-h-[calc(100dvh-4rem)]">

        <Header
          variant="back"
          title={CONTEXT_TITLE[contextType] ?? 'AI 상담'}
          rightAction={
            <div className="relative">
              <button
                onClick={() => setShowMenu(v => !v)}
                className="w-10 h-10 flex items-center justify-center text-textHeading"
              >
                <FontAwesomeIcon icon={faEllipsisVertical} className="text-[16px]" />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-10 z-50 bg-white rounded-[10px] shadow-lg border border-borderHairline overflow-hidden w-[160px]">
                    <button
                      onClick={handleClearMessages}
                      className="w-full px-5 py-3 text-[14px] font-[500] text-textHeading text-left hover:bg-bgSubtle"
                    >
                      채팅 기록 삭제
                    </button>
                    <button
                      onClick={handleLeaveSession}
                      className="w-full px-5 py-3 text-[14px] font-[500] text-error text-left hover:bg-bgSubtle"
                    >
                      채팅방 나가기
                    </button>
                  </div>
                </>
              )}
            </div>
          }
        />

        {contextType === 'DIET_GUIDE' && (
          <DietGuidePanel guide={dietGuide} />
        )}

        {contextType === 'HEALTH_CHECKUP' && (
          <HealthCheckupPanel checkup={checkupData} />
        )}

        {contextType === 'SLEEP_GUIDE' && (
          <SleepGuidePanel guideId={guideId} />
        )}

        <main className="flex-1 overflow-y-auto px-5 pt-4 pb-2 space-y-4">

          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full bg-primarySoft flex items-center justify-center mr-2 shrink-0 mt-1">
              <FontAwesomeIcon icon={faWandMagicSparkles} className="text-primary text-[10px]" />
            </div>
            <div className="max-w-[75%]">
              <div className="px-4 py-3 bg-bgSubtle rounded-[12px] rounded-tl-none text-[14px] leading-relaxed whitespace-pre-wrap text-textBody">
                {welcomeMsg}
              </div>
            </div>
          </div>

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-primarySoft flex items-center justify-center mr-2 shrink-0 mt-1">
                  <FontAwesomeIcon icon={faWandMagicSparkles} className="text-primary text-[10px]" />
                </div>
              )}
              <div className="max-w-[75%] space-y-1">
                {editingId === msg.id ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={editInput}
                      onChange={(e) => setEditInput(e.target.value)}
                      className="w-full px-3 py-2 text-[14px] border border-primary rounded-[10px] outline-none resize-none"
                      rows={3}
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 text-[12px] text-mute border border-borderHairline rounded-[8px]"
                      >
                        취소
                      </button>
                      <button
                        onClick={() => handleEditSubmit(msg.id)}
                        className="px-3 py-1.5 text-[12px] text-white bg-primary rounded-[8px]"
                      >
                        전송
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div
                      className={`px-4 py-3 rounded-[12px] text-[14px] leading-relaxed whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'bg-primary text-white rounded-tr-none'
                          : 'bg-bgSubtle text-textBody rounded-tl-none'
                      }`}
                    >
                      {msg.content}
                    </div>
                    <div className={`flex items-center gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <p className="text-[10px] text-mute">{formatTime(msg.created_at)}</p>
                      {msg.role === 'user' && (
                        <>
                          <button onClick={() => handleEditStart(msg)} className="text-[10px] text-mute hover:text-textBody transition-colors">
                            <FontAwesomeIcon icon={faPenToSquare} />
                          </button>
                          <button onClick={() => handleDelete(msg.id)} className="text-[10px] text-mute hover:text-error transition-colors">
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </>
                      )}
                      {msg.role === 'assistant' && (
                        <>
                          <button onClick={() => handleRegenerate(msg.id)} disabled={loading} className="text-[10px] text-mute hover:text-primary transition-colors disabled:opacity-50">
                            <FontAwesomeIcon icon={faRotateRight} />
                          </button>
                          <button onClick={() => handleDelete(msg.id)} className="text-[10px] text-mute hover:text-error transition-colors">
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full bg-primarySoft flex items-center justify-center mr-2 shrink-0 mt-1">
                <FontAwesomeIcon icon={faWandMagicSparkles} className="text-primary text-[10px]" />
              </div>
              <TypingDots />
            </div>
          )}

          <div ref={bottomRef} />
        </main>

        <div className="shrink-0 border-t border-borderHairline bg-white">
          <div className="px-5">
            <button
              onClick={() => { setShowCategories(v => !v); setSelectedCategory(null) }}
              className="w-full flex items-center justify-between py-3 text-[12px] text-mute hover:text-textBody transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <FontAwesomeIcon icon={faWandMagicSparkles} className="text-primary text-[11px]" />
                <span>예시 질문 보기</span>
              </div>
              <FontAwesomeIcon icon={showCategories ? faChevronDown : faChevronUp} className="text-[10px]" />
            </button>

            {showCategories && (
              <div className="pb-3 max-h-[40vh] overflow-y-auto space-y-2">
                {!selectedCategory ? (
                  <div className="flex flex-col gap-2">
                    {categories.map((cat, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedCategory(cat)}
                        className="w-full text-left px-3 py-2.5 bg-bgSubtle border border-borderHairline rounded-[10px] text-[12px] text-textBody hover:bg-primarySoft hover:border-primary transition-colors"
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="flex items-center gap-1 text-[11px] text-mute hover:text-textBody transition-colors"
                    >
                      <FontAwesomeIcon icon={faChevronLeft} className="text-[9px]" />
                      <span>돌아가기</span>
                    </button>
                    <div className="flex flex-col gap-1.5">
                      {renderQuestions(selectedCategory, 'sm')}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-5 py-3">
            <div className="flex items-center gap-2 bg-bgSubtle rounded-[12px] px-4 py-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder="직접 입력하기"
                className="flex-1 bg-transparent text-[14px] text-textBody placeholder:text-mute outline-none"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="w-8 h-8 rounded-full bg-primary flex items-center justify-center disabled:bg-mute transition-colors"
              >
                <FontAwesomeIcon icon={faPaperPlane} className="text-white text-[12px]" />
              </button>
            </div>
            <p className="text-[10px] text-mute text-center mt-2">
              본 AI 답변은 참고용이며 의학적 진단을 대체하지 않습니다.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}

export default ChatPage