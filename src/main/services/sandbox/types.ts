import type { SandboxInfo, FileInfo, CommandResult } from '../../../shared/types'

// Sandbox client interface (e2b protocol compatible)
export interface SandboxClient {
  // Lifecycle
  create(template: string): Promise<SandboxInfo>
  destroy(id: string): Promise<void>
  pause(id: string): Promise<void>
  resume(id: string): Promise<void>
  getInfo(id: string): Promise<SandboxInfo | null>

  // File operations
  readFile(sandboxId: string, path: string): Promise<string>
  writeFile(sandboxId: string, path: string, content: string): Promise<void>
  deleteFile(sandboxId: string, path: string): Promise<void>
  listDir(sandboxId: string, path: string): Promise<FileInfo[]>
  exists(sandboxId: string, path: string): Promise<boolean>
  mkdir(sandboxId: string, path: string): Promise<void>

  // Command execution
  execute(sandboxId: string, command: string): AsyncGenerator<CommandEvent>

  // Connected sandboxes
  readonly connected: Set<string>
}

// Command execution event
export interface CommandEvent {
  type: 'stdout' | 'stderr' | 'exit' | 'error'
  content?: string
  exitCode?: number
  error?: string
}

// Sandbox configuration
export interface SandboxConfig {
  apiKey: string
  baseUrl?: string
  timeout?: number
}

// Available templates
export const SANDBOX_TEMPLATES = {
  nodejs: 'nodejs-20',
  python: 'python-3.11',
  go: 'go-1.21',
  base: 'base'
} as const

export type SandboxTemplate = (typeof SANDBOX_TEMPLATES)[keyof typeof SANDBOX_TEMPLATES]
