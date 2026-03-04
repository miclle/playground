import { useRef, useEffect, useState } from 'react'
import Editor from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { Loader2 } from 'lucide-react'

const defaultCode = `// Welcome to Playground
// Start coding or ask AI to help you

function hello() {
  console.log('Hello, World!')
}

hello()
`

interface EditorPanelProps {
  filePath?: string
  projectId?: string
}

export function EditorPanel({ filePath, projectId }: EditorPanelProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const [content, setContent] = useState(defaultCode)
  const [loading, setLoading] = useState(false)
  const [language, setLanguage] = useState('typescript')

  // Load file content when filePath changes
  useEffect(() => {
    const loadFile = async () => {
      if (!filePath || !projectId) {
        setContent(defaultCode)
        return
      }

      setLoading(true)
      try {
        const result = await window.api?.sandbox.readFile(projectId, filePath)
        if (result && 'error' in result) {
          console.error('Failed to load file:', result.error)
          setContent(`// Error loading file: ${result.error}`)
        } else if (result !== undefined) {
          const fileContent = result as string
          setContent(fileContent)
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
