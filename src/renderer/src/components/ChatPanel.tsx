import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Bot, User, Loader2, AlertCircle, Settings } from 'lucide-react'
import { cn } from '../lib/utils'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
}

interface ChatPanelProps {
  onOpenSettings: () => void
  hasProject: boolean
}

export function ChatPanel({ onOpenSettings, hasProject }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Set up AI event listeners
  useEffect(() => {
    const unsubscribeEvent = window.api?.ai.onEvent((event: unknown) => {
      const chatEvent = event as { type: string; content?: string }
      if (chatEvent.type === 'content' && chatEvent.content) {
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1]
          if (lastMessage?.isStreaming) {
            // Append to streaming message
            return [
              ...prev.slice(0, -1),
              { ...lastMessage, content: lastMessage.content + chatEvent.content }
            ]
          }
          return prev
        })
      } else if (chatEvent.type === 'done') {
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1]
          if (lastMessage?.isStreaming) {
            return [...prev.slice(0, -1), { ...lastMessage, isStreaming: false }]
          }
          return prev
        })
        setIsLoading(false)
      }
    })

    const unsubscribeError = window.api?.ai.onError((errorMsg: string) => {
      setError(errorMsg)
      setIsLoading(false)
      // Remove streaming message if exists
      setMessages((prev) => {
        const lastMessage = prev[prev.length - 1]
        if (lastMessage?.isStreaming) {
          return prev.slice(0, -1)
        }
        return prev
      })
    })

    return () => {
      unsubscribeEvent?.()
      unsubscribeError?.()
    }
  }, [])

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setError(null)

    // Add placeholder for assistant response
    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    }
    setMessages((prev) => [...prev, assistantMessage])

    // Prepare messages for AI
    const messagesForAI = [...messages, userMessage].map((m) => ({
      role: m.role,
      content: m.content
    }))

    try {
      await window.api?.ai.chat(messagesForAI)
    } catch (err) {
      setError((err as Error).message)
      setIsLoading(false)
    }
  }, [input, isLoading, messages])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Empty state - no project
  if (!hasProject) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-3 py-2 border-b border-border">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            AI Chat
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-muted-foreground">
            <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No project selected</p>
            <p className="text-sm mt-1">Create or select a project to start chatting</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          AI Chat
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-3 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <Bot className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Start a conversation with AI</p>
            <p className="text-xs mt-1">Ask me to help you write code</p>
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex gap-3',
              message.role === 'user' && 'flex-row-reverse'
            )}
          >
            <div
              className={cn(
                'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center',
                message.role === 'assistant'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              )}
            >
              {message.role === 'assistant' ? (
                <Bot className="h-4 w-4" />
              ) : (
                <User className="h-4 w-4" />
              )}
            </div>
            <div
              className={cn(
                'flex-1 rounded-lg px-3 py-2 text-sm whitespace-pre-wrap',
                message.role === 'assistant'
                  ? 'bg-muted'
                  : 'bg-primary text-primary-foreground'
              )}
            >
              {message.content || (message.isStreaming ? '...' : '')}
              {message.isStreaming && (
                <span className="inline-block w-2 h-4 bg-foreground/50 animate-pulse ml-0.5" />
              )}
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.content === '' && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-2 bg-destructive/10 border-t border-destructive/20 flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1 truncate">{error}</span>
          <button
            onClick={() => onOpenSettings()}
            className="p-1 hover:bg-destructive/20 rounded"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI to help you code..."
            className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="self-end p-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
