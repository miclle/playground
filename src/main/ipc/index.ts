import { ipcMain, shell, BrowserWindow } from 'electron'
import * as db from '../database'
import * as config from '../services/config'
import { createAIService } from '../services/ai'
import type { AIConfig } from '../services/ai/types'
import type { Project, Session, Message } from '../../shared/types'

// Store active AI service and abort controller
let activeAbortController: AbortController | null = null

// Register all IPC handlers
export function registerIpcHandlers(): void {
  // ============ Shell Handlers ============

  ipcMain.handle('shell:openExternal', async (_event, url: string): Promise<void> => {
    await shell.openExternal(url)
  })

  // ============ AI Handlers ============

  // Send chat message to AI
  ipcMain.handle('ai:chat', async (event, messages: { role: string; content: string }[]): Promise<void> => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return

    // Get AI config from settings
    const aiConfigStr = db.getSetting('ai_config')
    if (!aiConfigStr) {
      win.webContents.send('ai:chat:error', 'AI not configured. Please configure AI settings first.')
      return
    }

    let aiConfigData: { provider: 'openai' | 'claude'; apiKey?: string; baseUrl?: string; model?: string }
    try {
      aiConfigData = JSON.parse(aiConfigStr)
    } catch {
      win.webContents.send('ai:chat:error', 'Invalid AI configuration')
      return
    }

    // Get API key from secure storage
    const apiKey = await config.getApiKey('ai_main')
    if (!apiKey) {
      win.webContents.send('ai:chat:error', 'AI API key not found. Please configure AI settings.')
      return
    }

    const aiConfig: AIConfig = {
      provider: aiConfigData.provider,
      apiKey,
      baseUrl: aiConfigData.baseUrl,
      model: aiConfigData.model
    }

    try {
      const aiService = createAIService(aiConfig)
      activeAbortController = new AbortController()

      // Convert messages to the format expected by AI service
      const formattedMessages: Message[] = messages.map((m, i) => ({
        id: `msg-${i}`,
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
        timestamp: new Date()
      }))

      // Stream response
      for await (const chatEvent of aiService.chat(formattedMessages)) {
        if (activeAbortController.signal.aborted) break
        win.webContents.send('ai:chat:event', chatEvent)
      }
    } catch (error) {
      win.webContents.send('ai:chat:error', (error as Error).message)
    }
  })

  // Abort AI chat
  ipcMain.handle('ai:chat:abort', async (): Promise<void> => {
    if (activeAbortController) {
      activeAbortController.abort()
      activeAbortController = null
    }
  })

  // ============ Config Handlers ============

  // Save AI config
  ipcMain.handle('config:save:ai', async (_event, data: { provider: string; apiKey: string; baseUrl?: string; model?: string }): Promise<void> => {
    // Save API key to secure storage
    await config.storeApiKey('ai_main', data.apiKey)
    // Save non-sensitive config to database
    db.setSetting('ai_config', JSON.stringify({
      provider: data.provider,
      baseUrl: data.baseUrl,
      model: data.model
    }))
  })

  // Load AI config
  ipcMain.handle('config:load:ai', async (): Promise<{ provider: string; apiKey: string; baseUrl?: string; model?: string } | null> => {
    const configStr = db.getSetting('ai_config')
    if (!configStr) return null

    try {
      const configData = JSON.parse(configStr)
      const apiKey = await config.getApiKey('ai_main')
      return { ...configData, apiKey: apiKey || '' }
    } catch {
      return null
    }
  })

  // Save sandbox config
  ipcMain.handle('config:save:sandbox', async (_event, data: { apiKey: string; baseUrl?: string; template?: string }): Promise<void> => {
    await config.storeApiKey('sandbox_main', data.apiKey)
    db.setSetting('sandbox_config', JSON.stringify({
      baseUrl: data.baseUrl,
      template: data.template
    }))
  })

  // Load sandbox config
  ipcMain.handle('config:load:sandbox', async (): Promise<{ apiKey: string; baseUrl?: string; template?: string } | null> => {
    const configStr = db.getSetting('sandbox_config')
    if (!configStr) return null

    try {
      const configData = JSON.parse(configStr)
      const apiKey = await config.getApiKey('sandbox_main')
      return { ...configData, apiKey: apiKey || '' }
    } catch {
      return null
    }
  })

  // Save storage config
  ipcMain.handle('config:save:storage', async (_event, data: { type: string; s3?: { bucket: string; region: string }; github?: { token: string; repo: string } }): Promise<void> => {
    if (data.github?.token) {
      await config.storeApiKey('github_main', data.github.token)
    }
    db.setSetting('storage_config', JSON.stringify({
      type: data.type,
      s3: data.s3 ? { bucket: data.s3.bucket, region: data.s3.region } : undefined,
      github: data.github ? { repo: data.github.repo } : undefined
    }))
  })

  // Load storage config
  ipcMain.handle('config:load:storage', async (): Promise<{ type: string; s3?: { bucket: string; region: string }; github?: { token: string; repo: string } } | null> => {
    const configStr = db.getSetting('storage_config')
    if (!configStr) return null

    try {
      const configData = JSON.parse(configStr)
      if (configData.github) {
        const token = await config.getApiKey('github_main')
        configData.github.token = token || ''
      }
      return configData
    } catch {
      return null
    }
  })

  // ============ Project Handlers ============

  ipcMain.handle('project:create', async (_event, data: { name: string; description?: string }): Promise<Project> => {
    return db.createProject(data.name, data.description)
  })

  ipcMain.handle('project:get', async (_event, id: string): Promise<Project | null> => {
    return db.getProject(id)
  })

  ipcMain.handle('project:list', async (): Promise<Project[]> => {
    return db.listProjects()
  })

  ipcMain.handle('project:update', async (_event, id: string, data: {
    name?: string
    description?: string
    sandboxId?: string
  }): Promise<Project | null> => {
    return db.updateProject(id, data)
  })

  ipcMain.handle('project:delete', async (_event, id: string): Promise<boolean> => {
    return db.deleteProject(id)
  })

  // ============ Session Handlers ============

  ipcMain.handle('session:create', async (_event, projectId: string): Promise<Session> => {
    return db.createSession(projectId)
  })

  ipcMain.handle('session:get', async (_event, id: string): Promise<Session | null> => {
    return db.getSession(id)
  })

  ipcMain.handle('session:list', async (_event, projectId: string): Promise<Session[]> => {
    return db.listSessions(projectId)
  })

  ipcMain.handle('session:delete', async (_event, id: string): Promise<boolean> => {
    return db.deleteSession(id)
  })

  // ============ Message Handlers ============

  ipcMain.handle('message:add', async (_event, sessionId: string, role: 'user' | 'assistant' | 'system', content: string): Promise<Message> => {
    return db.addMessage(sessionId, role, content)
  })

  ipcMain.handle('message:list', async (_event, sessionId: string): Promise<Message[]> => {
    return db.getSessionMessages(sessionId)
  })

  // ============ Settings Handlers ============

  ipcMain.handle('settings:get', async (_event, key: string): Promise<string | null> => {
    return db.getSetting(key)
  })

  ipcMain.handle('settings:set', async (_event, key: string, value: string): Promise<void> => {
    db.setSetting(key, value)
  })

  // ============ Configuration/Profile Handlers ============

  ipcMain.handle('profile:save', async (_event, profile: config.Profile): Promise<void> => {
    await config.saveProfile(profile)
    config.registerProfileId(profile.id)
  })

  ipcMain.handle('profile:load', async (_event, id: string): Promise<config.Profile | null> => {
    return config.loadProfile(id)
  })

  ipcMain.handle('profile:delete', async (_event, id: string): Promise<void> => {
    await config.deleteProfile(id)
  })

  ipcMain.handle('profile:listIds', async (): Promise<string[]> => {
    return config.listProfileIds()
  })

  ipcMain.handle('profile:getActive', async (): Promise<string | null> => {
    return config.getActiveProfileId()
  })

  ipcMain.handle('profile:setActive', async (_event, id: string): Promise<void> => {
    config.setActiveProfileId(id)
  })
}
