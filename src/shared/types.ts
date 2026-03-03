// AI Service Types
export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

export interface ChatOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

export interface ChatEvent {
  type: 'content' | 'tool_use' | 'tool_result' | 'error' | 'done'
  content?: string
  toolName?: string
  toolInput?: unknown
  toolResult?: unknown
  toolCallId?: string
  error?: string
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
}

// Sandbox Types
export interface SandboxInfo {
  id: string
  template: string
  status: 'running' | 'paused' | 'stopped'
  createdAt: Date
}

export interface FileInfo {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  modifiedAt?: Date
}

export interface CommandResult {
  exitCode: number
  stdout: string
  stderr: string
}

// Project Types
export interface Project {
  id: string
  name: string
  description?: string
  sandboxId?: string
  createdAt: Date
  updatedAt: Date
}

export interface Session {
  id: string
  projectId: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

// Storage Types
export interface Artifact {
  id: string
  name: string
  path: string
  content: string
  size: number
  createdAt: Date
}

export interface StorageConfig {
  type: 'local' | 's3' | 'github'
  config: Record<string, unknown>
}

// Config Types
export interface AIConfig {
  provider: 'openai' | 'claude'
  apiKey: string
  baseUrl?: string
  model?: string
}

export interface SandboxConfig {
  apiKey: string
  baseUrl?: string
  template?: string
}

export interface AppConfig {
  ai: AIConfig
  sandbox: SandboxConfig
  storage: StorageConfig
}
