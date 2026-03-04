import { useState, useEffect, useCallback } from 'react'
import { Cloud, CloudOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { clsx } from 'clsx'

type SandboxStatus = 'checking' | 'connected' | 'disconnected' | 'error'

interface StatusBarProps {
  projectId?: string
}

export function StatusBar({ projectId }: StatusBarProps) {
  const [sandboxStatus, setSandboxStatus] = useState<SandboxStatus>('checking')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const checkSandboxStatus = useCallback(async () => {
    if (!projectId) {
      setSandboxStatus('disconnected')
      setErrorMessage(null)
      return
    }

    setSandboxStatus('checking')
    setErrorMessage(null)

    try {
      // Check if sandbox config exists
      const config = await window.api?.config.loadSandbox()
      if (!config || !config.apiKey) {
        setSandboxStatus('disconnected')
        setErrorMessage('未配置沙箱')
        return
      }

      // Try to get or create sandbox
      const result = await window.api?.sandbox.getOrCreate(projectId)
      if (result && 'error' in result) {
        setSandboxStatus('error')
        setErrorMessage(result.error)
      } else {
        setSandboxStatus('connected')
        setErrorMessage(null)
      }
    } catch (err) {
      setSandboxStatus('error')
      setErrorMessage((err as Error).message)
    }
  }, [projectId])

  useEffect(() => {
    checkSandboxStatus()
  }, [checkSandboxStatus])

  const statusConfig = {
    checking: {
      icon: Loader2,
      label: '检查中...',
      className: 'text-muted-foreground',
      iconClass: 'animate-spin'
    },
    connected: {
      icon: CheckCircle,
      label: '沙箱已连接',
      className: 'text-green-500',
      iconClass: ''
    },
    disconnected: {
      icon: CloudOff,
      label: errorMessage || '沙箱未连接',
      className: 'text-muted-foreground',
      iconClass: ''
    },
    error: {
      icon: AlertCircle,
      label: errorMessage || '连接错误',
      className: 'text-yellow-500',
      iconClass: ''
    }
  }

  const config = statusConfig[sandboxStatus]
  const StatusIcon = config.icon

  return (
    <div className="h-6 bg-muted/30 border-t border-border/60 flex items-center px-3 text-xs select-none">
      {/* Left section - Sandbox status */}
      <div className="flex items-center gap-1.5">
        <StatusIcon className={clsx('h-3.5 w-3.5', config.className, config.iconClass)} />
        <span className={config.className}>{config.label}</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right section - Additional info */}
      <div className="flex items-center gap-4 text-muted-foreground">
        {projectId && (
          <span className="flex items-center gap-1">
            <Cloud className="h-3.5 w-3.5" />
            E2B Sandbox
          </span>
        )}
      </div>
    </div>
  )
}
