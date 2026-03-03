import Anthropic from '@anthropic-ai/sdk'
import type { Message, ChatOptions, ChatEvent } from '../../../shared/types'
import type { AIService, AIConfig } from './types'

export class ClaudeService implements AIService {
  readonly name = 'claude'
  private client: Anthropic
  private model: string
  private temperature: number
  private maxTokens: number
  private abortController: AbortController | null = null

  constructor(config: AIConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl
    })
    this.model = config.model || 'claude-sonnet-4-6-20250514'
    this.temperature = config.temperature ?? 0.7
    this.maxTokens = config.maxTokens ?? 4096
  }

  async *chat(messages: Message[], options?: ChatOptions): AsyncGenerator<ChatEvent> {
    this.abortController = new AbortController()

    try {
      // Convert messages to Claude format
      const systemMessage = messages.find((m) => m.role === 'system')
      const conversationMessages = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        }))

      const stream = this.client.messages.stream({
        model: options?.model || this.model,
        max_tokens: options?.maxTokens ?? this.maxTokens,
        temperature: options?.temperature ?? this.temperature,
        system: systemMessage?.content,
        messages: conversationMessages
      })

      for await (const event of stream) {
        switch (event.type) {
          case 'content_block_delta':
            if (event.delta.type === 'text_delta') {
              yield { type: 'content', content: event.delta.text }
            }
            break

          case 'content_block_start':
            if (event.content_block.type === 'tool_use') {
              yield {
                type: 'tool_use',
                toolName: event.content_block.name,
                toolInput: event.content_block.input
              }
            }
            break

          case 'message_stop':
            yield { type: 'done' }
            break
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        yield { type: 'done' }
      } else {
        yield { type: 'error', error: error instanceof Error ? error.message : 'Unknown error' }
      }
    } finally {
      this.abortController = null
    }
  }

  abort(): void {
    this.abortController?.abort()
  }
}
