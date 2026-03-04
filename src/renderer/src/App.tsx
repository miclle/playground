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

// List of system files/folders to hide from file tree
const SYSTEM_FILES = new Set([
  // Shell config
  '.bashrc', '.bash_logout', '.bash_profile', '.profile', '.npmrc', '.gitconfig',
  // Cache and temp
  '.cache', 'tmp', '.tmp', 'node_modules', '.local', '.npm',
  // SSH and keys
  '.ssh', '.id_rsa', '.id_ed25519',
  // Editor config
  '.vscode', '.idea', '._presage',
  // Node files
  '.node_repl_history', 'package-lock.json', 'yarn.lock',
  // Linux system directories (root level)
  'bin', 'boot', 'dev', 'etc', 'lib', 'lib32', 'lib64', 'libx32',
  'lost+found', 'media', 'mnt', 'opt', 'proc', 'root', 'run', 'sbin',
  'srv', 'sys', 'usr', 'var', 'home', 'snap'
])

// Common project file extensions to show (whitelist approach)
const PROJECT_EXTENSIONS = new Set([
  'html', 'htm', 'css', 'js', 'jsx', 'ts', 'tsx', 'json', 'md',
  'py', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'php',
  'vue', 'svelte', 'svg', 'png', 'jpg', 'jpeg', 'gif', 'ico', 'woff', 'woff2', 'ttf', 'webp'
])

// Always show these directories (user-created or project directories)
const ALWAYS_SHOW_DIRS = new Set([
  'src', 'components', 'pages', 'styles', 'assets', 'lib', 'utils',
  'hooks', 'contexts', 'types', 'tests', 'test', 'docs', 'build',
  'dist', 'out', 'public', 'server', 'client', 'app',
  'games', 'projects', 'workspace', 'snake-game', 'game', 'my-game',
  'snake', 'games'
])

// Check if a file should be visible in the file tree
function isProjectFile(name: string, isFile: boolean): boolean {
  // Always hide files starting with dot (hidden files)
  if (name.startsWith('.')) return false

  // Hide system files/directories
  if (SYSTEM_FILES.has(name)) {
    console.log('[Filter] Hiding (system file):', name)
    return false
  }

  // For files, check extension - only show known project file types
  if (isFile) {
    // Must have a known extension
    const ext = name.split('.').pop()?.toLowerCase()
    if (!ext || !PROJECT_EXTENSIONS.has(ext)) {
      console.log('[Filter] Hiding file (no matching extension):', name, 'ext:', ext)
      return false
    }
    console.log('[Filter] Showing file:', name)
    return true
  }

  // For directories - be more permissive for user-created content
  // First check if it's in the always-show list
  if (ALWAYS_SHOW_DIRS.has(name.toLowerCase())) {
    console.log('[Filter] Showing directory (always-show):', name)
    return true
  }

  // If it contains dash, underscore, or camelCase, likely a project dir
  if (name.includes('-') || name.includes('_') || /[A-Z]/.test(name)) {
    console.log('[Filter] Showing directory (has dash/underscore/caps):', name)
    return true
  }

  // For directories that are just lowercase letters, be selective
  // These are typically system directories in Linux
  const systemOnlyDirs = new Set([
    'bin', 'boot', 'dev', 'etc', 'lib', 'lib32', 'lib64', 'libx32',
    'lost+found', 'media', 'mnt', 'opt', 'proc', 'root', 'run', 'sbin',
    'srv', 'sys', 'tmp', 'usr', 'var', 'home', 'snap'
  ])

  if (systemOnlyDirs.has(name.toLowerCase())) {
    console.log('[Filter] Hiding directory (system-only):', name)
    return false
  }

  // Show all other directories (likely user-created)
  console.log('[Filter] Showing directory (user-created):', name)
  return true
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
  const [selectedFile, setSelectedFile] = useState<string | undefined>()

  // Load files from sandbox (memoized to avoid dependency issues)
  // Must be defined before useEffects that use it
  const loadProjectFiles = useCallback(async (projectId: string) => {
    console.log('[App] loadProjectFiles called for project:', projectId)
    try {
      // List /home/user directory instead of root to find user-created files
      const result = await window.api?.sandbox.listDir(projectId, '/home/user')
      console.log('[App] listDir result for /home/user:', result)

      if (result && 'error' in result) {
        console.error('[App] Failed to load files:', result.error)
        setProjectFiles([])
        return
      }

      const files = result as import('../shared/types').FileInfo[]
      console.log('[App] Files from sandbox:', files)

      if (files) {
        // Filter and convert FileInfo to FileNode
        const fileNodes: FileNode[] = await Promise.all(
          files
            .filter(file => isProjectFile(file.name, file.type === 'file'))
            .map(async (file) => {
              const node: FileNode = {
                name: file.name,
                path: file.path,
                type: file.type
              }
              // Load children for directories
              if (file.type === 'folder') {
                const childrenResult = await window.api?.sandbox.listDir(projectId, file.path)
                if (childrenResult && !('error' in childrenResult)) {
                  // Filter children as well
                  node.children = childrenResult
                    .filter(child => isProjectFile(child.name, child.type === 'file'))
                    .map(child => ({
                      name: child.name,
                      path: child.path,
                      type: child.type
                    }))
                }
              }
              return node
            })
        )
        console.log('[App] Setting projectFiles (filtered):', fileNodes)
        setProjectFiles(fileNodes)
      }
    } catch (err) {
      console.error('[App] Failed to load project files:', err)
      setProjectFiles([])
    }
  }, [])

  // Project selection handler
  const handleSelectProject = useCallback(async (project: Project) => {
    setCurrentProject(project)
    setShowProjectSelector(false)

    // Initialize sandbox for project
    try {
      const result = await window.api?.sandbox.getOrCreate(project.id)
      if (result && 'error' in result) {
        console.error('Failed to initialize sandbox:', result.error)
        // Still continue - sandbox might be configured later
      } else {
        // Load files from sandbox
        await loadProjectFiles(project.id)
      }
    } catch (err) {
      console.error('Failed to initialize sandbox:', err)
    }
  }, [loadProjectFiles])

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

  // File selection
  const handleFileSelect = useCallback((file: FileNode) => {
    if (file.type === 'file') {
      setSelectedFile(file.path)
    }
  }, [])

  // Refresh files
  const handleRefreshFiles = useCallback(() => {
    if (currentProject) {
      loadProjectFiles(currentProject.id)
    }
  }, [currentProject, loadProjectFiles])

  // New file
  const handleNewFile = useCallback(() => {
    // TODO: Create new file
    console.log('New file')
  }, [])

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

  // Initialize sandbox and load files when project changes
  useEffect(() => {
    if (currentProject) {
      console.log('[App] Project changed, initializing sandbox and loading files for:', currentProject.id)

      const initializeSandboxAndLoadFiles = async () => {
        try {
          // First, ensure sandbox exists
          const result = await window.api?.sandbox.getOrCreate(currentProject.id)
          if (result && 'error' in result) {
            console.error('[App] Failed to initialize sandbox:', result.error)
            // Don't set empty files - try to list anyway
          } else {
            console.log('[App] Sandbox initialized successfully')
          }
          // Then load files
          await loadProjectFiles(currentProject.id)
        } catch (err) {
          console.error('[App] Failed to initialize sandbox:', err)
          // Still try to load files
          await loadProjectFiles(currentProject.id)
        }
      }

      initializeSandboxAndLoadFiles()
    }
  }, [currentProject, loadProjectFiles])

  // Listen for sandbox file changes
  useEffect(() => {
    const handleFilesChanged = (event: { sandboxId: string; path: string }) => {
      console.log('[App] Files changed event:', event)
      if (currentProject) {
        loadProjectFiles(currentProject.id)
      }
    }

    // Use the API from preload
    const cleanup = window.api?.sandbox?.onFilesChanged?.(handleFilesChanged)

    return () => {
      cleanup?.()
    }
  }, [currentProject, loadProjectFiles])

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
          className="flex-shrink-0 bg-muted/20 overflow-hidden border-r border-border/60"
          style={{ width: leftPanelWidth }}
        >
          <FileTree
            hasProject={!!currentProject}
            projectName={currentProject?.name}
            projectId={currentProject?.id}
            files={projectFiles}
            onFileSelect={handleFileSelect}
            onRefresh={handleRefreshFiles}
            onNewFile={handleNewFile}
          />
        </div>

        <ResizeHandle direction="horizontal" onResize={handleLeftResize} />

        {/* Center panel - Editor + Terminal */}
        {terminalVisible ? (
          <div className="flex-1 flex flex-col overflow-hidden border-r border-border/60">
            <CenterPanel
              terminalHeight={terminalHeight}
              onTerminalHeightChange={handleTerminalHeightChange}
              onToggleTerminalMaximize={() => setIsTerminalMaximized(!isTerminalMaximized)}
              isTerminalMaximized={isTerminalMaximized}
              onCloseTerminal={() => setTerminalVisible(false)}
              filePath={selectedFile}
              projectId={currentProject?.id}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden border-r border-border/60 bg-background">
            {/* Tab bar for code/preview */}
            <div className="flex items-center border-b border-border bg-muted/30">
              <button className="flex items-center gap-1.5 px-4 py-2 text-sm border-b-2 border-primary text-foreground">
                <Code className="h-4 w-4" />
                Code
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <EditorPanel
                filePath={selectedFile}
                projectId={currentProject?.id}
              />
            </div>
          </div>
        )}

        {/* Right panel - Chat (hidden when terminal is maximized) */}
        {!isTerminalMaximized && (
          <>
            <ResizeHandle direction="horizontal" onResize={handleRightResize} />
            <div
              className="flex-shrink-0 bg-muted/20 overflow-hidden"
              style={{ width: rightPanelWidth }}
            >
              <ChatPanel
                onOpenSettings={() => setShowSettings(true)}
                hasProject={!!currentProject}
                projectId={currentProject?.id}
                onFilesChange={handleRefreshFiles}
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
