import { useRef, useEffect, useState } from 'react'
import { Loader2, RefreshCw, ExternalLink } from 'lucide-react'

interface PreviewProps {
  url?: string
  htmlContent?: string
  filePath?: string
  projectId?: string
}

export function Preview({ url, htmlContent, filePath, projectId }: PreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [content, setContent] = useState<string | undefined>(htmlContent)

  // Load file content from sandbox when filePath changes
  useEffect(() => {
    const loadFile = async () => {
      if (!filePath || !projectId) {
        setContent(htmlContent)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await window.api?.sandbox.readFile(projectId, filePath)
        if (result && typeof result === 'object' && 'error' in result) {
          setError(`Failed to load file: ${result.error}`)
        } else if (typeof result === 'string') {
          setContent(result)
        }
      } catch (err) {
        setError(`Failed to load file: ${(err as Error).message}`)
      } finally {
        setIsLoading(false)
      }
    }

    loadFile()
  }, [filePath, projectId, htmlContent])

  const handleLoad = () => {
    setIsLoading(false)
  }

  const handleError = () => {
    setIsLoading(false)
    setError('Failed to load preview')
  }

  const handleRefresh = () => {
    if (iframeRef.current?.contentWindow) {
      setIsLoading(true)
      setError(null)
      iframeRef.current.contentWindow.location.reload()
    }
  }

  const handleOpenExternal = () => {
    if (url) {
      window.electron?.shell?.openExternal(url)
    }
  }

  if (!url && !htmlContent && !filePath) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p>No preview available</p>
          <p className="text-sm mt-1">Select a file to preview</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-border bg-muted/30">
        <span className="text-xs text-muted-foreground truncate">
          {url || 'Preview'}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            className="p-1 hover:bg-accent rounded"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          {url && (
            <button
              onClick={handleOpenExternal}
              className="p-1 hover:bg-accent rounded"
              title="Open in browser"
            >
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Preview content */}
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-destructive">{error}</p>
          </div>
        )}
        {content ? (
          <iframe
            ref={iframeRef}
            srcDoc={content}
            className="w-full h-full border-0"
            onLoad={handleLoad}
            onError={handleError}
            sandbox="allow-scripts allow-same-origin"
          />
        ) : url ? (
          <iframe
            ref={iframeRef}
            src={url}
            className="w-full h-full border-0"
            onLoad={handleLoad}
            onError={handleError}
          />
        ) : null}
      </div>
    </div>
  )
}
