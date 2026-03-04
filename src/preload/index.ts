import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Types for IPC API
export interface IpcApi {
  // Shell operations
  shell: {
    openExternal: (url: string) => Promise<void>
  }

  // AI operations
  ai: {
    chat: (messages: { role: string; content: string }[], projectId?: string) => Promise<void>
    abort: () => Promise<void>
    onEvent: (callback: (event: unknown) => void) => () => void
    onError: (callback: (error: string) => void) => () => void
  }

  // Config operations
  config: {
    saveAI: (data: { provider: string; apiKey: string; baseUrl?: string; model?: string }) => Promise<void>
    loadAI: () => Promise<{ provider: string; apiKey: string; baseUrl?: string; model?: string } | null>
    saveSandbox: (data: { apiKey: string; baseUrl?: string; template?: string }) => Promise<void>
    loadSandbox: () => Promise<{ apiKey: string; baseUrl?: string; template?: string } | null>
    saveStorage: (data: {
      type: string
      s3?: { bucket: string; region: string; accessKeyId?: string; secretAccessKey?: string }
      github?: { token: string; repo: string }
    }) => Promise<void>
    loadStorage: () => Promise<{
      type: string
      s3?: { bucket: string; region: string; accessKeyId?: string; secretAccessKey?: string }
      github?: { token: string; repo: string }
    } | null>
  }

  // Project operations
  project: {
    create: (data: { name: string; description?: string }) => Promise<import('../shared/types').Project>
    get: (id: string) => Promise<import('../shared/types').Project | null>
    list: () => Promise<import('../shared/types').Project[]>
    update: (id: string, data: { name?: string; description?: string; sandboxId?: string }) => Promise<import('../shared/types').Project | null>
    delete: (id: string) => Promise<boolean>
  }

  // Session operations
  session: {
    create: (projectId: string) => Promise<import('../shared/types').Session>
    get: (id: string) => Promise<import('../shared/types').Session | null>
    list: (projectId: string) => Promise<import('../shared/types').Session[]>
    delete: (id: string) => Promise<boolean>
  }

  // Message operations
  message: {
    add: (sessionId: string, role: 'user' | 'assistant' | 'system', content: string) => Promise<import('../shared/types').Message>
    list: (sessionId: string) => Promise<import('../shared/types').Message[]>
  }

  // Sandbox operations
  sandbox: {
    getOrCreate: (projectId: string) => Promise<{ sandboxId: string } | { error: string }>
    listDir: (projectId: string, path: string) => Promise<import('../shared/types').FileInfo[] | { error: string }>
    readFile: (projectId: string, path: string) => Promise<string | { error: string }>
    onFilesChanged: (callback: (data: { sandboxId: string; path: string }) => void) => () => void
  }

  // Storage operations
  storage: {
    export: (projectId: string, sandboxPath: string, artifactName?: string) => Promise<{ success: boolean; url?: string; error?: string }>
    list: (filter?: { prefix?: string; limit?: number }) => Promise<import('../shared/types').Artifact[]>
    get: (id: string) => Promise<import('../shared/types').Artifact | null>
    delete: (id: string) => Promise<{ success: boolean; error?: string }>
  }

  // Updater operations
  updater: {
    check: () => Promise<{ available: boolean; version?: string; error?: string }>
    download: () => Promise<{ success: boolean; error?: string }>
    install: () => Promise<void>
    cancel: () => Promise<void>
  }

  // Profile operations
  profile: {
    save: (profile: import('../main/services/config').Profile) => Promise<void>
    load: (id: string) => Promise<import('../main/services/config').Profile | null>
    delete: (id: string) => Promise<void>
    listIds: () => Promise<string[]>
    getActive: () => Promise<string | null>
    setActive: (id: string) => Promise<void>
  }
}

// Custom APIs for renderer
const api: IpcApi = {
  // Shell operations
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url)
  },

  // AI operations
  ai: {
    chat: (messages, projectId) => ipcRenderer.invoke('ai:chat', messages, projectId),
    abort: () => ipcRenderer.invoke('ai:chat:abort'),
    onEvent: (callback) => {
      const handler = (_event: unknown, data: unknown) => callback(data)
      ipcRenderer.on('ai:chat:event', handler)
      return () => ipcRenderer.removeListener('ai:chat:event', handler)
    },
    onError: (callback) => {
      const handler = (_event: unknown, error: string) => callback(error)
      ipcRenderer.on('ai:chat:error', handler)
      return () => ipcRenderer.removeListener('ai:chat:error', handler)
    }
  },

  // Config operations
  config: {
    saveAI: (data) => ipcRenderer.invoke('config:save:ai', data),
    loadAI: () => ipcRenderer.invoke('config:load:ai'),
    saveSandbox: (data) => ipcRenderer.invoke('config:save:sandbox', data),
    loadSandbox: () => ipcRenderer.invoke('config:load:sandbox'),
    saveStorage: (data) => ipcRenderer.invoke('config:save:storage', data),
    loadStorage: () => ipcRenderer.invoke('config:load:storage')
  },

  // Project operations
  project: {
    create: (data) => ipcRenderer.invoke('project:create', data),
    get: (id) => ipcRenderer.invoke('project:get', id),
    list: () => ipcRenderer.invoke('project:list'),
    update: (id, data) => ipcRenderer.invoke('project:update', id, data),
    delete: (id) => ipcRenderer.invoke('project:delete', id)
  },

  // Session operations
  session: {
    create: (projectId) => ipcRenderer.invoke('session:create', projectId),
    get: (id) => ipcRenderer.invoke('session:get', id),
    list: (projectId) => ipcRenderer.invoke('session:list', projectId),
    delete: (id) => ipcRenderer.invoke('session:delete', id)
  },

  // Message operations
  message: {
    add: (sessionId, role, content) => ipcRenderer.invoke('message:add', sessionId, role, content),
    list: (sessionId) => ipcRenderer.invoke('message:list', sessionId)
  },

  // Sandbox operations
  sandbox: {
    getOrCreate: (projectId) => ipcRenderer.invoke('sandbox:getOrCreate', projectId),
    listDir: (projectId, path) => ipcRenderer.invoke('sandbox:listDir', projectId, path),
    readFile: (projectId, path) => ipcRenderer.invoke('sandbox:readFile', projectId, path),
    onFilesChanged: (callback) => {
      const handler = (_event, data) => callback(data)
      ipcRenderer.on('sandbox:files:changed', handler)
      return () => ipcRenderer.removeListener('sandbox:files:changed', handler)
    }
  },

  // Storage operations
  storage: {
    export: (projectId, sandboxPath, artifactName) => ipcRenderer.invoke('storage:export', projectId, sandboxPath, artifactName),
    list: (filter) => ipcRenderer.invoke('storage:list', filter),
    get: (id) => ipcRenderer.invoke('storage:get', id),
    delete: (id) => ipcRenderer.invoke('storage:delete', id)
  },

  // Updater operations
  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    download: () => ipcRenderer.invoke('updater:download'),
    install: () => ipcRenderer.invoke('updater:install'),
    cancel: () => ipcRenderer.invoke('updater:cancel')
  },

  // Profile operations
  profile: {
    save: (profile) => ipcRenderer.invoke('profile:save', profile),
    load: (id) => ipcRenderer.invoke('profile:load', id),
    delete: (id) => ipcRenderer.invoke('profile:delete', id),
    listIds: () => ipcRenderer.invoke('profile:listIds'),
    getActive: () => ipcRenderer.invoke('profile:getActive'),
    setActive: (id) => ipcRenderer.invoke('profile:setActive', id)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to renderer
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error - fallback for non-isolated context
  window.electron = electronAPI
  // @ts-expect-error - fallback for non-isolated context
  window.api = api
}
