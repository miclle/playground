import { dialog, BrowserWindow, Notification } from 'electron'

// Error types
export enum ErrorType {
  AI_ERROR = 'ai_error',
  SANDBOX_ERROR = 'sandbox_error',
  STORAGE_ERROR = 'storage_error',
  DATABASE_ERROR = 'database_error',
  NETWORK_ERROR = 'network_error',
  UNKNOWN_ERROR = 'unknown_error'
}

// Error info structure
export interface ErrorInfo {
  type: ErrorType
  message: string
  details?: string
  code?: string
  timestamp: Date
}

// Error handler class
class ErrorHandler {
  private errors: ErrorInfo[] = []
  private maxErrors = 100

  // Log error
  log(error: Error, type: ErrorType = ErrorType.UNKNOWN_ERROR, details?: string): ErrorInfo {
    const errorInfo: ErrorInfo = {
      type,
      message: error.message,
      details: details || error.stack,
      code: (error as Error & { code?: string }).code,
      timestamp: new Date()
    }

    this.errors.push(errorInfo)

    // Keep only last N errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors)
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${type}] ${error.message}`, details || '')
    }

    return errorInfo
  }

  // Show error dialog to user
  async showDialog(window: BrowserWindow | null, error: ErrorInfo): Promise<void> {
    const targetWindow = window || BrowserWindow.getFocusedWindow()

    if (targetWindow) {
      await dialog.showMessageBox(targetWindow, {
        type: 'error',
        title: 'Error',
        message: error.message,
        detail: error.details,
        buttons: ['OK']
      })
    }
  }

  // Show notification
  showNotification(title: string, body: string): void {
    if (Notification.isSupported()) {
      const notification = new Notification({ title, body })
      notification.show()
    }
  }

  // Get all errors
  getErrors(): ErrorInfo[] {
    return [...this.errors]
  }

  // Clear errors
  clearErrors(): void {
    this.errors = []
  }

  // Get last error
  getLastError(): ErrorInfo | null {
    return this.errors.length > 0 ? this.errors[this.errors.length - 1] : null
  }
}

// Singleton instance
export const errorHandler = new ErrorHandler()

// Helper functions
export function logAiError(error: Error, details?: string): ErrorInfo {
  return errorHandler.log(error, ErrorType.AI_ERROR, details)
}

export function logSandboxError(error: Error, details?: string): ErrorInfo {
  return errorHandler.log(error, ErrorType.SANDBOX_ERROR, details)
}

export function logStorageError(error: Error, details?: string): ErrorInfo {
  return errorHandler.log(error, ErrorType.STORAGE_ERROR, details)
}

export function logDatabaseError(error: Error, details?: string): ErrorInfo {
  return errorHandler.log(error, ErrorType.DATABASE_ERROR, details)
}

export function logNetworkError(error: Error, details?: string): ErrorInfo {
  return errorHandler.log(error, ErrorType.NETWORK_ERROR, details)
}
