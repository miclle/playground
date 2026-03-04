import { useState, useCallback } from 'react'
import { Code, Globe, Terminal, Maximize2, Minimize2, X } from 'lucide-react'
import { EditorPanel } from './Editor'
import { Preview } from './Preview'
import { ResizeHandle } from './ResizeHandle'
import { cn } from '../lib/utils'

type EditorTab = 'code' | 'preview'

interface CenterPanelProps {
  terminalHeight: number
  onTerminalHeightChange: (delta: number) => void
  onToggleTerminalMaximize: () => void
  isTerminalMaximized: boolean
  onCloseTerminal: () => void
  filePath?: string
  projectId?: string
}

export function CenterPanel({
  terminalHeight,
  onTerminalHeightChange,
  onToggleTerminalMaximize,
  isTerminalMaximized,
  onCloseTerminal,
  filePath,
  projectId
}: CenterPanelProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>('code')

  const handleResize = useCallback((delta: number) => {
    onTerminalHeightChange(-delta) // 反转方向，向下拖动增加高度
  }, [onTerminalHeightChange])

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 上半部分：代码/Preview */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center border-b border-border bg-muted/30">
          <button
            onClick={() => setActiveTab('code')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 text-sm border-b-2 transition-colors',
              activeTab === 'code'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Code className="h-4 w-4" />
            Code
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 text-sm border-b-2 transition-colors',
              activeTab === 'preview'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Globe className="h-4 w-4" />
            Preview
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'code' ? <EditorPanel filePath={filePath} projectId={projectId} /> : <Preview />}
        </div>
      </div>

      {/* 分隔线 */}
      <ResizeHandle direction="vertical" onResize={handleResize} />

      {/* 下半部分：Terminal */}
      <div
        className={cn(
          'flex flex-col bg-muted/20 border-t border-border overflow-hidden',
          isTerminalMaximized && 'fixed inset-0 z-50 bg-background'
        )}
        style={{ height: isTerminalMaximized ? '100%' : terminalHeight }}
      >
        {/* Terminal header */}
        <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
          <div className="flex items-center gap-2 text-sm">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            <span>Terminal</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleTerminalMaximize}
              className="p-1 hover:bg-accent rounded"
            >
              {isTerminalMaximized ? (
                <Minimize2 className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Maximize2 className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            <button
              onClick={onCloseTerminal}
              className="p-1 hover:bg-accent rounded"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Terminal content */}
        <div className="flex-1 overflow-auto p-4 font-mono text-sm">
          <div className="text-muted-foreground">
            <div>$ npm run dev</div>
            <div className="text-green-500">✓ Server started at http://localhost:3000</div>
            <div className="mt-2">Ready for AI commands...</div>
          </div>
        </div>
      </div>
    </div>
  )
}
