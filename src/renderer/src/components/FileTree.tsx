import { useState } from 'react'
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Plus,
  RefreshCw,
  FileCode,
  Download,
  Loader2
} from 'lucide-react'
import { cn } from '../lib/utils'

interface FileNode {
  name: string
  path: string
  type: 'file' | 'folder'
  children?: FileNode[]
}

interface FileTreeProps {
  hasProject: boolean
  projectName?: string
  projectId?: string
  files?: FileNode[]
  onFileSelect?: (file: FileNode) => void
  onRefresh?: () => void
  onNewFile?: () => void
}

function FileTreeNode({
  node,
  depth = 0,
  onFileSelect,
  onExport
}: {
  node: FileNode
  depth?: number
  onFileSelect?: (file: FileNode) => void
  onExport?: (node: FileNode) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null)
  const hasChildren = node.type === 'folder' && node.children?.length

  const handleClick = () => {
    if (hasChildren) {
      setIsOpen(!isOpen)
    } else if (node.type === 'file' && onFileSelect) {
      onFileSelect(node)
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (node.type === 'file') {
      setMenuPosition({ x: e.clientX, y: e.clientY })
      setShowMenu(true)
    }
  }

  const handleExport = () => {
    setShowMenu(false)
    if (onExport && node.type === 'file') {
      onExport(node)
    }
  }

  // Get file icon based on extension
  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    if (['ts', 'tsx', 'js', 'jsx'].includes(ext || '')) {
      return <FileCode className="h-4 w-4 text-yellow-500" />
    }
    if (['json'].includes(ext || '')) {
      return <FileCode className="h-4 w-4 text-yellow-600" />
    }
    if (['md'].includes(ext || '')) {
      return <FileCode className="h-4 w-4 text-blue-400" />
    }
    if (['css', 'scss'].includes(ext || '')) {
      return <FileCode className="h-4 w-4 text-pink-400" />
    }
    if (['html'].includes(ext || '')) {
      return <FileCode className="h-4 w-4 text-orange-500" />
    }
    return <File className="h-4 w-4" />
  }

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-accent rounded-sm',
          'text-sm text-muted-foreground hover:text-foreground'
        )}
        style={{ paddingLeft: depth * 12 + 8 }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {hasChildren ? (
          isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )
        ) : (
          <span className="w-4" />
        )}
        {node.type === 'folder' ? (
          isOpen ? (
            <FolderOpen className="h-4 w-4 text-primary" />
          ) : (
            <Folder className="h-4 w-4 text-primary" />
          )
        ) : (
          getFileIcon(node.name)
        )}
        <span className="flex-1 truncate">{node.name}</span>
      </div>
      {hasChildren && isOpen && (
        <div>
          {node.children!.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              onFileSelect={onFileSelect}
              onExport={onExport}
            />
          ))}
        </div>
      )}
      {showMenu && menuPosition && (
        <div
          className="fixed z-50 bg-popover border border-border rounded-md shadow-lg py-1 min-w-[120px]"
          style={{ left: menuPosition.x, top: menuPosition.y }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <button
            onClick={handleExport}
            className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      )}
      {showMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  )
}

export function FileTree({
  hasProject,
  projectName,
  projectId,
  files = [],
  onFileSelect,
  onRefresh,
  onNewFile
}: FileTreeProps) {
  const [exporting, setExporting] = useState<string | null>(null)
  const [exportMessage, setExportMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleExport = async (node: FileNode) => {
    if (!projectId) return

    setExporting(node.path)
    setExportMessage(null)

    try {
      const result = await window.api?.storage.export(projectId, node.path, node.name)
      if (result?.success) {
        setExportMessage({ type: 'success', message: `Exported to ${result.url || 'storage'}` })
      } else {
        setExportMessage({ type: 'error', message: result?.error || 'Export failed' })
      }
    } catch (err) {
      setExportMessage({ type: 'error', message: (err as Error).message })
    } finally {
      setExporting(null)
      setTimeout(() => setExportMessage(null), 3000)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between h-9 px-3 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {hasProject ? projectName || 'Files' : 'Files'}
        </span>
        {hasProject && (
          <div className="flex items-center gap-1">
            <button
              onClick={onNewFile}
              className="p-1 hover:bg-accent rounded"
              title="New File"
            >
              <Plus className="h-4 w-4 text-muted-foreground" />
            </button>
            <button
              onClick={onRefresh}
              className="p-1 hover:bg-accent rounded"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        )}
      </div>

      {/* Export message toast */}
      {exportMessage && (
        <div className={cn(
          'mx-2 mt-2 px-3 py-2 text-xs rounded flex items-center gap-2',
          exportMessage.type === 'success' ? 'bg-green-500/20 text-green-600' : 'bg-destructive/20 text-destructive'
        )}>
          {exportMessage.message}
        </div>
      )}

      {/* File tree */}
      <div className="flex-1 overflow-auto py-2">
        {!hasProject ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground px-4">
            <Folder className="h-10 w-10 mb-2 opacity-50" />
            <p className="text-sm text-center">No project selected</p>
            <p className="text-xs text-center mt-1">Create or select a project to view files</p>
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground px-4">
            <FileCode className="h-10 w-10 mb-2 opacity-50" />
            <p className="text-sm text-center">No files yet</p>
            <p className="text-xs text-center mt-1">Ask AI to create some code</p>
          </div>
        ) : (
          files.map((node) => (
            <FileTreeNode
              key={node.path}
              node={node}
              onFileSelect={onFileSelect}
              onExport={handleExport}
            />
          ))
        )}
      </div>
    </div>
  )
}
