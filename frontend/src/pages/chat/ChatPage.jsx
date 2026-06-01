import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import Header from '../../components/Header.jsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWandMagicSparkles, faPaperPlane, faChevronLeft } from '@fortawesome/free-solid-svg-icons'
import { sendChatMessage, getChatHistory } from '../../api/chat.js'


const CATEGORIES = {
  DIET_GUIDE: [
    {
      label: '식단 플랜이 궁금해요',
      questions: [
        '왜 이 식단 플랜이 추천됐나요?',
        '다른 식단 플랜은 어떤 게 있나요?',
        '이 식단 플랜이 제 건강에 맞나요?',
        '식단 플랜을 바꿀 수 있나요?',
      ],
    },
    {
      label: '영양소 계산이 궁금해요',
      questions: [
        '권장 칼로리는 어떻게 계산됐나요?',
        '단백질을 더 먹어도 되나요?',
        '탄수화물을 줄이면 어떤 효과가 있나요?',
        '지방은 어떤 종류를 먹어야 하나요?',
      ],
    },
    {
      label: '실천 방법이 궁금해요',
      questions: [
        '제한 식품을 꼭 지켜야 하나요?',
        '외식할 때 어떻게 해야 하나요?',
        '간식을 먹어도 되나요?',
        '식사 횟수는 어떻게 해야 하나요?',
      ],
    },
    {
      label: '대체 식품이 궁금해요',
      questions: [
        '권장 식품 대신 먹을 수 있는 게 있나요?',
        '한국 음식 중 먹을 수 있는 게 뭐가 있나요?',
        '편의점에서 먹을 수 있는 음식이 있나요?',
        '외식 메뉴 중 괜찮은 게 있나요?',
      ],
    },
    {
      label: '주의사항이 궁금해요',
      questions: [
        '절대 먹으면 안 되는 음식이 있나요?',
        '약 복용 중에 주의해야 할 음식이 있나요?',
        '이 식단을 오래 유지해도 되나요?',
        '혈압 수치와 식단이 어떤 관계가 있나요?',
      ],
    },
  ],
  HEALTH_CHECKUP: [
    {
      label: '혈압이 궁금해요',
      questions: [
        '내 혈압 수치가 정상인가요?',
        '혈압을 낮추려면 어떻게 해야 하나요?',
        '고혈압 위험이 있나요?',
      ],
    },
    {
      label: '혈당이 궁금해요',
      questions: [
        '혈당 수치가 위험한가요?',
        '혈당을 낮추는 방법이 있나요?',
        '당뇨 전단계인가요?',
      ],
    },
    {
      label: '전반적인 건강 상태가 궁금해요',
      questions: [
        '어떤 부분을 개선해야 하나요?',
        '다음 검진은 언제 받아야 하나요?',
        '가장 주의해야 할 수치가 뭔가요?',
      ],
    },
  ],
  PRESCRIPTION: [
    {
      label: '복용 방법이 궁금해요',
      questions: [
        '언제 복용하는 게 좋나요?',
        '음식과 함께 먹어도 되나요?',
        '복용을 빠뜨리면 어떻게 해야 하나요?',
      ],
    },
    {
      label: '부작용이 궁금해요',
      questions: [
        '이 약들 부작용이 있나요?',
        '부작용이 생기면 어떻게 해야 하나요?',
        '장기 복용해도 괜찮나요?',
      ],
    },
    {
      label: '약 조합이 궁금해요',
      questions: [
        '이 약들 함께 먹어도 되나요?',
        '주의해야 할 음식이 있나요?',
        '다른 약과 함께 먹어도 되나요?',
      ],
    },
  ],
}

const CONTEXT_TITLE = {
  DIET_GUIDE:     'AI 식단 상담',
  HEALTH_CHECKUP: 'AI 건강검진 상담',
  PRESCRIPTION:   'AI 처방약 상담',
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}


function ChatPage() {
  const { sessionId } = useParams()
  const [searchParams] = useSearchParams()
  const contextType = searchParams.get('context_type') ?? 'DIET_GUIDE'
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const bottomRef = useRef(null)

  const categories = CATEGORIES[contextType] ?? CATEGORIES.DIET_GUIDE
  const showSuggested = messages.length === 0

  useEffect(() => {
    if (!sessionId) return
    getChatHistory(sessionId)
      .then((data) => { setMessages(data.messages ?? []) })
      .catch(() => {})
  }, [sessionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (text) => {
    const message = text || input.trim()
    if (!message || loading) return
    setInput('')
    setSelectedCategory(null)
    setLoading(true)

    setMessages((prev) => [...prev, {
      id: Date.now(),
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
    }])

    try {
      const data = await sendChatMessage(sessionId, message, selectedCategory?.label ?? null)
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

  return (
    <div className="bg-white md:bg-[#F4F4F5] w-full min-h-[100dvh] flex justify-center">
      <div className="w-full bg-white relative flex flex-col min-h-[100dvh] mx-auto md:max-w-[480px] md:rounded-[24px] md:shadow-2xl md:my-8">

        <Header variant="back" title={CONTEXT_TITLE[contextType] ?? 'AI 상담'} />

        <main className="flex-1 overflow-y-auto px-5 pt-4 pb-2 space-y-4">

          {/* 1단계: 카테고리 선택 */}
          {showSuggested && !selectedCategory && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faWandMagicSparkles} className="text-primary text-[13px]" />
                <p className="text-[13px] font-[700] text-textHeading">무엇이 궁금하신가요?</p>
              </div>
              <div className="flex flex-col gap-2">
                {categories.map((cat, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedCategory(cat)}
                    className="w-full text-left px-4 py-3 bg-bgSubtle border border-borderHairline rounded-[10px] text-[13px] text-textBody hover:bg-primarySoft hover:border-primary transition-colors"
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2단계: 세부 질문 선택 */}
          {showSuggested && selectedCategory && (
            <div className="space-y-3">
              <button
                onClick={() => setSelectedCategory(null)}
                className="flex items-center gap-1 text-[12px] text-mute hover:text-textBody transition-colors"
              >
                <FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" />
                <span>돌아가기</span>
              </button>
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faWandMagicSparkles} className="text-primary text-[13px]" />
                <p className="text-[13px] font-[700] text-textHeading">{selectedCategory.label}</p>
              </div>
              <div className="flex flex-col gap-2">
                {selectedCategory.questions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(q)}
                    className="w-full text-left px-4 py-3 bg-bgSubtle border border-borderHairline rounded-[10px] text-[13px] text-textBody hover:bg-primarySoft hover:border-primary transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 대화 메시지 */}
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
                <div
                  className={`px-4 py-3 rounded-[12px] text-[14px] leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-primary text-white rounded-tr-none'
                      : 'bg-bgSubtle text-textBody rounded-tl-none'
                  }`}
                >
                  {msg.content}
                </div>
                <p className={`text-[10px] text-mute ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full bg-primarySoft flex items-center justify-center mr-2 shrink-0">
                <FontAwesomeIcon icon={faWandMagicSparkles} className="text-primary text-[10px]" />
              </div>
              <div className="px-4 py-3 bg-bgSubtle rounded-[12px] rounded-tl-none">
                <div className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-mute animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-mute animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-mute animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </main>

        <div className="px-5 py-3 border-t border-borderHairline bg-white">
          <div className="flex items-center gap-2 bg-bgSubtle rounded-[12px] px-4 py-2">
            <input
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
  )
}

export default ChatPage