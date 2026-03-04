import { Sandbox as E2BSandbox } from 'e2b'
import type { SandboxInfo, FileInfo } from '../../../shared/types'
import type { SandboxClient, SandboxConfig, CommandEvent } from './types'

// Template fallback list for each user-friendly name
// Try these in order when creating a sandbox
const TEMPLATE_FALLBACKS: Record<string, string[]> = {
  'nodejs': [
    'nodejs-latest',      // Common naming
    'node-latest',        // Alternative
    'node20',             // Version-specific
    'node-20',            // With dash
    'nodejs-20',          // Full name
    'base-latest',        // e2b default
    'base',               // Simple base
    'v1/base',            // Some providers use versioned base
    'base-nodejs'         // Combined
  ],
  'nodejs-18': ['nodejs-18', 'node18', 'node-18', 'base-latest'],
  'nodejs-20': ['nodejs-20', 'node20', 'node-20', 'base-latest'],
  'python': ['python-latest', 'python3', 'python3-latest', 'base-latest'],
  'python3': ['python3', 'python-latest', 'base-latest'],
  'go': ['go-latest', 'golang', 'base-latest']
}

// Get list of templates to try (in order)
function getTemplatesToTry(template: string): string[] {
  // If template has a fallback list, use it
  if (TEMPLATE_FALLBACKS[template]) {
    return TEMPLATE_FALLBACKS[template]
  }
  // Otherwise use the template as-is
  return [template]
}

// E2B SDK client implementation
export class E2BSandboxClient implements SandboxClient {
  private apiKey: string
  private baseUrl: string | undefined
  private timeout: number
  private _connected: Set<string> = new Set()
  private sandboxCache: Map<string, { sandbox: E2BSandbox; info: SandboxInfo }> = new Map()
  private defaultTemplate: string = 'base'

  constructor(config: SandboxConfig) {
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl
    this.timeout = config.timeout || 30000
  }

  // Check if sandbox error is a timeout error
  private isTimeoutError(err: unknown): boolean {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return errorMsg.includes('timeout') || errorMsg.includes('not found') || errorMsg.includes('unavailable')
  }

  // Ensure sandbox is alive, recreate if needed
  private async ensureSandboxAlive(sandboxId: string): Promise<E2BSandbox> {
    const cached = this.sandboxCache.get(sandboxId)
    if (!cached) {
      console.log('[E2B] Sandbox not in cache, creating new one with template:', this.defaultTemplate)
      const info = await this.create(this.defaultTemplate)
      return this.sandboxCache.get(info.id)!.sandbox
    }

    // Try to access the sandbox to check if it's alive
    try {
      // Quick check - try to get info
      await cached.sandbox.files.list('/')
      return cached.sandbox
    } catch (err) {
      if (this.isTimeoutError(err)) {
        console.log('[E2B] Sandbox timed out, recreating...')
        this._connected.delete(sandboxId)
        this.sandboxCache.delete(sandboxId)
        const info = await this.create(this.defaultTemplate)
        return this.sandboxCache.get(info.id)!.sandbox
      }
      throw err
    }
  }

  get connected(): Set<string> {
    return this._connected
  }

  // Create a new sandbox using E2B SDK
  async create(template: string): Promise<SandboxInfo> {
    const templatesToTry = getTemplatesToTry(template)
    console.log('[E2B] Creating sandbox with template:', template)
    console.log('[E2B] Will try templates in order:', templatesToTry)

    // Set API key and base URL via environment variables (E2B SDK uses these)
    const originalApiKey = process.env.E2B_API_KEY
    const originalApiUrl = process.env.E2B_API_URL

    let lastError: Error | null = null

    try {
      process.env.E2B_API_KEY = this.apiKey
      if (this.baseUrl) {
        process.env.E2B_API_URL = this.baseUrl
      }

      // Try each template in the fallback list
      for (const templateToUse of templatesToTry) {
        try {
          console.log(`[E2B] Trying template: ${templateToUse}`)
          const sandbox = await E2BSandbox.create(templateToUse, { timeoutMs: this.timeout })

          const info: SandboxInfo = {
            id: sandbox.sandboxId,
            template,
            status: 'running',
            createdAt: new Date()
          }

          this._connected.add(info.id)
          this.sandboxCache.set(info.id, { sandbox, info })

          console.log('[E2B] Sandbox created successfully with template:', templateToUse, 'ID:', info.id)
          return info
        } catch (err) {
          lastError = err as Error
          console.log(`[E2B] Template ${templateToUse} failed:`, (err as Error).message)
          // Continue to next template
        }
      }

      // All templates failed
      throw new Error(`All template attempts failed. Last error: ${lastError?.message}`)
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
    console.log('[E2B] readFile called:', { sandboxId, path })
    const sandbox = await this.ensureSandboxAlive(sandboxId)
    return await sandbox.files.read(path)
  }

  // Write file to sandbox
  async writeFile(sandboxId: string, path: string, content: string): Promise<void> {
    console.log('[E2B] writeFile called:', { sandboxId, path, contentLength: content?.length })

    try {
      const sandbox = await this.ensureSandboxAlive(sandboxId)
      console.log('[E2B] Calling sandbox.files.write with:', { path, contentLength: content?.length })

      await sandbox.files.write(path, content)
      console.log('[E2B] File write call completed, verifying...')

      // Give the sandbox a moment to sync the file
      await new Promise(resolve => setTimeout(resolve, 100))

      // Verify file exists by trying to list the directory
      const dirPath = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) || '/' : '/'
      console.log('[E2B] Listing directory to verify:', dirPath)
      const entries = await sandbox.files.list(dirPath)
      console.log('[E2B] Directory listing after write:', entries.map(e => ({ name: e.name, type: e.type })))

      // Check if our file is in the listing
      const fileName = path.includes('/') ? path.substring(path.lastIndexOf('/') + 1) : path
      const fileExists = entries.some(e => e.name === fileName)
      if (fileExists) {
        console.log('[E2B] File verified in listing:', fileName)
      } else {
        console.warn('[E2B] File NOT found in listing after write:', fileName, 'Entries:', entries.map(e => e.name))
      }
    } catch (err) {
      console.error('[E2B] File write failed:', err)

      // If it's a timeout error, try once more with a fresh sandbox
      if (this.isTimeoutError(err)) {
        console.log('[E2B] Timeout during write, retrying with fresh sandbox...')
        this._connected.delete(sandboxId)
        this.sandboxCache.delete(sandboxId)
        const sandbox = await this.ensureSandboxAlive(sandboxId)
        await sandbox.files.write(path, content)
        console.log('[E2B] Retry write successful')
      } else {
        throw err
      }
    }
  }

  // Delete file from sandbox
  async deleteFile(sandboxId: string, path: string): Promise<void> {
    const sandbox = await this.ensureSandboxAlive(sandboxId)
    await sandbox.files.remove(path)
  }

  // List directory contents
  async listDir(sandboxId: string, path: string): Promise<FileInfo[]> {
    console.log('[E2B] listDir called:', { sandboxId, path, cacheSize: this.sandboxCache.size, cacheKeys: Array.from(this.sandboxCache.keys()) })

    try {
      const sandbox = await this.ensureSandboxAlive(sandboxId)
      console.log('[E2B] Listing files in sandbox:', sandbox.sandboxId, 'path:', path)
      const entries = await sandbox.files.list(path)
      console.log('[E2B] Raw entries from sandbox:', entries.map(e => ({ name: e.name, type: e.type, path: e.path })))
      const result = entries.map(entry => ({
        name: entry.name,
        path: entry.path,
        type: entry.type === 'dir' ? 'folder' : 'file'
      }))
      console.log('[E2B] Returning', result.length, 'entries:', result.map(e => e.name))
      return result
    } catch (err) {
      console.error('[E2B] listDir failed:', err)

      // If it's a timeout error, try once more with a fresh sandbox
      if (this.isTimeoutError(err)) {
        console.log('[E2B] Timeout during listDir, retrying with fresh sandbox...')
        this._connected.delete(sandboxId)
        this.sandboxCache.delete(sandboxId)
        const sandbox = await this.ensureSandboxAlive(sandboxId)
        const entries = await sandbox.files.list(path)
        return entries.map(entry => ({
          name: entry.name,
          path: entry.path,
          type: entry.type === 'dir' ? 'folder' : 'file'
        }))
      }
      throw err
    }
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
    const sandbox = await this.ensureSandboxAlive(sandboxId)
    // E2B SDK creates directories automatically when writing files
    // For explicit mkdir, we can write an empty .keep file
    await sandbox.files.write(`${path}/.keep`, '')
  }

  // Execute command with streaming output
  async *execute(sandboxId: string, command: string): AsyncGenerator<CommandEvent> {
    try {
      const sandbox = await this.ensureSandboxAlive(sandboxId)
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
      // If it's a timeout error, try once more with a fresh sandbox
      if (this.isTimeoutError(err)) {
        console.log('[E2B] Timeout during execute, retrying with fresh sandbox...')
        this._connected.delete(sandboxId)
        this.sandboxCache.delete(sandboxId)
        const sandbox = await this.ensureSandboxAlive(sandboxId)
        const process = await sandbox.process.start(command)

        for await (const output of process.stdout) {
          yield { type: 'stdout', content: output }
        }

        for await (const output of process.stderr) {
          yield { type: 'stderr', content: output }
        }

        const exitCode = await process.wait()
        yield { type: 'exit', exitCode }
      } else {
        yield { type: 'error', error: (err as Error).message }
      }
    }
  }
}
