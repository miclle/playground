import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  ping: () => ipcRenderer.send('ping'),

  // Menu event listeners
  onMenuEvent: (callback: (event: string) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, action: string) => callback(action)
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
  }
}

// Use `contextBridge` APIs to expose Electron APIs to renderer
// contextBridge will add an `electronAPI` property to your global `window` object
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
