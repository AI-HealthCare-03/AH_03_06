// 가이드 본문 공통 렌더 — 마크다운 + "더보기/접기" fold.
// 복약 가이드/챗봇(프리뷰)처럼 단일 main_content 마크다운을 쓰는 화면에서 공유.
// foldEnabled=false(예: 스트리밍 중)면 fold 비활성 → 전체 표시, 버튼 숨김.

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown } from '@fortawesome/free-solid-svg-icons'

// 마크다운 → 시안 토큰 매핑 (Tailwind typography 플러그인 없이 ReactMarkdown components 만 사용)
const markdownComponents = {
  h1: ({ children }) => (
    <h2 className="text-[15px] font-[700] text-textHeading mt-4 mb-2">{children}</h2>
  ),
  h2: ({ children }) => (
    <h2 className="text-[14px] font-[700] text-textHeading mt-4 mb-2">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-[13px] font-[700] text-textHeading mt-3 mb-1">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-[14px] text-textBody leading-[1.85] my-3">{children}</p>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-primary bg-primarySoft py-3 px-4 mt-6 mb-3 text-[14px] text-textBody leading-relaxed not-italic">
      {children}
    </blockquote>
  ),
  ul: ({ children }) => <ul className="list-none space-y-1.5 my-2">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 my-2 text-[14px] text-textBody">{children}</ol>,
  li: ({ children }) => (
    <li className="flex items-start gap-2 text-[14px] text-textBody leading-relaxed">
      <span className="mt-2 w-1 h-1 rounded-full bg-mute flex-shrink-0"></span>
      <span>{children}</span>
    </li>
  ),
  strong: ({ children }) => <strong className="text-textHeading font-[700]">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ children }) => (
    <code className="bg-borderLight px-1 py-0.5 rounded text-[12px] font-mono">{children}</code>
  ),
  hr: () => <hr className="border-borderHairline my-3" />,
}

// 빈 줄(\n\n) 기준 블록 분할 — slice 후 join('\n\n') 으로 원문 복원 (요약·절단 없이 보존).
function splitMarkdownBlocks(content) {
  if (!content) return []
  return content.split('\n\n')
}

const PREVIEW_BLOCK_COUNT = 2

export default function FoldableMarkdown({
  content,
  foldEnabled = true,
  previewBlockCount = PREVIEW_BLOCK_COUNT,
}) {
  const [expanded, setExpanded] = useState(false)

  const blocks = splitMarkdownBlocks(content)
  const hasFold = foldEnabled && blocks.length > previewBlockCount
  const preview = hasFold
    ? blocks.slice(0, previewBlockCount).join('\n\n')
    : (content ?? '')
  const rest = hasFold ? blocks.slice(previewBlockCount).join('\n\n') : ''

  return (
    <div>
      <ReactMarkdown components={markdownComponents}>{preview}</ReactMarkdown>
      {hasFold && expanded && (
        <ReactMarkdown components={markdownComponents}>{rest}</ReactMarkdown>
      )}
      {hasFold && (
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] text-mute hover:text-textBody transition-colors"
          >
            <span>{expanded ? '접기' : '더보기'}</span>
            <FontAwesomeIcon
              icon={faChevronDown}
              className={`text-[10px] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      )}
    </div>
  )
}
