import { ipcMain, shell, BrowserWindow } from 'electron'
import * as db from '../database'
import * as config from '../services/config'
import { createAIService } from '../services/ai'
import { createSandboxClient } from '../services/sandbox'
import type { AIConfig } from '../services/ai/types'
import type { SandboxConfig } from '../services/sandbox/types'
import type { Project, Session, Message, ChatEvent } from '../../shared/types'
import type { ToolDefinition } from '../../shared/types'

// Sandbox tools definition
const SANDBOX_TOOLS: ToolDefinition[] = [
  {
    name: 'read_file',
    description: 'Read a file from the sandbox filesystem',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'The path to the file to read' }
      },
      required: ['path']
    }
  },
  {
    name: 'write_file',
    description: 'Write content to a file in the sandbox filesystem. Creates directories if needed.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'The path to the file to write' },
        content: { type: 'string', description: 'The content to write to the file' }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'list_dir',
    description: 'List contents of a directory in the sandbox',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'The path to the directory to list' }
      },
      required: ['path']
    }
  },
  {
    name: 'execute_command',
    description: 'Execute a shell command in the sandbox (e.g., npm install, npm run dev)',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The command to execute' }
      },
      required: ['command']
    }
  },
  {
    name: 'mkdir',
    description: 'Create a directory in the sandbox',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'The path of the directory to create' }
      },
      required: ['path']
    }
  },
  {
    name: 'delete_file',
    description: 'Delete a file from the sandbox',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'The path to the file to delete' }
      },
      required: ['path']
    }
  }
]

// Store active sandbox ID (per project)
const projectSandboxes = new Map<string, string>()

// Register all IPC handlers
export function registerIpcHandlers(): void {
  // ============ Shell Handlers ============

  ipcMain.handle('shell:openExternal', async (_event, url: string): Promise<void> => {
    await shell.openExternal(url)
  })

  // ============ AI Handlers ============

  // Send chat message to AI with tool support (Agent Loop)
  ipcMain.handle('ai:chat', async (event, messages: { role: string; content: string; toolCallId?: string }[], projectId?: string): Promise<void> => {
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

    // Get sandbox config
    const sandboxConfigStr = db.getSetting('sandbox_config')
    let sandboxConfig: SandboxConfig | null = null
    if (sandboxConfigStr) {
      try {
        const sandboxConfigData = JSON.parse(sandboxConfigStr)
        const sandboxApiKey = await config.getApiKey('sandbox_main')
        if (sandboxApiKey) {
          sandboxConfig = {
            apiKey: sandboxApiKey,
            baseUrl: sandboxConfigData.baseUrl,
            timeout: 60000
          }
        }
      } catch {
        // Sandbox not configured, continue without it
      }
    }

    const aiConfig: AIConfig = {
      provider: aiConfigData.provider,
      apiKey,
      baseUrl: aiConfigData.baseUrl,
      model: aiConfigData.model
    }

    try {
      const aiService = createAIService(aiConfig)
      aiService.setTools(SANDBOX_TOOLS)

      const sandboxClient = sandboxConfig ? createSandboxClient(sandboxConfig) : null

      // Get or create sandbox for project
      let sandboxId: string | null = null
      if (sandboxClient && projectId) {
        sandboxId = projectSandboxes.get(projectId) || null
        if (!sandboxId) {
          try {
            const sandboxInfo = await sandboxClient.create('nodejs-20')
            sandboxId = sandboxInfo.id
            projectSandboxes.set(projectId, sandboxId)
          } catch (err) {
            console.error('Failed to create sandbox:', err)
          }
        }
      }

      // Convert messages
      const formattedMessages: Message[] = messages.map((m, i) => ({
        id: `msg-${i}`,
        role: m.role as 'user' | 'assistant' | 'system' | 'tool',
        content: m.content,
        timestamp: new Date(),
        ...(m.toolCallId && { toolCallId: m.toolCallId })
      }))

      // Agent loop - handle tool calls
      let currentMessages = [...formattedMessages]
      let iterations = 0
      const maxIterations = 20 // Prevent infinite loops

      while (iterations < maxIterations) {
        iterations++
        let hasToolCalls = false
        const toolCalls: Array<{ id: string; name: string; input: unknown }> = []

        // Stream AI response
        for await (const chatEvent of aiService.chat(currentMessages)) {
          win.webContents.send('ai:chat:event', chatEvent)

          if (chatEvent.type === 'tool_use') {
            hasToolCalls = true
            toolCalls.push({
              id: chatEvent.toolCallId || `tool-${Date.now()}`,
              name: chatEvent.toolName || '',
              input: chatEvent.toolInput || {}
            })
          }
        }

        // If no tool calls, we're done
        if (!hasToolCalls) break

        // Execute tool calls and collect results
        for (const toolCall of toolCalls) {
          if (!sandboxClient || !sandboxId) {
            win.webContents.send('ai:chat:event', {
              type: 'tool_result',
              toolCallId: toolCall.id,
              toolName: toolCall.name,
              toolResult: { error: 'Sandbox not available. Please configure sandbox settings.' }
            } as ChatEvent)
            continue
          }

          try {
            let result: unknown

            switch (toolCall.name) {
              case 'read_file':
                result = await sandboxClient.readFile(sandboxId, (toolCall.input as { path: string }).path)
                break

              case 'write_file': {
                const { path, content } = toolCall.input as { path: string; content: string }
                await sandboxClient.writeFile(sandboxId, path, content)
                result = { success: true, message: `File ${path} written successfully` }
                break
              }

              case 'list_dir':
                result = await sandboxClient.listDir(sandboxId, (toolCall.input as { path: string }).path)
                break

              case 'execute_command': {
                const { command } = toolCall.input as { command: string }
                const outputs: string[] = []
                for await (const cmdEvent of sandboxClient.execute(sandboxId, command)) {
                  if (cmdEvent.type === 'stdout') {
                    outputs.push(cmdEvent.content || '')
                    // Also send command output to renderer
                    win.webContents.send('ai:chat:event', {
                      type: 'content',
                      content: `\n[cmd] ${cmdEvent.content}`
                    } as ChatEvent)
                  } else if (cmdEvent.type === 'stderr') {
                    outputs.push(`[stderr] ${cmdEvent.content || ''}`)
                  }
                }
                result = { output: outputs.join('\n') }
                break
              }

              case 'mkdir':
                await sandboxClient.mkdir(sandboxId, (toolCall.input as { path: string }).path)
                result = { success: true }
                break

              case 'delete_file':
                await sandboxClient.deleteFile(sandboxId, (toolCall.input as { path: string }).path)
                result = { success: true }
                break

              default:
                result = { error: `Unknown tool: ${toolCall.name}` }
            }

            win.webContents.send('ai:chat:event', {
              type: 'tool_result',
              toolCallId: toolCall.id,
              toolName: toolCall.name,
              toolResult: result
            } as ChatEvent)

            // Add tool result to messages for next iteration
            currentMessages.push({
              id: `tool-result-${toolCall.id}`,
              role: 'tool',
              content: JSON.stringify(result),
              timestamp: new Date(),
              toolCallId: toolCall.id
            } as Message & { toolCallId: string })

          } catch (err) {
            const errorResult = { error: (err as Error).message }
            win.webContents.send('ai:chat:event', {
              type: 'tool_result',
              toolCallId: toolCall.id,
              toolName: toolCall.name,
              toolResult: errorResult
            } as ChatEvent)

            currentMessages.push({
              id: `tool-result-${toolCall.id}`,
              role: 'tool',
              content: JSON.stringify(errorResult),
              timestamp: new Date(),
              toolCallId: toolCall.id
            } as Message & { toolCallId: string })
          }
        }
      }

    } catch (error) {
      win.webContents.send('ai:chat:error', (error as Error).message)
    }
  })

  // Abort AI chat
  ipcMain.handle('ai:chat:abort', async (): Promise<void> => {
    // Signal abort if needed
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
