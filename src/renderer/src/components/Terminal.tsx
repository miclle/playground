import { useState, useEffect, useRef } from 'react'
import { Send, Loader2, Terminal } from 'lucide-react'
import { cn } from '../lib/utils'

interface TerminalPanelProps {
  projectId?: string
}

interface TerminalEntry {
  type: 'command' | 'output' | 'error' | 'info' | 'stderr'
  content: string
  timestamp: Date
}

export function TerminalPanel({ projectId }: TerminalPanelProps) {
  const [entries, setEntries] = useState<TerminalEntry[]>([
    { type: 'info', content: 'Connected to sandbox. Type a command to execute.', timestamp: new Date() }
  ])
  const [command, setCommand] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when entries change
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries])

  // Listen for streaming terminal output
  useEffect(() => {
    if (!projectId) return

    const unsubscribe = window.api?.sandbox.onTerminalOutput((data) => {
      setEntries(prev => [...prev, {
        type: data.type === 'stderr' ? 'stderr' : 'output',
        content: data.content,
        timestamp: new Date()
      }])
    })

    return () => unsubscribe?.()
  }, [projectId])

  const executeCommand = async () => {
    if (!command.trim() || !projectId || isExecuting) return

    const cmd = command.trim()
    setCommand('')
    setIsExecuting(true)

    // Add command to entries
    setEntries(prev => [...prev, {
      type: 'command',
      content: `$ ${cmd}`,
      timestamp: new Date()
    }])

    try {
      // Execute command via IPC
      const result = await window.api?.sandbox.execute(projectId, cmd)

      if (result && typeof result === 'object' && 'error' in result) {
        setEntries(prev => [...prev, {
          type: 'error',
          content: result.error,
          timestamp: new Date()
        }])
      } else if (typeof result === 'string' && result) {
        // Add final output if any (streaming should have handled most output)
        setEntries(prev => {
          // Don't add duplicate final output if streaming already handled it
          const lastEntry = prev[prev.length - 1]
          if (lastEntry?.type === 'output' && lastEntry.content === result) {
            return prev
          }
          return [...prev, {
            type: 'output',
            content: result,
            timestamp: new Date()
          }]
        })
      }
    } catch (err) {
      setEntries(prev => [...prev, {
        type: 'error',
        content: (err as Error).message,
        timestamp: new Date()
      }])
    } finally {
      setIsExecuting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      executeCommand()
    }
  }

  const getEntryColor = (type: TerminalEntry['type']) => {
    switch (type) {
      case 'command': return 'text-foreground font-semibold'
      case 'output': return 'text-muted-foreground'
      case 'error': return 'text-destructive'
      case 'stderr': return 'text-yellow-500'
      case 'info': return 'text-blue-400'
      default: return 'text-muted-foreground'
    }
  }

  return (
    <div className="h-full flex flex-col font-mono text-sm">
      {/* Terminal output */}
      <div className="flex-1 overflow-auto p-4 space-y-0.5">
        {entries.map((entry, index) => (
          <div key={index} className={cn('whitespace-pre-wrap break-words', getEntryColor(entry.type))}>
            {entry.content}
          </div>
        ))}
        {isExecuting && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Executing...
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border p-3 bg-muted/30">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-muted-foreground flex-shrink-0">$</span>
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isExecuting || !projectId}
            className="flex-1 bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground disabled:opacity-50"
            placeholder={projectId ? 'Type a command...' : 'Select a project first...'}
            autoFocus
          />
          <button
            onClick={executeCommand}
            disabled={isExecuting || !command.trim() || !projectId}
            className="p-1.5 hover:bg-accent rounded disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            {isExecuting ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Send className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
