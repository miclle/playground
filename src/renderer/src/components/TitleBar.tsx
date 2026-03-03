import { Settings, FolderOpen } from 'lucide-react'
import { cn } from '../lib/utils'

interface TitleBarProps {
  onOpenSettings: () => void
  onOpenProjectSelector: () => void
  projectName?: string
}

export function TitleBar({ onOpenSettings, onOpenProjectSelector, projectName }: TitleBarProps) {
  const isMac = navigator.userAgent.includes('Mac')

  return (
    <div
      className={cn(
        'flex items-center h-10 bg-muted/50 border-b border-border select-none',
        isMac ? 'pl-20' : 'pl-4' // macOS 留出红绿灯位置
      )}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* 左侧：项目选择器 */}
      <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          onClick={onOpenProjectSelector}
          className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-accent transition-colors"
        >
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {projectName || 'Select Project'}
          </span>
        </button>
      </div>

      {/* 中间：拖拽区域 */}
      <div className="flex-1" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />

      {/* 右侧：设置按钮 */}
      <div
        className="flex items-center gap-1 pr-2"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={onOpenSettings}
          className="p-2 hover:bg-accent rounded transition-colors"
          title="Settings"
        >
          <Settings className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}
