import { useState } from 'react'
import { FileTree } from './components/FileTree'
import { Editor } from './components/Editor'
import { ChatPanel } from './components/ChatPanel'
import { BottomPanel } from './components/BottomPanel'
import { cn } from './lib/utils'

function App() {
  const [leftPanelWidth] = useState(240)
  const [rightPanelWidth] = useState(320)
  const [bottomPanelHeight] = useState(200)
  const [bottomPanelVisible, setBottomPanelVisible] = useState(true)

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel - File Tree */}
        <div
          className={cn(
            'flex-shrink-0 border-r border-border bg-muted/30',
            'transition-[width] duration-150'
          )}
          style={{ width: leftPanelWidth }}
        >
          <FileTree />
        </div>

        {/* Center panel - Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Editor />
        </div>

        {/* Right panel - Chat */}
        <div
          className={cn(
            'flex-shrink-0 border-l border-border bg-muted/30',
            'transition-[width] duration-150'
          )}
          style={{ width: rightPanelWidth }}
        >
          <ChatPanel />
        </div>
      </div>

      {/* Bottom panel - Terminal/Preview */}
      {bottomPanelVisible && (
        <div
          className="border-t border-border bg-muted/20"
          style={{ height: bottomPanelHeight }}
        >
          <BottomPanel
            onClose={() => setBottomPanelVisible(false)}
          />
        </div>
      )}
    </div>
  )
}

export default App
