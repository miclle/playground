import type { AIService, AIConfig, AIProvider } from './types'
import { OpenAIService } from './openai'
import { ClaudeService } from './claude'

// Create AI service based on provider
export function createAIService(config: AIConfig): AIService {
  switch (config.provider) {
    case 'openai':
      return new OpenAIService(config)
    case 'claude':
      return new ClaudeService(config)
    default:
      throw new Error(`Unknown AI provider: ${config.provider}`)
  }
}

// Re-export types
export * from './types'
export { OpenAIService } from './openai'
export { ClaudeService } from './claude'
