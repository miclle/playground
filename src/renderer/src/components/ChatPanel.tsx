import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Bot, User, Loader2, AlertCircle, Settings, Wrench, Terminal } from 'lucide-react'
import { cn } from '../lib/utils'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
  toolCalls?: ToolCall[]
}

interface ToolCall {
  id: string
  name: string
  input: unknown
  result?: unknown
  status: 'pending' | 'running' | 'completed' | 'error'
}

interface ChatPanelProps {
  onOpenSettings: () => void
  hasProject: boolean
  projectId?: string
  onFilesChange?: () => void
}

export function ChatPanel({ onOpenSettings, hasProject, projectId, onFilesChange }: ChatPanelProps) {
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
      const chatEvent = event as { type: string; content?: string; toolName?: string; toolInput?: unknown; toolCallId?: string; toolResult?: unknown }
      console.log('[ChatPanel] Event:', chatEvent)

      if (chatEvent.type === 'content' && chatEvent.content) {
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1]
          if (lastMessage?.isStreaming) {
            return [
              ...prev.slice(0, -1),
              { ...lastMessage, content: lastMessage.content + chatEvent.content }
            ]
          }
          return prev
        })
      } else if (chatEvent.type === 'tool_use') {
        // Add tool call to the message
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1]
          if (lastMessage?.isStreaming) {
            const toolCall: ToolCall = {
              id: chatEvent.toolCallId || `tool-${Date.now()}`,
              name: chatEvent.toolName || '',
              input: chatEvent.toolInput,
              status: 'running'
            }
            return [
              ...prev.slice(0, -1),
              { ...lastMessage, toolCalls: [...(lastMessage.toolCalls || []), toolCall] }
            ]
          }
          return prev
        })
      } else if (chatEvent.type === 'tool_result') {
        // Update tool call with result
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1]
          if (lastMessage?.toolCalls) {
            const updatedToolCalls = lastMessage.toolCalls.map(tc =>
              tc.name === chatEvent.toolName
                ? { ...tc, result: chatEvent.toolResult, status: 'completed' as const }
                : tc
            )
            return [...prev.slice(0, -1), { ...lastMessage, toolCalls: updatedToolCalls }]
          }
          return prev
        })
        // Refresh file tree when files are written
        if (chatEvent.toolName === 'write_file' || chatEvent.toolName === 'delete_file' || chatEvent.toolName === 'mkdir') {
          onFilesChange?.()
        }
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

    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
      toolCalls: []
    }
    setMessages((prev) => [...prev, assistantMessage])

    const messagesForAI = [...messages, userMessage].map((m) => ({
      role: m.role,
      content: m.content
    }))

    try {
      await window.api?.ai.chat(messagesForAI, projectId)
    } catch (err) {
      setError((err as Error).message)
      setIsLoading(false)
    }
  }, [input, isLoading, messages, projectId])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const renderToolCall = (toolCall: ToolCall) => {
    const getToolIcon = () => {
      switch (toolCall.name) {
        case 'execute_command':
          return <Terminal className="h-3 w-3" />
        default:
          return <Wrench className="h-3 w-3" />
      }
    }

    const formatInput = (input: unknown): string => {
      if (typeof input === 'object' && input !== null) {
        return JSON.stringify(input, null, 2)
      }
      return String(input)
    }

    return (
      <div key={toolCall.id} className="mt-2 rounded border border-border bg-muted/50 overflow-hidden">
        <div className="flex items-center gap-2 px-2 py-1.5 bg-muted/80 text-xs">
          {getToolIcon()}
          <span className="font-mono">{toolCall.name}</span>
          {toolCall.status === 'running' && (
            <Loader2 className="h-3 w-3 animate-spin ml-auto" />
          )}
        </div>
        <div className="px-2 py-1 text-xs font-mono text-muted-foreground border-t border-border">
          <pre className="whitespace-pre-wrap overflow-auto max-h-24">{formatInput(toolCall.input)}</pre>
        </div>
        {toolCall.result && (
          <div className="px-2 py-1 text-xs font-mono bg-green-500/10 text-green-600 dark:text-green-400 border-t border-border">
            <pre className="whitespace-pre-wrap overflow-auto max-h-32">
              {typeof toolCall.result === 'object'
                ? JSON.stringify(toolCall.result, null, 2)
                : String(toolCall.result)}
            </pre>
          </div>
        )}
      </div>
    )
  }

  if (!hasProject) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center h-9 px-3 border-b border-border">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            AI Agent
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-muted-foreground">
            <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No project selected</p>
            <p className="text-sm mt-1">Create or select a project to start</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center h-9 px-3 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          AI Agent
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-3 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <Bot className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">AI Coding Agent</p>
            <p className="text-xs mt-1">Ask me to create files, run code, or build apps</p>
            <div className="mt-4 space-y-1 text-xs">
              <p className="text-muted-foreground">Examples:</p>
              <p>"Create a React counter component"</p>
              <p>"Build a simple Express server"</p>
              <p>"Write a Python script to parse JSON"</p>
            </div>
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
            <div className="flex-1 min-w-0">
              <div
                className={cn(
                  'rounded-lg px-3 py-2 text-sm whitespace-pre-wrap',
                  message.role === 'assistant'
                    ? 'bg-muted'
                    : 'bg-primary text-primary-foreground'
                )}
              >
                {message.content || (message.isStreaming ? '...' : '')}
                {message.isStreaming && !message.content && (
                  <span className="inline-block w-2 h-4 bg-foreground/50 animate-pulse ml-0.5" />
                )}
              </div>
              {/* Tool calls */}
              {message.toolCalls && message.toolCalls.length > 0 && (
                <div className="mt-2 space-y-2">
                  {message.toolCalls.map(renderToolCall)}
                </div>
              )}
            </div>
          </div>
        ))}
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
            placeholder="Ask AI to create files or run code..."
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
