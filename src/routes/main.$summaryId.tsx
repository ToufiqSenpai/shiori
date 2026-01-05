import { createFileRoute } from '@tanstack/react-router'
import { Bot, GripVertical, Send, User } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkMath from 'remark-math'
import { useLocalStorage } from 'usehooks-ts'

import { Role, useSummaryStore } from '../stores/summary-store'

function useResizablePanel(initialWidth = 700) {
  const [width, setWidth] = useLocalStorage('summaryPanelWidth', initialWidth)
  const [isResizing, setIsResizing] = useState(false)

  const startResizing = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsResizing(true)

      const startX = e.clientX
      const startWidth = width

      const onMouseMove = (ev: MouseEvent) => {
        requestAnimationFrame(() => {
          const nextWidth = startWidth + ev.clientX - startX
          // Limit width antara 300px dan 1000px
          setWidth(Math.max(300, Math.min(nextWidth, 1000)))
        })
      }

      const onMouseUp = () => {
        setIsResizing(false)
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
      }

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    [width, setWidth],
  )

  return { width, isResizing, startResizing }
}

const SummaryPanel = ({ content, width }: { content: string; width: number }) => {
  const { summaryId } = Route.useParams()
  const { getSummaryById } = useSummaryStore()

  const summary = getSummaryById(summaryId)!

  return (
    <div className="shrink-0 flex flex-col border-r border-gray-200 bg-white h-full" style={{ width }}>
      {/* --- CONTENT AREA --- */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
        <div className="p-8" id="summary-panel">
          <div className="hidden print:block mb-8 border-b pb-4">
            <h1 className="text-2xl font-bold text-gray-900">{summary.title}</h1>
          </div>

          <div className="prose prose-slate prose-sm max-w-none select-text">
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                code: ({ ...props }) => (
                  <code
                    className="bg-gray-100 text-red-500 rounded px-1 py-0.5 print:bg-transparent print:border print:border-gray-200"
                    {...props}
                  />
                ),
                pre: ({ ...props }) => (
                  <pre
                    className="bg-slate-900 text-slate-50 rounded-lg p-4 overflow-x-auto print:bg-gray-50 print:text-gray-900 print:border print:break-inside-avoid"
                    {...props}
                  />
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  )
}

const ChatBubble = ({ message, role }: { message: string; role: string }) => {
  const isAi = role === Role.ASSISTANT

  if (role === Role.SYSTEM) return null

  return (
    <div className={`flex w-full group ${isAi ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`
        flex gap-3
        ${isAi ? 'flex-row max-w-[95%]' : 'flex-row-reverse max-w-[90%]'}
      `}
      >
        {/* Avatar */}
        <div
          className={`
          shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm mt-1
          ${isAi ? 'bg-indigo-100 text-indigo-600 border border-indigo-200' : 'bg-gray-200 text-gray-600'}
        `}
        >
          {isAi ? <Bot size={18} strokeWidth={2.5} /> : <User size={18} strokeWidth={2.5} />}
        </div>

        {/* Bubble */}
        <div
          className={`
          p-3.5 text-sm shadow-sm transition-all duration-200 min-w-0
          ${
            isAi
              ? 'bg-white text-gray-800 rounded-2xl rounded-tl-none border border-gray-200'
              : 'bg-indigo-600 text-white rounded-2xl rounded-tr-none shadow-md'
          }
        `}
        >
          <div className={`prose prose-sm max-w-none wrap-break-word select-text ${isAi ? 'prose-slate' : 'prose-invert'}`}>
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                pre: ({ ...props }) => (
                  <pre className="bg-slate-900 text-slate-50 rounded-lg p-3 overflow-x-auto my-2" {...props} />
                ),
                code: ({ ...props }) => (
                  <code className="bg-black/10 rounded px-1 py-0.5 font-mono text-[0.9em]" {...props} />
                ),
              }}
            >
              {message}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  )
}

const ChatInput = ({ onSend, isLoading }: { onSend: (text: string) => void; isLoading?: boolean }) => {
  const [input, setInput] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    onSend(input)
    setInput('')
  }

  return (
    <div className="p-4 bg-white border-t border-gray-200 shrink-0">
      <form onSubmit={handleSubmit} className="relative max-w-3xl mx-auto flex items-center">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask a question about the summary..."
          className="w-full pl-5 pr-12 py-3.5 rounded-2xl border border-gray-300 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm shadow-sm"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="absolute right-2 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm"
        >
          <Send size={18} />
        </button>
      </form>
      <div className="text-[10px] text-center text-gray-400 mt-2 font-medium">
        AI can make mistakes. Please verify important information.
      </div>
    </div>
  )
}

// --- 3. Main Component ---

export const Route = createFileRoute('/main/$summaryId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { summaryId } = Route.useParams()
  const summary = useSummaryStore(state => state.summaries.find(s => s.id === summaryId))
  const rawChats = useSummaryStore(state => state.chats)
  const sendMessage = useSummaryStore(state => state.sendMessage)
  const [isSending, setIsSending] = useState(false)

  const { width, isResizing, startResizing } = useResizablePanel()
  const scrollRef = useRef<HTMLDivElement>(null)

  const chats = useMemo(() => {
    return rawChats
      .filter(c => c.summaryId === summaryId)
      .slice()
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }, [rawChats, summaryId])

  // Auto-scroll logic
  useEffect(() => {
    if (scrollRef.current) {
      const { scrollHeight, clientHeight } = scrollRef.current
      scrollRef.current.scrollTo({ top: scrollHeight - clientHeight, behavior: 'smooth' })
    }
  }, [chats.length])

  const handleSend = async (text: string) => {
    setIsSending(true)
    try {
      await sendMessage(summaryId, text)
    } catch (error) {
      console.error('Failed to send message', error)
    } finally {
      setIsSending(false)
    }
  }

  if (!summary) return <div className="p-8 text-center text-gray-500">Summary not found.</div>

  return (
    <div className="flex h-[calc(100vh-40px)] w-full overflow-hidden bg-gray-50 font-sans">
      {/* Left Panel: Summary */}
      <SummaryPanel content={summary.summary} width={width} />

      {/* Resizer Divider */}
      <div className="relative shrink-0 z-10 flex items-center justify-center -ml-0.5">
        {/* Visual Line */}
        <div className={`w-px h-full transition-colors duration-300 ${isResizing ? 'bg-indigo-500' : 'bg-gray-200'}`} />
        <div
          onMouseDown={startResizing}
          className="absolute inset-y-0 -left-2 -right-2 cursor-col-resize hover:bg-indigo-500/10 z-20 flex items-center justify-center group"
        >
          <div className="bg-white border border-gray-200 rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical size={12} className="text-gray-400" />
          </div>
        </div>
      </div>

      {/* Right Panel: Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f8f9fa]">
        {/* Messages List */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
          {chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-60">
              <Bot size={48} className="mb-2" />
              <p>Start a conversation regarding the summary</p>
            </div>
          ) : (
            chats.map(msg => <ChatBubble key={msg.id} message={msg.message} role={msg.role} />)
          )}
        </div>

        {/* Input Area */}
        <ChatInput onSend={handleSend} isLoading={isSending} />
      </div>

      {/* Global Cursor Overlay saat resizing (mencegah glitch cursor) */}
      {isResizing && <div className="fixed inset-0 z-9999 cursor-col-resize select-none" />}
    </div>
  )
}
