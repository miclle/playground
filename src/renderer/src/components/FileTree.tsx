import { useState } from 'react'
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Plus,
  RefreshCw
} from 'lucide-react'
import { cn } from '../lib/utils'

interface FileNode {
  name: string
  type: 'file' | 'folder'
  children?: FileNode[]
}

// Mock file tree data
const mockFileTree: FileNode[] = [
  {
    name: 'src',
    type: 'folder',
    children: [
      { name: 'index.ts', type: 'file' },
      { name: 'App.tsx', type: 'file' },
      {
        name: 'components',
        type: 'folder',
        children: [
          { name: 'Button.tsx', type: 'file' },
          { name: 'Input.tsx', type: 'file' }
        ]
      }
    ]
  },
  { name: 'package.json', type: 'file' },
  { name: 'README.md', type: 'file' }
]

function FileTreeNode({
  node,
  depth = 0
}: {
  node: FileNode
  depth?: number
}) {
  const [isOpen, setIsOpen] = useState(false)
  const hasChildren = node.type === 'folder' && node.children?.length

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-accent rounded-sm',
          'text-sm text-muted-foreground hover:text-foreground'
        )}
        style={{ paddingLeft: depth * 12 + 8 }}
        onClick={() => hasChildren && setIsOpen(!isOpen)}
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
          <File className="h-4 w-4" />
        )}
        <span>{node.name}</span>
      </div>
      {hasChildren && isOpen && (
        <div>
          {node.children!.map((child, index) => (
            <FileTreeNode key={index} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function FileTree() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Files
        </span>
        <div className="flex items-center gap-1">
          <button className="p-1 hover:bg-accent rounded">
            <Plus className="h-4 w-4 text-muted-foreground" />
          </button>
          <button className="p-1 hover:bg-accent rounded">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* File tree */}
      <div className="flex-1 overflow-auto py-2">
        {mockFileTree.map((node, index) => (
          <FileTreeNode key={index} node={node} />
        ))}
      </div>
    </div>
  )
}
