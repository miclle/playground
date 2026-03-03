import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Types for IPC API
export interface IpcApi {
  // Menu events
  onMenuEvent: (callback: (event: string) => void) => () => void

  // Project operations
  project: {
    create: (name: string, description?: string) => Promise<import('../shared/types').Project>
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

  // Settings operations
  settings: {
    get: (key: string) => Promise<string | null>
    set: (key: string, value: string) => Promise<void>
  }

  // Profile operations
  profile: {
    save: (profile: unknown) => Promise<void>
    load: (id: string) => Promise<unknown>
    delete: (id: string) => Promise<void>
    listIds: () => Promise<string[]>
    getActive: () => Promise<string | null>
    setActive: (id: string) => Promise<void>
  }
}

// Custom APIs for renderer
const api: IpcApi = {
  // Menu event listeners
  onMenuEvent: (callback) => {
    ipcRenderer.on('menu:new-project', () => callback('new-project'))
    ipcRenderer.on('menu:open-project', () => callback('open-project'))
    ipcRenderer.on('menu:save', () => callback('save'))
    ipcRenderer.on('menu:toggle-file-tree', () => callback('toggle-file-tree'))
    ipcRenderer.on('menu:toggle-chat', () => callback('toggle-chat'))
    ipcRenderer.on('menu:toggle-bottom-panel', () => callback('toggle-bottom-panel'))
    return () => {
      ipcRenderer.removeAllListeners('menu:new-project')
      ipcRenderer.removeAllListeners('menu:open-project')
      ipcRenderer.removeAllListeners('menu:save')
      ipcRenderer.removeAllListeners('menu:toggle-file-tree')
      ipcRenderer.removeAllListeners('menu:toggle-chat')
      ipcRenderer.removeAllListeners('menu:toggle-bottom-panel')
    }
  },

  // Project operations
  project: {
    create: (name, description) => ipcRenderer.invoke('project:create', name, description),
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

  // Settings operations
  settings: {
    get: (key) => ipcRenderer.invoke('settings:get', key),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value)
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
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
