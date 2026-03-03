import { useState, useEffect } from 'react'
import { X, Key, Cloud, Database, Globe, Loader2 } from 'lucide-react'
import { cn } from '../lib/utils'

interface SettingsProps {
  onClose: () => void
}

type SettingsTab = 'ai' | 'sandbox' | 'storage' | 'general'

export function Settings({ onClose }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('ai')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // AI Settings
  const [aiProvider, setAiProvider] = useState<'openai' | 'claude'>('openai')
  const [openaiKey, setOpenaiKey] = useState('')
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState('')
  const [claudeKey, setClaudeKey] = useState('')
  const [claudeBaseUrl, setClaudeBaseUrl] = useState('')

  // Sandbox Settings
  const [sandboxApiKey, setSandboxApiKey] = useState('')
  const [sandboxBaseUrl, setSandboxBaseUrl] = useState('')
  const [sandboxTemplate, setSandboxTemplate] = useState('nodejs')

  // Storage Settings
  const [storageType, setStorageType] = useState<'local' | 's3' | 'github'>('local')
  const [s3Bucket, setS3Bucket] = useState('')
  const [s3Region, setS3Region] = useState('us-east-1')
  const [githubToken, setGithubToken] = useState('')
  const [githubRepo, setGithubRepo] = useState('')

  const tabs = [
    { id: 'ai' as const, label: 'AI Services', icon: Key },
    { id: 'sandbox' as const, label: 'Sandbox', icon: Cloud },
    { id: 'storage' as const, label: 'Storage', icon: Database },
    { id: 'general' as const, label: 'General', icon: Globe }
  ]

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setIsLoading(true)
    try {
      // Load AI config
      const aiConfig = await window.api?.config.loadAI()
      if (aiConfig) {
        setAiProvider(aiConfig.provider as 'openai' | 'claude')
        if (aiConfig.provider === 'openai') {
          setOpenaiKey(aiConfig.apiKey)
          setOpenaiBaseUrl(aiConfig.baseUrl || '')
        } else {
          setClaudeKey(aiConfig.apiKey)
          setClaudeBaseUrl(aiConfig.baseUrl || '')
        }
      }

      // Load Sandbox config
      const sandboxConfig = await window.api?.config.loadSandbox()
      if (sandboxConfig) {
        setSandboxApiKey(sandboxConfig.apiKey)
        setSandboxBaseUrl(sandboxConfig.baseUrl || '')
        setSandboxTemplate(sandboxConfig.template || 'nodejs')
      }

      // Load Storage config
      const storageConfig = await window.api?.config.loadStorage()
      if (storageConfig) {
        setStorageType(storageConfig.type as 'local' | 's3' | 'github')
        if (storageConfig.s3) {
          setS3Bucket(storageConfig.s3.bucket)
          setS3Region(storageConfig.s3.region)
        }
        if (storageConfig.github) {
          setGithubToken(storageConfig.github.token)
          setGithubRepo(storageConfig.github.repo)
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
    setIsLoading(false)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Save AI config
      await window.api?.config.saveAI({
        provider: aiProvider,
        apiKey: aiProvider === 'openai' ? openaiKey : claudeKey,
        baseUrl: aiProvider === 'openai' ? openaiBaseUrl : claudeBaseUrl
      })

      // Save Sandbox config
      await window.api?.config.saveSandbox({
        apiKey: sandboxApiKey,
        baseUrl: sandboxBaseUrl,
        template: sandboxTemplate
      })

      // Save Storage config
      await window.api?.config.saveStorage({
        type: storageType,
        s3: storageType === 's3' ? { bucket: s3Bucket, region: s3Region } : undefined,
        github: storageType === 'github' ? { token: githubToken, repo: githubRepo } : undefined
      })

      onClose()
    } catch (error) {
      console.error('Failed to save settings:', error)
      alert('Failed to save settings: ' + (error as Error).message)
    }
    setIsSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[600px] h-[500px] bg-background border border-border rounded-lg shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-40 border-r border-border bg-muted/30 p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-left transition-colors',
                  activeTab === tab.id
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Panel */}
          <div className="flex-1 p-4 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : activeTab === 'ai' ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">AI Provider</label>
                  <select
                    value={aiProvider}
                    onChange={(e) => setAiProvider(e.target.value as 'openai' | 'claude')}
                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="openai">OpenAI (GPT-4o)</option>
                    <option value="claude">Claude (Sonnet)</option>
                  </select>
                </div>

                {aiProvider === 'openai' ? (
                  <div>
                    <h3 className="text-sm font-medium mb-3">OpenAI Configuration</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">API Key</label>
                        <input
                          type="password"
                          value={openaiKey}
                          onChange={(e) => setOpenaiKey(e.target.value)}
                          className="w-full px-3 py-2 bg-muted/50 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="sk-..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Base URL (Optional)</label>
                        <input
                          type="text"
                          value={openaiBaseUrl}
                          onChange={(e) => setOpenaiBaseUrl(e.target.value)}
                          className="w-full px-3 py-2 bg-muted/50 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="https://api.openai.com/v1"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-sm font-medium mb-3">Claude Configuration</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">API Key</label>
                        <input
                          type="password"
                          value={claudeKey}
                          onChange={(e) => setClaudeKey(e.target.value)}
                          className="w-full px-3 py-2 bg-muted/50 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="sk-ant-..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Base URL (Optional)</label>
                        <input
                          type="text"
                          value={claudeBaseUrl}
                          onChange={(e) => setClaudeBaseUrl(e.target.value)}
                          className="w-full px-3 py-2 bg-muted/50 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="https://api.anthropic.com"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : activeTab === 'sandbox' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">API Key</label>
                  <input
                    type="password"
                    value={sandboxApiKey}
                    onChange={(e) => setSandboxApiKey(e.target.value)}
                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="e2b-..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Base URL (Optional)</label>
                  <input
                    type="text"
                    value={sandboxBaseUrl}
                    onChange={(e) => setSandboxBaseUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="https://api.e2b.dev"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Default Template</label>
                  <select
                    value={sandboxTemplate}
                    onChange={(e) => setSandboxTemplate(e.target.value)}
                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="nodejs">Node.js</option>
                    <option value="python">Python</option>
                    <option value="go">Go</option>
                  </select>
                </div>
              </div>
            ) : activeTab === 'storage' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Storage Backend</label>
                  <select
                    value={storageType}
                    onChange={(e) => setStorageType(e.target.value as 'local' | 's3' | 'github')}
                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="local">Local Filesystem</option>
                    <option value="s3">AWS S3</option>
                    <option value="github">GitHub</option>
                  </select>
                </div>

                {storageType === 's3' && (
                  <>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">S3 Bucket</label>
                      <input
                        type="text"
                        value={s3Bucket}
                        onChange={(e) => setS3Bucket(e.target.value)}
                        className="w-full px-3 py-2 bg-muted/50 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="my-bucket"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Region</label>
                      <input
                        type="text"
                        value={s3Region}
                        onChange={(e) => setS3Region(e.target.value)}
                        className="w-full px-3 py-2 bg-muted/50 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="us-east-1"
                      />
                    </div>
                  </>
                )}

                {storageType === 'github' && (
                  <>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">GitHub Token</label>
                      <input
                        type="password"
                        value={githubToken}
                        onChange={(e) => setGithubToken(e.target.value)}
                        className="w-full px-3 py-2 bg-muted/50 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="ghp_..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Repository</label>
                      <input
                        type="text"
                        value={githubRepo}
                        onChange={(e) => setGithubRepo(e.target.value)}
                        className="w-full px-3 py-2 bg-muted/50 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="username/repo"
                      />
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Playground v0.0.1</p>
                  <p className="mt-2">AI-powered coding desktop application.</p>
                  <p className="mt-4">
                    <button
                      onClick={() => window.api?.shell.openExternal('https://github.com/miclle/playground')}
                      className="text-primary hover:underline"
                    >
                      GitHub Repository
                    </button>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
