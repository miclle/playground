import { ipcMain, shell, BrowserWindow, app } from 'electron'
import * as db from '../database'
import * as config from '../services/config'
import { createAIService } from '../services/ai'
import { createSandboxClient } from '../services/sandbox'
import { createStorageBackend } from '../services/storage'
import { updaterService } from '../services/updater'
import type { AIConfig } from '../services/ai/types'
import type { Project, Session, Message, ChatEvent } from '../../shared/types'
import type { ToolDefinition } from '../../shared/types'
import type { Artifact } from '../../shared/types'

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

// Store active sandbox ID (per project) and sandbox client
const projectSandboxes = new Map<string, string>()
let globalSandboxClient: ReturnType<typeof createSandboxClient> | null = null

// Get or create sandbox client
async function getSandboxClient(): Promise<{ client: ReturnType<typeof createSandboxClient> | null; error: string | null }> {
  // Return cached client if available
  if (globalSandboxClient) {
    console.log('[Sandbox] Using cached client')
    return { client: globalSandboxClient, error: null }
  }

  // Load sandbox config from database
  const sandboxConfigStr = db.getSetting('sandbox_config')
  console.log('[Sandbox] Config string:', sandboxConfigStr ? 'exists' : 'not found')

  if (!sandboxConfigStr) {
    return { client: null, error: 'Sandbox config not found. Please configure sandbox settings in Settings > Sandbox.' }
  }

  try {
    const sandboxConfigData = JSON.parse(sandboxConfigStr)
    console.log('[Sandbox] Config data:', { baseUrl: sandboxConfigData.baseUrl, template: sandboxConfigData.template })

    const sandboxApiKey = await config.getApiKey('sandbox_main')
    console.log('[Sandbox] API key:', sandboxApiKey ? `exists (${sandboxApiKey.length} chars)` : 'not found')

    if (!sandboxApiKey) {
      return { client: null, error: 'Sandbox API key not found. Please configure sandbox settings in Settings > Sandbox.' }
    }

    const baseUrl = sandboxConfigData.baseUrl || 'https://api.e2b.dev'
    console.log('[Sandbox] Creating client with baseUrl:', baseUrl)

    globalSandboxClient = createSandboxClient({
      apiKey: sandboxApiKey,
      baseUrl: baseUrl,
      timeout: 300000 // 5 minutes for long-running operations
    })
    console.log('[Sandbox] Client created successfully')
    return { client: globalSandboxClient, error: null }
  } catch (err) {
    const errorMsg = `Failed to create sandbox client: ${(err as Error).message}`
    console.error('[Sandbox]', errorMsg, err)
    return { client: null, error: errorMsg }
  }
}

// Reset sandbox client (call when config changes)
function resetSandboxClient(): void {
  globalSandboxClient = null
}

// Check if sandbox is still alive, recreate if needed
async function ensureSandboxAlive(projectId: string, sandboxId: string): Promise<{ alive: boolean; newSandboxId?: string }> {
  const { client: sandboxClient } = await getSandboxClient()
  if (!sandboxClient) {
    return { alive: false }
  }

  try {
    // Try to get sandbox info to check if it's still alive
    const info = await sandboxClient.getInfo(sandboxId)
    if (info && info.status === 'running') {
      return { alive: true }
    }
  } catch (err) {
    // Sandbox is not accessible
    console.log('[Sandbox] Sandbox not accessible, will recreate:', (err as Error).message)
  }

  // Sandbox is dead, recreate it
  try {
    const sandboxConfigStr = db.getSetting('sandbox_config')
    const sandboxConfigData = sandboxConfigStr ? JSON.parse(sandboxConfigStr) : {}
    const template = sandboxConfigData.template || 'nodejs-20'

    console.log('[Sandbox] Recreating sandbox for project:', projectId)
    const sandboxInfo = await sandboxClient.create(template)
    projectSandboxes.set(projectId, sandboxInfo.id)
    db.updateProject(projectId, { sandboxId: sandboxInfo.id })
    console.log('[Sandbox] Recreated sandbox:', sandboxInfo.id)
    return { alive: true, newSandboxId: sandboxInfo.id }
  } catch (err) {
    console.error('[Sandbox] Failed to recreate sandbox:', err)
    return { alive: false }
  }
}

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

    const aiConfig: AIConfig = {
      provider: aiConfigData.provider,
      apiKey,
      baseUrl: aiConfigData.baseUrl,
      model: aiConfigData.model
    }

    try {
      const aiService = createAIService(aiConfig)
      aiService.setTools(SANDBOX_TOOLS)

      // Get sandbox client using global function
      const { client: sandboxClient, error: sandboxError } = await getSandboxClient()

      // Get or create sandbox for project
      let sandboxId: string | null = null
      if (sandboxClient && projectId) {
        sandboxId = projectSandboxes.get(projectId) || null
        if (!sandboxId) {
          try {
            console.log('[Sandbox] Creating new sandbox for project:', projectId)
            const sandboxConfigStr = db.getSetting('sandbox_config')
            const sandboxConfigData = sandboxConfigStr ? JSON.parse(sandboxConfigStr) : {}
            const template = sandboxConfigData.template || 'nodejs-20'

            const sandboxInfo = await sandboxClient.create(template)
            sandboxId = sandboxInfo.id
            projectSandboxes.set(projectId, sandboxId)
            console.log('[Sandbox] Created sandbox:', sandboxId)
          } catch (err) {
            console.error('[Sandbox] Failed to create sandbox:', err)
          }
        } else {
          console.log('[Sandbox] Using existing sandbox:', sandboxId)
        }
      } else if (sandboxError) {
        console.error('[Sandbox] Client not available:', sandboxError)
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
      const currentMessages = [...formattedMessages]
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
            console.log('[IPC] Received tool_use event:', { toolName: chatEvent.toolName, toolCallId: chatEvent.toolCallId, toolInput: chatEvent.toolInput })
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
          console.log('[IPC] Executing tool call:', { id: toolCall.id, name: toolCall.name, input: toolCall.input })

          // Check if toolInput contains error from JSON parsing failure
          if (toolCall.input && '_error' in toolCall.input) {
            console.error('[IPC] Tool input contains error, skipping execution:', toolCall.input)
            win.webContents.send('ai:chat:event', {
              type: 'tool_result',
              toolCallId: toolCall.id,
              toolName: toolCall.name,
              toolResult: { error: 'Tool input parsing failed. Please try a simpler request.' }
            } as ChatEvent)

            // Add error message to conversation
            currentMessages.push({
              id: `tool-error-${toolCall.id}`,
              role: 'tool',
              content: JSON.stringify({ error: 'Tool input parsing failed' }),
              timestamp: new Date(),
              toolCallId: toolCall.id
            } as Message & { toolCallId: string })
            continue
          }

          if (!sandboxClient || !sandboxId) {
            const errorMsg = sandboxError || 'Sandbox not available. Please configure sandbox settings in Settings > Sandbox.'
            win.webContents.send('ai:chat:event', {
              type: 'tool_result',
              toolCallId: toolCall.id,
              toolName: toolCall.name,
              toolResult: { error: errorMsg }
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
                const input = toolCall.input as { path?: string; content?: string }
                console.log('[IPC] write_file input:', input, 'sandboxId:', sandboxId)
                if (!input.path || !input.content) {
                  result = { error: `Missing required parameters. Got: ${JSON.stringify(input)}` }
                  console.error('[IPC] write_file failed: missing parameters')
                } else {
                  try {
                    // Normalize path - if not absolute or doesn't start with /home/user, prepend it
                    let writePath = input.path
                    if (!writePath.startsWith('/home/user/') && !writePath.startsWith('/')) {
                      writePath = `/home/user/${writePath}`
                    } else if (!writePath.startsWith('/home/user/') && writePath.startsWith('/')) {
                      // Absolute path but not in /home/user, redirect to /home/user
                      const filename = writePath.split('/').pop() || writePath
                      writePath = `/home/user/${filename}`
                    }
                    console.log('[IPC] Writing file to sandbox:', sandboxId, 'path:', writePath, 'content length:', input.content.length)
                    await sandboxClient.writeFile(sandboxId, writePath, input.content)
                    result = { success: true, message: `File ${writePath} written successfully` }
                    console.log('[IPC] File written successfully:', writePath, 'to sandbox:', sandboxId)

                    // Notify renderer to refresh file list
                    console.log('[IPC] Sending sandbox:files:changed event')
                    win.webContents.send('sandbox:files:changed', { sandboxId, path: writePath })
                  } catch (writeErr) {
                    result = { error: `Failed to write file: ${(writeErr as Error).message}` }
                    console.error('[IPC] write_file error:', writeErr)
                  }
                }
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
    console.log('[Sandbox] Saving config:', { baseUrl: data.baseUrl, template: data.template, apiKeyLength: data.apiKey?.length })
    await config.storeApiKey('sandbox_main', data.apiKey)
    db.setSetting('sandbox_config', JSON.stringify({
      baseUrl: data.baseUrl,
      template: data.template
    }))
    // Reset sandbox client so it will be recreated with new config
    resetSandboxClient()
    console.log('[Sandbox] Config saved, client reset')

    // Verify save
    const savedConfig = db.getSetting('sandbox_config')
    const savedKey = await config.getApiKey('sandbox_main')
    console.log('[Sandbox] Verification - Config:', savedConfig ? 'exists' : 'missing', 'Key:', savedKey ? 'exists' : 'missing')
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
  ipcMain.handle('config:save:storage', async (_event, data: {
    type: string
    s3?: { bucket: string; region: string; accessKeyId?: string; secretAccessKey?: string }
    github?: { token: string; repo: string }
  }): Promise<void> => {
    if (data.github?.token) {
      await config.storeApiKey('github_main', data.github.token)
    }
    if (data.s3?.accessKeyId) {
      await config.storeApiKey('s3_accessKeyId', data.s3.accessKeyId)
    }
    if (data.s3?.secretAccessKey) {
      await config.storeApiKey('s3_secretAccessKey', data.s3.secretAccessKey)
    }
    db.setSetting('storage_config', JSON.stringify({
      type: data.type,
      s3: data.s3 ? { bucket: data.s3.bucket, region: data.s3.region } : undefined,
      github: data.github ? { repo: data.github.repo } : undefined
    }))
  })

  // Load storage config
  ipcMain.handle('config:load:storage', async (): Promise<{
    type: string
    s3?: { bucket: string; region: string; accessKeyId?: string; secretAccessKey?: string }
    github?: { token: string; repo: string }
  } | null> => {
    const configStr = db.getSetting('storage_config')
    if (!configStr) return null

    try {
      const configData = JSON.parse(configStr)
      if (configData.github) {
        const token = await config.getApiKey('github_main')
        configData.github.token = token || ''
      }
      if (configData.s3) {
        const accessKeyId = await config.getApiKey('s3_accessKeyId')
        const secretAccessKey = await config.getApiKey('s3_secretAccessKey')
        configData.s3.accessKeyId = accessKeyId || ''
        configData.s3.secretAccessKey = secretAccessKey || ''
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

  // ============ Sandbox Handlers ============

  // Get or create sandbox for project
  ipcMain.handle('sandbox:getOrCreate', async (_event, projectId: string): Promise<{ sandboxId: string } | { error: string }> => {
    const { client: sandboxClient, error } = await getSandboxClient()
    if (!sandboxClient) {
      return { error: error || 'Sandbox not configured' }
    }

    let sandboxId = projectSandboxes.get(projectId)
    if (!sandboxId) {
      try {
        const sandboxConfigStr = db.getSetting('sandbox_config')
        const sandboxConfigData = sandboxConfigStr ? JSON.parse(sandboxConfigStr) : {}
        const template = sandboxConfigData.template || 'nodejs-20'

        console.log('[Sandbox] Creating sandbox for project:', projectId, 'template:', template)
        const sandboxInfo = await sandboxClient.create(template)
        sandboxId = sandboxInfo.id
        projectSandboxes.set(projectId, sandboxId)

        // Update project with sandbox ID
        db.updateProject(projectId, { sandboxId })
        console.log('[Sandbox] Created sandbox:', sandboxId)
      } catch (err) {
        console.error('[Sandbox] Failed to create sandbox:', err)
        return { error: `Failed to create sandbox: ${(err as Error).message}` }
      }
    }

    return { sandboxId }
  })

  // List directory contents in sandbox
  ipcMain.handle('sandbox:listDir', async (_event, projectId: string, path: string): Promise<import('../../shared/types').FileInfo[] | { error: string }> => {
    console.log('[IPC] sandbox:listDir called:', { projectId, path, projectSandboxesKeys: Array.from(projectSandboxes.keys()) })
    const { client: sandboxClient, error } = await getSandboxClient()
    if (!sandboxClient) {
      return { error: error || 'Sandbox not configured' }
    }

    let sandboxId = projectSandboxes.get(projectId)
    console.log('[IPC] sandbox:listDir sandboxId:', sandboxId)
    if (!sandboxId) {
      return { error: 'No sandbox found for project' }
    }

    try {
      const result = await sandboxClient.listDir(sandboxId, path)
      console.log('[IPC] sandbox:listDir returning', result.length, 'entries')
      return result
    } catch (err) {
      const errorMsg = (err as Error).message
      console.error('[Sandbox] Failed to list directory:', errorMsg)

      // Check if it's a timeout error - try to recreate sandbox
      if (errorMsg.includes('timeout') || errorMsg.includes('not found') || errorMsg.includes('unavailable')) {
        console.log('[Sandbox] Detected timeout/lost sandbox, attempting to recreate...')
        const result = await ensureSandboxAlive(projectId, sandboxId)

        if (!result.alive) {
          return { error: 'Sandbox was lost and could not be recreated. Please try again.' }
        }

        // Update sandboxId if recreated
        if (result.newSandboxId) {
          sandboxId = result.newSandboxId
        }

        // Retry the operation
        try {
          return await sandboxClient.listDir(sandboxId, path)
        } catch (retryErr) {
          return { error: `Failed after retry: ${(retryErr as Error).message}` }
        }
      }

      return { error: `Failed to list directory: ${errorMsg}` }
    }
  })

  // Read file content from sandbox
  ipcMain.handle('sandbox:readFile', async (_event, projectId: string, path: string): Promise<string | { error: string }> => {
    const { client: sandboxClient, error } = await getSandboxClient()
    if (!sandboxClient) {
      return { error: error || 'Sandbox not configured' }
    }

    const sandboxId = projectSandboxes.get(projectId)
    if (!sandboxId) {
      return { error: 'No sandbox found for project' }
    }

    try {
      return await sandboxClient.readFile(sandboxId, path)
    } catch (err) {
      console.error('[Sandbox] Failed to read file:', err)
      return { error: `Failed to read file: ${(err as Error).message}` }
    }
  })

  // Execute command in sandbox
  ipcMain.handle('sandbox:execute', async (event, projectId: string, command: string): Promise<string | { error: string }> => {
    const { client: sandboxClient, error } = await getSandboxClient()
    if (!sandboxClient) {
      return { error: error || 'Sandbox not configured' }
    }

    const sandboxId = projectSandboxes.get(projectId)
    if (!sandboxId) {
      return { error: 'No sandbox found for project' }
    }

    try {
      const outputs: string[] = []
      for await (const cmdEvent of sandboxClient.execute(sandboxId, command)) {
        if (cmdEvent.type === 'stdout') {
          const content = cmdEvent.content || ''
          outputs.push(content)
          // Stream output to renderer - send to all windows
          BrowserWindow.getAllWindows().forEach(win => {
            if (!win.isDestroyed()) {
              win.webContents.send('sandbox:terminal:output', { content, type: 'stdout' })
            }
          })
        } else if (cmdEvent.type === 'stderr') {
          const content = cmdEvent.content || ''
          outputs.push(`[stderr] ${content}`)
          BrowserWindow.getAllWindows().forEach(win => {
            if (!win.isDestroyed()) {
              win.webContents.send('sandbox:terminal:output', { content, type: 'stderr' })
            }
          })
        } else if (cmdEvent.type === 'error') {
          BrowserWindow.getAllWindows().forEach(win => {
            if (!win.isDestroyed()) {
              win.webContents.send('sandbox:terminal:output', { content: cmdEvent.error || 'Unknown error', type: 'error' })
            }
          })
        }
      }
      return outputs.join('\n')
    } catch (err) {
      console.error('[Sandbox] Failed to execute command:', err)
      return { error: `Failed to execute command: ${(err as Error).message}` }
    }
  })

  // Reset sandbox client when config changes
  ipcMain.handle('sandbox:resetClient', async (): Promise<void> => {
    resetSandboxClient()
  })

  // ============ Storage Handlers ============

  let globalStorageBackend: ReturnType<typeof createStorageBackend> | null = null

  // Get or create storage backend
  async function getStorageBackend(): Promise<{ backend: ReturnType<typeof createStorageBackend> | null; error: string | null }> {
    if (globalStorageBackend) {
      return { backend: globalStorageBackend, error: null }
    }

    const storageConfigStr = db.getSetting('storage_config')
    if (!storageConfigStr) {
      return { backend: null, error: 'Storage not configured' }
    }

    try {
      const storageConfigData = JSON.parse(storageConfigStr)

      // Build full config based on type
      if (storageConfigData.type === 'local') {
        // Local storage needs a base path - use app data directory
        const path = await app.getPath('userData')
        return {
          backend: createStorageBackend({
            type: 'local',
            basePath: `${path}/artifacts`
          })
        }
      }

      if (storageConfigData.type === 's3') {
        // Get S3 credentials from secure storage
        const accessKeyId = await config.getApiKey('s3_accessKeyId')
        const secretAccessKey = await config.getApiKey('s3_secretAccessKey')
        if (!accessKeyId || !secretAccessKey) {
          return { backend: null, error: 'S3 credentials not configured' }
        }
        return {
          backend: createStorageBackend({
            type: 's3',
            bucket: storageConfigData.s3?.bucket || '',
            region: storageConfigData.s3?.region || 'us-east-1',
            accessKeyId,
            secretAccessKey
          })
        }
      }

      if (storageConfigData.type === 'github') {
        const token = await config.getApiKey('github_main')
        if (!token) {
          return { backend: null, error: 'GitHub token not configured' }
        }
        // Parse repo string "owner/repo"
        const [owner, repo] = (storageConfigData.github?.repo || '').split('/')
        return {
          backend: createStorageBackend({
            type: 'github',
            token,
            owner: owner || '',
            repo: repo || ''
          })
        }
      }

      return { backend: null, error: `Unknown storage type: ${storageConfigData.type}` }
    } catch (err) {
      console.error('[Storage] Failed to create backend:', err)
      return { backend: null, error: (err as Error).message }
    }
  }

  // Reset storage backend (call when config changes)
  function resetStorageBackend(): void {
    globalStorageBackend = null
  }

  // Export file from sandbox to storage
  ipcMain.handle('storage:export', async (_event, projectId: string, sandboxPath: string, artifactName?: string): Promise<{ success: boolean; url?: string; error?: string }> => {
    console.log('[Storage] Exporting file:', { projectId, sandboxPath, artifactName })

    const { client: sandboxClient, error: sandboxError } = await getSandboxClient()
    if (!sandboxClient) {
      return { success: false, error: sandboxError || 'Sandbox not available' }
    }

    const sandboxId = projectSandboxes.get(projectId)
    if (!sandboxId) {
      return { success: false, error: 'No sandbox found for project' }
    }

    const { backend: storage, error: storageError } = await getStorageBackend()
    if (!storage) {
      return { success: false, error: storageError || 'Storage not available' }
    }

    try {
      // Read file from sandbox
      const content = await sandboxClient.readFile(sandboxId, sandboxPath)

      // Create artifact
      const name = artifactName || sandboxPath.split('/').pop() || 'artifact'
      const artifact: Artifact = {
        id: `${projectId}-${sandboxPath}`,
        name,
        path: sandboxPath,
        content,
        size: content.length,
        createdAt: new Date()
      }

      // Save to storage
      const result = await storage.save(artifact)
      console.log('[Storage] Export result:', result)

      return {
        success: result.success,
        url: result.url,
        error: result.error
      }
    } catch (err) {
      console.error('[Storage] Export failed:', err)
      return { success: false, error: (err as Error).message }
    }
  })

  // List artifacts in storage
  ipcMain.handle('storage:list', async (_event, filter?: { prefix?: string; limit?: number }): Promise<Artifact[]> => {
    const { backend: storage } = await getStorageBackend()
    if (!storage) {
      return []
    }

    try {
      return await storage.list(filter)
    } catch {
      return []
    }
  })

  // Get artifact from storage
  ipcMain.handle('storage:get', async (_event, id: string): Promise<Artifact | null> => {
    const { backend: storage } = await getStorageBackend()
    if (!storage) {
      return null
    }

    try {
      return await storage.get(id)
    } catch {
      return null
    }
  })

  // Delete artifact from storage
  ipcMain.handle('storage:delete', async (_event, id: string): Promise<{ success: boolean; error?: string }> => {
    const { backend: storage } = await getStorageBackend()
    if (!storage) {
      return { success: false, error: 'Storage not available' }
    }

    try {
      await storage.delete(id)
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // ============ Updater Handlers ============

  // Check for updates
  ipcMain.handle('updater:check', async (): Promise<{ available: boolean; version?: string; error?: string }> => {
    try {
      const info = await updaterService.checkForUpdates()
      if (info) {
        return { available: true, version: info.version }
      }
      return { available: false }
    } catch (err) {
      return { available: false, error: (err as Error).message }
    }
  })

  // Download update
  ipcMain.handle('updater:download', async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const success = await updaterService.downloadUpdate()
      return { success }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // Install update (quit and install)
  ipcMain.handle('updater:install', async (): Promise<void> => {
    updaterService.quitAndInstall()
  })

  // Cancel update download
  ipcMain.handle('updater:cancel', async (): Promise<void> => {
    updaterService.cancelDownload()
  })
}
