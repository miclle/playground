import { Sandbox as E2BSandbox } from 'e2b'
import type { SandboxInfo, FileInfo } from '../../../shared/types'
import type { SandboxClient, SandboxConfig, CommandEvent } from './types'

// E2B SDK client implementation
export class E2BSandboxClient implements SandboxClient {
  private apiKey: string
  private baseUrl: string | undefined
  private timeout: number
  private _connected: Set<string> = new Set()
  private sandboxCache: Map<string, { sandbox: E2BSandbox; info: SandboxInfo }> = new Map()

  constructor(config: SandboxConfig) {
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl
    this.timeout = config.timeout || 30000
  }

  get connected(): Set<string> {
    return this._connected
  }

  // Create a new sandbox using E2B SDK
  async create(template: string): Promise<SandboxInfo> {
    console.log('[E2B] Creating sandbox with template:', template)

    // Set API key and base URL via environment variables (E2B SDK uses these)
    const originalApiKey = process.env.E2B_API_KEY
    const originalApiUrl = process.env.E2B_API_URL

    try {
      process.env.E2B_API_KEY = this.apiKey
      if (this.baseUrl) {
        process.env.E2B_API_URL = this.baseUrl
      }

      const sandbox = await E2BSandbox.create(template, { timeoutMs: this.timeout })

      const info: SandboxInfo = {
        id: sandbox.sandboxId,
        template,
        status: 'running',
        createdAt: new Date()
      }

      this._connected.add(info.id)
      this.sandboxCache.set(info.id, { sandbox, info })

      console.log('[E2B] Sandbox created:', info.id)
      return info
    } catch (err) {
      console.error('[E2B] Failed to create sandbox:', err)
      throw err
    } finally {
      // Restore original environment variables
      if (originalApiKey !== undefined) {
        process.env.E2B_API_KEY = originalApiKey
      } else {
        delete process.env.E2B_API_KEY
      }
      if (originalApiUrl !== undefined) {
        process.env.E2B_API_URL = originalApiUrl
      } else {
        delete process.env.E2B_API_URL
      }
    }
  }

  // Get sandbox instance from cache
  private getSandbox(sandboxId: string): E2BSandbox | null {
    const cached = this.sandboxCache.get(sandboxId)
    return cached?.sandbox || null
  }

  // Destroy a sandbox
  async destroy(id: string): Promise<void> {
    const sandbox = this.getSandbox(id)
    if (sandbox) {
      await sandbox.kill()
      this._connected.delete(id)
      this.sandboxCache.delete(id)
    }
  }

  // Pause a sandbox
  async pause(id: string): Promise<void> {
    // E2B SDK doesn't have pause, just update status
    const cached = this.sandboxCache.get(id)
    if (cached) {
      cached.info.status = 'paused'
    }
  }

  // Resume a sandbox
  async resume(id: string): Promise<void> {
    // E2B SDK doesn't have resume, just update status
    const cached = this.sandboxCache.get(id)
    if (cached) {
      cached.info.status = 'running'
    }
  }

  // Get sandbox info
  async getInfo(id: string): Promise<SandboxInfo | null> {
    const cached = this.sandboxCache.get(id)
    return cached?.info || null
  }

  // Read file from sandbox
  async readFile(sandboxId: string, path: string): Promise<string> {
    const sandbox = this.getSandbox(sandboxId)
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`)
    }
    return await sandbox.files.read(path)
  }

  // Write file to sandbox
  async writeFile(sandboxId: string, path: string, content: string): Promise<void> {
    const sandbox = this.getSandbox(sandboxId)
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`)
    }
    await sandbox.files.write(path, content)
  }

  // Delete file from sandbox
  async deleteFile(sandboxId: string, path: string): Promise<void> {
    const sandbox = this.getSandbox(sandboxId)
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`)
    }
    await sandbox.files.remove(path)
  }

  // List directory contents
  async listDir(sandboxId: string, path: string): Promise<FileInfo[]> {
    const sandbox = this.getSandbox(sandboxId)
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`)
    }

    const entries = await sandbox.files.list(path)
    return entries.map(entry => ({
      name: entry.name,
      path: entry.path,
      type: entry.type === 'dir' ? 'folder' : 'file'
    }))
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
    const sandbox = this.getSandbox(sandboxId)
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`)
    }
    // E2B SDK creates directories automatically when writing files
    // For explicit mkdir, we can write an empty .keep file
    await sandbox.files.write(`${path}/.keep`, '')
  }

  // Execute command with streaming output
  async *execute(sandboxId: string, command: string): AsyncGenerator<CommandEvent> {
    const sandbox = this.getSandbox(sandboxId)
    if (!sandbox) {
      yield { type: 'error', error: `Sandbox ${sandboxId} not found` }
      return
    }

    try {
      const process = await sandbox.process.start(command)

      for await (const output of process.stdout) {
        yield { type: 'stdout', content: output }
      }

      for await (const output of process.stderr) {
        yield { type: 'stderr', content: output }
      }

      const exitCode = await process.wait()
      yield { type: 'exit', exitCode }
    } catch (err) {
      yield { type: 'error', error: (err as Error).message }
    }
  }
}
