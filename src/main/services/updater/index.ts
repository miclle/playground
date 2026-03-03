import pkg from 'electron-updater'
const { autoUpdater, CancellationToken } = pkg
import type { UpdateInfo } from 'electron-updater'
import { BrowserWindow, dialog } from 'electron'
import { errorHandler } from '../error'

// Update events
export type UpdateEvent =
  | { type: 'checking-for-update' }
  | { type: 'update-available'; info: UpdateInfo }
  | { type: 'update-not-available'; info: UpdateInfo }
  | { type: 'download-progress'; progress: DownloadProgress }
  | { type: 'update-downloaded'; info: UpdateInfo }
  | { type: 'error'; error: Error }

export interface DownloadProgress {
  bytesPerSecond: number
  percent: number
  transferred: number
  total: number
}

// Auto-updater service
class UpdaterService {
  private cancellationToken: CancellationToken | null = null
  private mainWindow: BrowserWindow | null = null

  // Initialize auto-updater
  initialize(window: BrowserWindow): void {
    this.mainWindow = window

    // Configure auto-updater
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true

    // Set up event handlers
    autoUpdater.on('checking-for-update', () => {
      this.notifyRenderer({ type: 'checking-for-update' })
    })

    autoUpdater.on('update-available', (info) => {
      this.notifyRenderer({ type: 'update-available', info })
    })

    autoUpdater.on('update-not-available', (info) => {
      this.notifyRenderer({ type: 'update-not-available', info })
    })

    autoUpdater.on('download-progress', (progress) => {
      this.notifyRenderer({
        type: 'download-progress',
        progress: {
          bytesPerSecond: progress.bytesPerSecond,
          percent: progress.percent,
          transferred: progress.transferred,
          total: progress.total
        }
      })
    })

    autoUpdater.on('update-downloaded', (info) => {
      this.notifyRenderer({ type: 'update-downloaded', info })
      this.promptInstall(info)
    })

    autoUpdater.on('error', (error) => {
      errorHandler.log(error, 'network_error' as never, 'Auto-updater error')
      this.notifyRenderer({ type: 'error', error })
    })
  }

  // Check for updates
  async checkForUpdates(): Promise<UpdateInfo | null> {
    try {
      const result = await autoUpdater.checkForUpdates()
      return result?.updateInfo || null
    } catch (error) {
      errorHandler.log(error as Error, 'network_error' as never, 'Failed to check for updates')
      return null
    }
  }

  // Download update
  async downloadUpdate(): Promise<boolean> {
    try {
      this.cancellationToken = new CancellationToken()
      await autoUpdater.downloadUpdate(this.cancellationToken)
      return true
    } catch (error) {
      errorHandler.log(error as Error, 'network_error' as never, 'Failed to download update')
      return false
    }
  }

  // Cancel download
  cancelDownload(): void {
    if (this.cancellationToken) {
      this.cancellationToken.cancel()
      this.cancellationToken = null
    }
  }

  // Install update
  quitAndInstall(): void {
    autoUpdater.quitAndInstall()
  }

  // Prompt user to install
  private async promptInstall(info: UpdateInfo): Promise<void> {
    if (!this.mainWindow) return

    const result = await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: `Version ${info.version} is ready to install.`,
      detail: 'The application will restart to install the update.',
      buttons: ['Install Now', 'Later'],
      defaultId: 0
    })

    if (result.response === 0) {
      this.quitAndInstall()
    }
  }

  // Notify renderer process
  private notifyRenderer(event: UpdateEvent): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('update:event', event)
    }
  }
}

// Singleton instance
export const updaterService = new UpdaterService()
