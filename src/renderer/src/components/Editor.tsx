import { useRef, useEffect, useState } from 'react'
import Editor from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { Loader2, FileCode } from 'lucide-react'

interface EditorPanelProps {
  filePath?: string
  projectId?: string
}

export function EditorPanel({ filePath, projectId }: EditorPanelProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [language, setLanguage] = useState('typescript')

  // Load file content when filePath changes
  useEffect(() => {
    const loadFile = async () => {
      if (!filePath || !projectId) {
        setContent('')
        setLanguage('plaintext')
        return
      }

      setLoading(true)
      try {
        const result = await window.api?.sandbox.readFile(projectId, filePath)
        // Check if result is an error object
        if (result && typeof result === 'object' && 'error' in result) {
          console.error('Failed to load file:', result.error)
          setContent(`// Error loading file: ${result.error}`)
        } else if (typeof result === 'string') {
          setContent(result)
          // Detect language from file extension
          const ext = filePath.split('.').pop()?.toLowerCase()
          const langMap: Record<string, string> = {
            'ts': 'typescript',
            'tsx': 'typescript',
            'js': 'javascript',
            'jsx': 'javascript',
            'json': 'json',
            'html': 'html',
            'css': 'css',
            'scss': 'scss',
            'md': 'markdown',
            'py': 'python',
            'go': 'go',
            'rs': 'rust',
            'java': 'java',
            'yaml': 'yaml',
            'yml': 'yaml',
            'xml': 'xml',
            'sql': 'sql',
            'sh': 'shell',
            'bash': 'shell'
          }
          setLanguage(langMap[ext || ''] || 'plaintext')
        }
      } catch (err) {
        console.error('Failed to load file:', err)
        setContent(`// Error loading file: ${(err as Error).message}`)
      }
      setLoading(false)
    }

    loadFile()
  }, [filePath, projectId])

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor
  }

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Empty state when no file is selected
  if (!filePath) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground">
        <FileCode className="h-16 w-16 mb-4 opacity-20" />
        <p className="text-lg font-medium">No file selected</p>
        <p className="text-sm mt-2">Select a file from the file tree or ask AI to create one</p>
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        defaultLanguage={language}
        value={content}
        theme="vs-dark"
        onMount={handleEditorDidMount}
        onChange={(value) => value && setContent(value)}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          roundedSelection: true,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          padding: { top: 16 }
        }}
      />
    </div>
  )
}

export { EditorPanel as Editor }
