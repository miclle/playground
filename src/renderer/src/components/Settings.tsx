import { useState } from 'react'
import { X, Key, Cloud, Database, Globe } from 'lucide-react'
import { cn } from '../lib/utils'

interface SettingsProps {
  onClose: () => void
}

type SettingsTab = 'ai' | 'sandbox' | 'storage' | 'general'

export function Settings({ onClose }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('ai')

  // AI Settings
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

  const handleSave = async () => {
    // Save settings via IPC
    const settings = {
      ai: {
        openai: { apiKey: openaiKey, baseUrl: openaiBaseUrl },
        claude: { apiKey: claudeKey, baseUrl: claudeBaseUrl }
      },
      sandbox: {
        apiKey: sandboxApiKey,
        baseUrl: sandboxBaseUrl,
        template: sandboxTemplate
      },
      storage: {
        type: storageType,
        s3: { bucket: s3Bucket, region: s3Region },
        github: { token: githubToken, repo: githubRepo }
      }
    }

    await window.electronAPI?.settings.set('ai', settings.ai)
    await window.electronAPI?.settings.set('sandbox', settings.sandbox)
    await window.electronAPI?.settings.set('storage', settings.storage)

    onClose()
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
            {activeTab === 'ai' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-3">OpenAI</h3>
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

                <div>
                  <h3 className="text-sm font-medium mb-3">Claude</h3>
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
              </div>
            )}

            {activeTab === 'sandbox' && (
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
            )}

            {activeTab === 'storage' && (
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
            )}

            {activeTab === 'general' && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p>Playground v0.0.1</p>
                  <p className="mt-2">AI-powered coding desktop application.</p>
                  <p className="mt-4">
                    <a
                      href="#"
                      onClick={() => window.electron?.shell?.openExternal('https://github.com/miclle/playground')}
                      className="text-primary hover:underline"
                    >
                      GitHub Repository
                    </a>
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
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
