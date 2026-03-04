import type { Message, ChatOptions, ChatEvent, ToolDefinition } from '../../../shared/types'

// AI Service Interface
export interface AIService {
  // Send messages and get streaming response
  chat(messages: Message[], options?: ChatOptions): AsyncGenerator<ChatEvent>

  // Set available tools for function calling
  setTools(tools: ToolDefinition[]): void

  // Abort current request
  abort(): void

  // Service name for identification
  readonly name: string
}

// AI Provider types
export type AIProvider = 'openai' | 'claude'

// AI Configuration
export interface AIConfig {
  provider: AIProvider
  apiKey: string
  baseUrl?: string
  model?: string
  temperature?: number
  maxTokens?: number
}

// Default models per provider
export const DEFAULT_MODELS: Record<AIProvider, string> = {
  openai: 'gpt-4o',
  claude: 'claude-sonnet-4-6-20250514'
}

// Default configurations
export const DEFAULT_CONFIG: Omit<AIConfig, 'apiKey'> = {
  provider: 'openai',
  model: DEFAULT_MODELS.openai,
  temperature: 0.7,
  maxTokens: 4096
}
