import type { SandboxInfo, FileInfo } from '../../../shared/types'
import type { SandboxClient, SandboxConfig, CommandEvent } from './types'

// E2B API client implementation
export class E2BSandboxClient implements SandboxClient {
  private apiKey: string
  private baseUrl: string
  private timeout: number
  private _connected: Set<string> = new Set()
  private sandboxCache: Map<string, SandboxInfo> = new Map()

  constructor(config: SandboxConfig) {
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl || 'https://api.e2b.dev'
    this.timeout = config.timeout || 30000
  }

  get connected(): Set<string> {
    return this._connected
  }

  // Create a new sandbox
  async create(template: string): Promise<SandboxInfo> {
    const response = await fetch(`${this.baseUrl}/v1/sandboxes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({ template })
    })

    if (!response.ok) {
      throw new Error(`Failed to create sandbox: ${response.statusText}`)
    }

    const data = await response.json()
    const info: SandboxInfo = {
      id: data.sandboxId,
      template,
      status: 'running',
      createdAt: new Date()
    }

    this._connected.add(info.id)
    this.sandboxCache.set(info.id, info)

    return info
  }

  // Destroy a sandbox
  async destroy(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/v1/sandboxes/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    })

    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to destroy sandbox: ${response.statusText}`)
    }

    this._connected.delete(id)
    this.sandboxCache.delete(id)
  }

  // Pause a sandbox
  async pause(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/v1/sandboxes/${id}/pause`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to pause sandbox: ${response.statusText}`)
    }

    const info = this.sandboxCache.get(id)
    if (info) {
      info.status = 'paused'
    }
  }

  // Resume a sandbox
  async resume(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/v1/sandboxes/${id}/resume`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to resume sandbox: ${response.statusText}`)
    }

    const info = this.sandboxCache.get(id)
    if (info) {
      info.status = 'running'
    }
  }

  // Get sandbox info
  async getInfo(id: string): Promise<SandboxInfo | null> {
    const response = await fetch(`${this.baseUrl}/v1/sandboxes/${id}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    })

    if (response.status === 404) {
      return null
    }

    if (!response.ok) {
      throw new Error(`Failed to get sandbox info: ${response.statusText}`)
    }

    return await response.json()
  }

  // Read file from sandbox
  async readFile(sandboxId: string, path: string): Promise<string> {
    const response = await fetch(
      `${this.baseUrl}/v1/sandboxes/${sandboxId}/files?path=${encodeURIComponent(path)}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to read file: ${response.statusText}`)
    }

    const data = await response.json()
    return data.content
  }

  // Write file to sandbox
  async writeFile(sandboxId: string, path: string, content: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/v1/sandboxes/${sandboxId}/files`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({ path, content })
    })

    if (!response.ok) {
      throw new Error(`Failed to write file: ${response.statusText}`)
    }
  }

  // Delete file from sandbox
  async deleteFile(sandboxId: string, path: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/v1/sandboxes/${sandboxId}/files?path=${encodeURIComponent(path)}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to delete file: ${response.statusText}`)
    }
  }

  // List directory contents
  async listDir(sandboxId: string, path: string): Promise<FileInfo[]> {
    const response = await fetch(
      `${this.baseUrl}/v1/sandboxes/${sandboxId}/files/list?path=${encodeURIComponent(path)}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to list directory: ${response.statusText}`)
    }

    const data = await response.json()
    return data.files || []
  }

  // Check if file/directory exists
  async exists(sandboxId: string, path: string): Promise<boolean> {
    try {
      await this.readFile(sandboxId, path)
      return true
    } catch {
      return false
    }
  }

  // Create directory
  async mkdir(sandboxId: string, path: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/v1/sandboxes/${sandboxId}/files/mkdir`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({ path })
    })

    if (!response.ok) {
      throw new Error(`Failed to create directory: ${response.statusText}`)
    }
  }

  // Execute command with streaming output
  async *execute(sandboxId: string, command: string): AsyncGenerator<CommandEvent> {
    const response = await fetch(`${this.baseUrl}/v1/sandboxes/${sandboxId}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({ command })
    })

    if (!response.ok) {
      yield { type: 'error', error: `Failed to execute command: ${response.statusText}` }
      return
    }

    // Handle streaming response
    const reader = response.body?.getReader()
    if (!reader) {
      yield { type: 'error', error: 'No response body' }
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              yield data as CommandEvent
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    yield { type: 'exit', exitCode: 0 }
  }
}
