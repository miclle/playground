import { useState, useCallback, useEffect } from 'react'
import { Code } from 'lucide-react'
import { TitleBar } from './components/TitleBar'
import { FileTree } from './components/FileTree'
import { CenterPanel } from './components/CenterPanel'
import { ChatPanel } from './components/ChatPanel'
import { Settings } from './components/Settings'
import { ProjectSelector } from './components/ProjectSelector'
import { ResizeHandle } from './components/ResizeHandle'
import { EditorPanel } from './components/Editor'

interface Project {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

interface FileNode {
  name: string
  path: string
  type: 'file' | 'folder'
  children?: FileNode[]
}

function App() {
  // Panel widths
  const [leftPanelWidth, setLeftPanelWidth] = useState(240)
  const [rightPanelWidth, setRightPanelWidth] = useState(320)
  const [terminalHeight, setTerminalHeight] = useState(200)

  // Panel visibility
  const [terminalVisible, setTerminalVisible] = useState(true)
  const [isTerminalMaximized, setIsTerminalMaximized] = useState(false)

  // Modals
  const [showSettings, setShowSettings] = useState(false)
  const [showProjectSelector, setShowProjectSelector] = useState(false)

  // Current project
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [projectFiles, setProjectFiles] = useState<FileNode[]>([])

  // Load last project on mount
  useEffect(() => {
    const loadLastProject = async () => {
      const projects = await window.api?.project.list()
      if (projects && projects.length > 0) {
        // Load the most recent project
        const lastProject = projects[0] as Project
        setCurrentProject(lastProject)
      }
    }
    loadLastProject()
  }, [])

  // Resize handlers
  const handleLeftResize = useCallback((delta: number) => {
    setLeftPanelWidth((prev) => Math.max(150, Math.min(400, prev + delta)))
  }, [])

  const handleRightResize = useCallback((delta: number) => {
    setRightPanelWidth((prev) => Math.max(200, Math.min(500, prev - delta)))
  }, [])

  const handleTerminalHeightChange = useCallback((delta: number) => {
    setTerminalHeight((prev) => Math.max(100, Math.min(500, prev + delta)))
  }, [])

  // Project selection
  const handleSelectProject = (project: Project) => {
    setCurrentProject(project)
    setShowProjectSelector(false)
    // TODO: Load project files from sandbox
    setProjectFiles([])
  }

  // File selection
  const handleFileSelect = (file: FileNode) => {
    // TODO: Load file content into editor
    console.log('Selected file:', file.path)
  }

  // Refresh files
  const handleRefreshFiles = () => {
    // TODO: Refresh files from sandbox
    console.log('Refresh files')
  }

  // New file
  const handleNewFile = () => {
    // TODO: Create new file
    console.log('New file')
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      {/* Title Bar */}
      <TitleBar
        onOpenSettings={() => setShowSettings(true)}
        onOpenProjectSelector={() => setShowProjectSelector(true)}
        projectName={currentProject?.name}
      />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel - File Tree */}
        <div
          className="flex-shrink-0 bg-muted/30 overflow-hidden"
          style={{ width: leftPanelWidth }}
        >
          <FileTree
            hasProject={!!currentProject}
            projectName={currentProject?.name}
            files={projectFiles}
            onFileSelect={handleFileSelect}
            onRefresh={handleRefreshFiles}
            onNewFile={handleNewFile}
          />
        </div>

        <ResizeHandle direction="horizontal" onResize={handleLeftResize} />

        {/* Center panel - Editor + Terminal */}
        {terminalVisible ? (
          <CenterPanel
            terminalHeight={terminalHeight}
            onTerminalHeightChange={handleTerminalHeightChange}
            onToggleTerminalMaximize={() => setIsTerminalMaximized(!isTerminalMaximized)}
            isTerminalMaximized={isTerminalMaximized}
            onCloseTerminal={() => setTerminalVisible(false)}
          />
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tab bar for code/preview */}
            <div className="flex items-center border-b border-border bg-muted/30">
              <button className="flex items-center gap-1.5 px-4 py-2 text-sm border-b-2 border-primary text-foreground">
                <Code className="h-4 w-4" />
                Code
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <EditorPanel />
            </div>
          </div>
        )}

        {/* Right panel - Chat (hidden when terminal is maximized) */}
        {!isTerminalMaximized && (
          <>
            <ResizeHandle direction="horizontal" onResize={handleRightResize} />
            <div
              className="flex-shrink-0 bg-muted/30 overflow-hidden"
              style={{ width: rightPanelWidth }}
            >
              <ChatPanel
                onOpenSettings={() => setShowSettings(true)}
                hasProject={!!currentProject}
              />
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
      {showProjectSelector && (
        <ProjectSelector
          onClose={() => setShowProjectSelector(false)}
          onSelectProject={handleSelectProject}
        />
      )}
    </div>
  )
}

export default App
