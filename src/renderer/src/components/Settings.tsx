import { useState, useEffect } from 'react'
import { X, Key, Cloud, Database, Globe, Loader2, Download, CheckCircle, XCircle, Info, UserCircle, Plus, Trash2 } from 'lucide-react'
import { cn } from '../lib/utils'

interface SettingsProps {
  onClose: () => void
}

type SettingsTab = 'ai' | 'sandbox' | 'storage' | 'general' | 'profiles'

type UpdateStatus = 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'ready' | 'error'

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
  const [s3AccessKeyId, setS3AccessKeyId] = useState('')
  const [s3SecretAccessKey, setS3SecretAccessKey] = useState('')
  const [githubToken, setGithubToken] = useState('')
  const [githubRepo, setGithubRepo] = useState('')

  // Updater Settings
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle')
  const [updateVersion, setUpdateVersion] = useState('')
  const [updateMessage, setUpdateMessage] = useState('')

  // Profile Settings
  const [profileIds, setProfileIds] = useState<string[]>([])
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null)
  const [newProfileName, setNewProfileName] = useState('')
  const [isCreatingProfile, setIsCreatingProfile] = useState(false)

  const tabs = [
    { id: 'ai' as const, label: 'AI Services', icon: Key },
    { id: 'sandbox' as const, label: 'Sandbox', icon: Cloud },
    { id: 'storage' as const, label: 'Storage', icon: Database },
    { id: 'profiles' as const, label: 'Profiles', icon: UserCircle },
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
          setS3AccessKeyId(storageConfig.s3.accessKeyId || '')
          setS3SecretAccessKey(storageConfig.s3.secretAccessKey || '')
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

  // Check for updates
  const handleCheckUpdate = async () => {
    setUpdateStatus('checking')
    setUpdateMessage('')

    try {
      const result = await window.api?.updater.check()
      if (result?.available) {
        setUpdateStatus('available')
        setUpdateVersion(result.version || '')
        setUpdateMessage(`Version ${result.version} is available!`)
      } else if (result?.error) {
        setUpdateStatus('error')
        setUpdateMessage(result.error)
      } else {
        setUpdateStatus('not-available')
        setUpdateMessage('You are on the latest version')
      }
    } catch (err) {
      setUpdateStatus('error')
      setUpdateMessage((err as Error).message)
    }
  }

  // Download update
  const handleDownloadUpdate = async () => {
    setUpdateStatus('downloading')
    setUpdateMessage('Downloading update...')

    try {
      const result = await window.api?.updater.download()
      if (result?.success) {
        setUpdateStatus('ready')
        setUpdateMessage('Update downloaded! Restart to install.')
      } else {
        setUpdateStatus('error')
        setUpdateMessage(result?.error || 'Download failed')
      }
    } catch (err) {
      setUpdateStatus('error')
      setUpdateMessage((err as Error).message)
    }
  }

  // Install update
  const handleInstallUpdate = () => {
    window.api?.updater.install()
  }

  // Load profiles
  const loadProfiles = async () => {
    try {
      const ids = await window.api?.profile.listIds()
      const activeId = await window.api?.profile.getActive()
      setProfileIds(ids || [])
      setActiveProfileId(activeId || null)
    } catch (err) {
      console.error('Failed to load profiles:', err)
    }
  }

  // Create new profile from current settings
  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) return

    setIsCreatingProfile(true)
    try {
      const profile = {
        id: `profile-${Date.now()}`,
        name: newProfileName,
        ai: {
          provider: aiProvider,
          apiKey: aiProvider === 'openai' ? openaiKey : claudeKey,
          baseUrl: aiProvider === 'openai' ? openaiBaseUrl : claudeBaseUrl
        },
        sandbox: {
          apiKey: sandboxApiKey,
          baseUrl: sandboxBaseUrl,
          template: sandboxTemplate
        },
        storage: {
          type: storageType,
          s3: storageType === 's3' ? {
            bucket: s3Bucket,
            region: s3Region
          } : undefined,
          github: storageType === 'github' ? {
            repo: githubRepo
          } : undefined
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await window.api?.profile.save(profile)
      await window.api?.profile.setActive(profile.id)
      setNewProfileName('')
      await loadProfiles()
    } catch (err) {
      console.error('Failed to create profile:', err)
      alert('Failed to create profile: ' + (err as Error).message)
    } finally {
      setIsCreatingProfile(false)
    }
  }

  // Switch profile
  const handleSwitchProfile = async (profileId: string) => {
    try {
      const profile = await window.api?.profile.load(profileId)
      if (!profile) return

      // Load settings from profile
      setAiProvider(profile.ai.provider)
      if (profile.ai.provider === 'openai') {
        setOpenaiKey(profile.ai.apiKey)
        setOpenaiBaseUrl(profile.ai.baseUrl || '')
      } else {
        setClaudeKey(profile.ai.apiKey)
        setClaudeBaseUrl(profile.ai.baseUrl || '')
      }

      setSandboxApiKey(profile.sandbox.apiKey)
      setSandboxBaseUrl(profile.sandbox.baseUrl || '')
      setSandboxTemplate(profile.sandbox.template || 'nodejs')

      setStorageType(profile.storage.type)
      if (profile.storage.type === 's3' && 's3' in profile.storage) {
        setS3Bucket(profile.storage.s3?.bucket || '')
        setS3Region(profile.storage.s3?.region || 'us-east-1')
      }
      if (profile.storage.type === 'github' && 'github' in profile.storage) {
        setGithubToken(profile.storage.github?.token || '')
        setGithubRepo(profile.storage.github?.repo || '')
      }

      // Set as active
      await window.api?.profile.setActive(profileId)
      setActiveProfileId(profileId)
    } catch (err) {
      console.error('Failed to switch profile:', err)
      alert('Failed to switch profile: ' + (err as Error).message)
    }
  }

  // Delete profile
  const handleDeleteProfile = async (profileId: string) => {
    if (profileId === activeProfileId) {
      alert('Cannot delete the active profile')
      return
    }

    if (!confirm('Are you sure you want to delete this profile?')) return

    try {
      await window.api?.profile.delete(profileId)
      await loadProfiles()
    } catch (err) {
      console.error('Failed to delete profile:', err)
      alert('Failed to delete profile: ' + (err as Error).message)
    }
  }

  // Load profiles on mount
  useEffect(() => {
    loadProfiles()
  }, [])

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
        s3: storageType === 's3' ? {
          bucket: s3Bucket,
          region: s3Region,
          accessKeyId: s3AccessKeyId,
          secretAccessKey: s3SecretAccessKey
        } : undefined,
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
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Access Key ID</label>
                      <input
                        type="text"
                        value={s3AccessKeyId}
                        onChange={(e) => setS3AccessKeyId(e.target.value)}
                        className="w-full px-3 py-2 bg-muted/50 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="AKIAIOSFODNN7EXAMPLE"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Secret Access Key</label>
                      <input
                        type="password"
                        value={s3SecretAccessKey}
                        onChange={(e) => setS3SecretAccessKey(e.target.value)}
                        className="w-full px-3 py-2 bg-muted/50 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
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
            ) : activeTab === 'profiles' ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-3">Configuration Profiles</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Save your current configuration as a profile for easy switching later.
                  </p>
                </div>

                {/* Create new profile */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    className="flex-1 px-3 py-2 bg-muted/50 border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="New profile name..."
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateProfile()}
                  />
                  <button
                    onClick={handleCreateProfile}
                    disabled={!newProfileName.trim() || isCreatingProfile}
                    className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isCreatingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Save Current
                  </button>
                </div>

                {/* Profile list */}
                <div className="space-y-2">
                  {profileIds.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      <UserCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p>No profiles yet</p>
                      <p className="text-xs mt-1">Create a profile to save your current settings</p>
                    </div>
                  ) : (
                    profileIds.map((id) => {
                      // Extract name from ID or display as is
                      const displayName = id.replace('profile-', '').replace(/-\d+$/, '') || id
                      const isActive = id === activeProfileId

                      return (
                        <div
                          key={id}
                          className={cn(
                            'flex items-center justify-between px-3 py-2 rounded border',
                            isActive
                              ? 'bg-primary/10 border-primary'
                              : 'bg-muted/30 border-border hover:bg-muted/50'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <UserCircle className={cn(
                              'h-4 w-4',
                              isActive ? 'text-primary' : 'text-muted-foreground'
                            )} />
                            <span className={cn(
                              'text-sm',
                              isActive ? 'font-medium text-foreground' : 'text-muted-foreground'
                            )}>
                              {displayName}
                            </span>
                            {isActive && (
                              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {!isActive && (
                              <>
                                <button
                                  onClick={() => handleSwitchProfile(id)}
                                  className="p-1 hover:bg-accent rounded text-xs text-muted-foreground hover:text-foreground"
                                  title="Switch to this profile"
                                >
                                  Switch
                                </button>
                                <button
                                  onClick={() => handleDeleteProfile(id)}
                                  className="p-1 hover:bg-destructive/20 rounded text-muted-foreground hover:text-destructive"
                                  title="Delete profile"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
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

                {/* Update Section */}
                <div className="pt-4 border-t border-border">
                  <h3 className="text-sm font-medium mb-3">Updates</h3>
                  <div className="space-y-3">
                    {updateStatus === 'idle' && (
                      <button
                        onClick={handleCheckUpdate}
                        className="w-full px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Check for Updates
                      </button>
                    )}
                    {updateStatus === 'checking' && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Checking for updates...
                      </div>
                    )}
                    {updateStatus === 'not-available' && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        {updateMessage || 'You are on the latest version'}
                      </div>
                    )}
                    {updateStatus === 'available' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-blue-600">
                          <Info className="h-4 w-4" />
                          {updateMessage}
                        </div>
                        <button
                          onClick={handleDownloadUpdate}
                          className="w-full px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download Update
                        </button>
                      </div>
                    )}
                    {updateStatus === 'downloading' && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Downloading update...
                      </div>
                    )}
                    {updateStatus === 'ready' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          {updateMessage}
                        </div>
                        <button
                          onClick={handleInstallUpdate}
                          className="w-full px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                        >
                          Restart & Install
                        </button>
                      </div>
                    )}
                    {updateStatus === 'error' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-destructive">
                          <XCircle className="h-4 w-4" />
                          {updateMessage || 'Failed to check for updates'}
                        </div>
                        <button
                          onClick={handleCheckUpdate}
                          className="text-sm text-primary hover:underline"
                        >
                          Try again
                        </button>
                      </div>
                    )}
                  </div>
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
