import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AIConfig, Message } from '../../../shared/types'

// Simple tests without mocking the classes
describe('AIService Types', () => {
  describe('AIConfig', () => {
    it('should create valid OpenAI config', () => {
      const config: AIConfig = {
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4o'
      }
      expect(config.provider).toBe('openai')
      expect(config.apiKey).toBe('test-key')
    })

    it('should create valid Claude config', () => {
      const config: AIConfig = {
        provider: 'claude',
        apiKey: 'test-key',
        model: 'claude-sonnet-4-20250514'
      }
      expect(config.provider).toBe('claude')
      expect(config.model).toBe('claude-sonnet-4-20250514')
    })

    it('should support optional baseUrl', () => {
      const config: AIConfig = {
        provider: 'openai',
        apiKey: 'test-key',
        baseUrl: 'https://api.example.com'
      }
      expect(config.baseUrl).toBe('https://api.example.com')
    })
  })

  describe('Message', () => {
    it('should create valid user message', () => {
      const message: Message = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello, AI!',
        timestamp: new Date()
      }
      expect(message.role).toBe('user')
      expect(message.content).toBe('Hello, AI!')
    })

    it('should create valid assistant message', () => {
      const message: Message = {
        id: 'msg-2',
        role: 'assistant',
        content: 'Hello! How can I help?',
        timestamp: new Date()
      }
      expect(message.role).toBe('assistant')
    })

    it('should create valid system message', () => {
      const message: Message = {
        id: 'msg-3',
        role: 'system',
        content: 'You are a helpful assistant.',
        timestamp: new Date()
      }
      expect(message.role).toBe('system')
    })

    it('should create valid tool message', () => {
      const message: Message = {
        id: 'msg-4',
        role: 'tool',
        content: '{"result": "success"}',
        timestamp: new Date(),
        toolCallId: 'tool-123'
      }
      expect(message.role).toBe('tool')
      expect(message.toolCallId).toBe('tool-123')
    })
  })
})

// Test the actual module exports
describe('AIService Module', () => {
  it('should have createAIService function', async () => {
    const { createAIService } = await import('./index')
    expect(typeof createAIService).toBe('function')
  })

  it('should throw error for invalid provider', async () => {
    const { createAIService } = await import('./index')
    const config = {
      provider: 'invalid' as 'openai' | 'claude',
      apiKey: 'test-key'
    }
    expect(() => createAIService(config)).toThrow('Unknown AI provider')
  })
})
