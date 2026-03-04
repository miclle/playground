import { useState, useEffect, useCallback } from 'react'
import { Bot, Cloud, CloudOff, Loader2, AlertCircle, CheckCircle, Sparkles } from 'lucide-react'
import { clsx } from 'clsx'

type ConnectionStatus = 'checking' | 'connected' | 'disconnected' | 'error'

interface StatusBarProps {
  projectId?: string
}

export function StatusBar({ projectId }: StatusBarProps) {
  const [sandboxStatus, setSandboxStatus] = useState<ConnectionStatus>('checking')
  const [sandboxError, setSandboxError] = useState<string | null>(null)

  const [aiStatus, setAiStatus] = useState<ConnectionStatus>('checking')
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiProvider, setAiProvider] = useState<string | null>(null)

  // Check AI configuration
  const checkAiStatus = useCallback(async () => {
    setAiStatus('checking')
    setAiError(null)

    try {
      const config = await window.api?.config.loadAI()
      if (!config || !config.apiKey) {
        setAiStatus('disconnected')
        setAiError(null)
        return
      }

      setAiProvider(config.provider === 'claude' ? 'Claude' : 'OpenAI')
      setAiStatus('connected')
      setAiError(null)
    } catch (err) {
      setAiStatus('error')
      setAiError((err as Error).message)
    }
  }, [])

  // Check Sandbox configuration
  const checkSandboxStatus = useCallback(async () => {
    if (!projectId) {
      setSandboxStatus('disconnected')
      setSandboxError(null)
      return
    }

    setSandboxStatus('checking')
    setSandboxError(null)

    try {
      const config = await window.api?.config.loadSandbox()
      if (!config || !config.apiKey) {
        setSandboxStatus('disconnected')
        setSandboxError('未配置')
        return
      }

      const result = await window.api?.sandbox.getOrCreate(projectId)
      if (result && 'error' in result) {
        setSandboxStatus('error')
        setSandboxError(result.error)
      } else {
        setSandboxStatus('connected')
        setSandboxError(null)
      }
    } catch (err) {
      setSandboxStatus('error')
      setSandboxError((err as Error).message)
    }
  }, [projectId])

  useEffect(() => {
    checkAiStatus()
    checkSandboxStatus()
  }, [checkAiStatus, checkSandboxStatus])

  const getStatusConfig = (status: ConnectionStatus, errorMsg: string | null, connectedLabel: string) => {
    const configs = {
      checking: {
        icon: Loader2,
        label: '检查中...',
        className: 'text-muted-foreground',
        iconClass: 'animate-spin'
      },
      connected: {
        icon: CheckCircle,
        label: connectedLabel,
        className: 'text-green-500',
        iconClass: ''
      },
      disconnected: {
        icon: CloudOff,
        label: errorMsg || '未配置',
        className: 'text-muted-foreground',
        iconClass: ''
      },
      error: {
        icon: AlertCircle,
        label: errorMsg || '错误',
        className: 'text-yellow-500',
        iconClass: ''
      }
    }
    return configs[status]
  }

  const aiConfig = getStatusConfig(aiStatus, aiError, aiProvider || 'AI')
  const sandboxConfig = getStatusConfig(sandboxStatus, sandboxError, 'E2B')
  const AiIcon = aiConfig.icon
  const SandboxIcon = sandboxConfig.icon

  return (
    <div className="h-6 bg-muted/30 border-t border-border/60 flex items-center px-3 text-xs select-none">
      {/* Left section - AI status */}
      <div className="flex items-center gap-1.5">
        <AiIcon className={clsx('h-3.5 w-3.5', aiConfig.className, aiConfig.iconClass)} />
        <Bot className={clsx('h-3 w-3', aiConfig.className)} />
        <span className={aiConfig.className}>{aiConfig.label}</span>
      </div>

      {/* Divider */}
      <div className="w-px h-3 bg-border/60 mx-3" />

      {/* Sandbox status */}
      <div className="flex items-center gap-1.5">
        <SandboxIcon className={clsx('h-3.5 w-3.5', sandboxConfig.className, sandboxConfig.iconClass)} />
        <Cloud className={clsx('h-3 w-3', sandboxConfig.className)} />
        <span className={sandboxConfig.className}>{sandboxConfig.label}</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right section - Branding */}
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Sparkles className="h-3 w-3" />
        <span>Playground</span>
      </div>
    </div>
  )
}
