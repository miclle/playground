import type { IpcApi } from '../preload/index'

declare global {
  interface Window {
    api: IpcApi | undefined
    electron: typeof import('@electron-toolkit/preload').electronAPI | undefined
  }
}

export {}
