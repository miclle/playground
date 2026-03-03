import { useState } from 'react'
import { X, Terminal, Globe, Maximize2, Minimize2 } from 'lucide-react'
import { cn } from '../lib/utils'
import { Preview } from './Preview'

type TabType = 'terminal' | 'preview'

interface BottomPanelProps {
  onClose: () => void
}

export function BottomPanel({ onClose }: BottomPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('terminal')
  const [isMaximized, setIsMaximized] = useState(false)

  const tabs = [
    { id: 'terminal' as const, label: 'Terminal', icon: Terminal },
    { id: 'preview' as const, label: 'Preview', icon: Globe }
  ]

  return (
    <div className={cn('flex flex-col h-full', isMaximized && 'fixed inset-0 z-50 bg-background')}>
      {/* Tab bar */}
      <div className="flex items-center justify-between border-b border-border">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 text-sm border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 px-2">
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1.5 hover:bg-accent rounded"
          >
            {isMaximized ? (
              <Minimize2 className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Maximize2 className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-accent rounded">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'terminal' ? <TerminalContent /> : <Preview />}
      </div>
    </div>
  )
}

function TerminalContent() {
  return (
    <div className="h-full p-4 font-mono text-sm">
      <div className="text-muted-foreground">
        <div>$ npm run dev</div>
        <div className="text-green-500">✓ Server started at http://localhost:3000</div>
        <div className="mt-2">Ready for AI commands...</div>
      </div>
    </div>
  )
}
