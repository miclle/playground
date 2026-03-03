import { useRef, useEffect, useState } from 'react'
import { Loader2, RefreshCw, ExternalLink } from 'lucide-react'

interface PreviewProps {
  url?: string
  htmlContent?: string
}

export function Preview({ url, htmlContent }: PreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    setError(null)
  }, [url, htmlContent])

  const handleLoad = () => {
    setIsLoading(false)
  }

  const handleError = () => {
    setIsLoading(false)
    setError('Failed to load preview')
  }

  const handleRefresh = () => {
    if (iframeRef.current) {
      setIsLoading(true)
      setError(null)
      iframeRef.current.src = iframeRef.current.src
    }
  }

  const handleOpenExternal = () => {
    if (url) {
      window.electron?.shell?.openExternal(url)
    }
  }

  if (!url && !htmlContent) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p>No preview available</p>
          <p className="text-sm mt-1">Run your code to see the output</p>
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
        {htmlContent ? (
          <iframe
            ref={iframeRef}
            srcDoc={htmlContent}
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
