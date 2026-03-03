import OpenAI from 'openai'
import type { Message, ChatOptions, ChatEvent } from '../../../shared/types'
import type { AIService, AIConfig } from './types'

export class OpenAIService implements AIService {
  readonly name = 'openai'
  private client: OpenAI
  private model: string
  private temperature: number
  private maxTokens: number
  private abortController: AbortController | null = null

  constructor(config: AIConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl
    })
    this.model = config.model || 'gpt-4o'
    this.temperature = config.temperature ?? 0.7
    this.maxTokens = config.maxTokens ?? 4096
  }

  async *chat(messages: Message[], options?: ChatOptions): AsyncGenerator<ChatEvent> {
    this.abortController = new AbortController()

    try {
      const openaiMessages = messages.map((msg) => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content
      }))

      const stream = await this.client.chat.completions.create(
        {
          model: options?.model || this.model,
          messages: openaiMessages,
          temperature: options?.temperature ?? this.temperature,
          max_tokens: options?.maxTokens ?? this.maxTokens,
          stream: true
        },
        {
          signal: this.abortController.signal
        }
      )

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content
        if (content) {
          yield { type: 'content', content }
        }

        // Handle tool calls if present
        const toolCalls = chunk.choices[0]?.delta?.tool_calls
        if (toolCalls) {
          for (const toolCall of toolCalls) {
            if (toolCall.function?.name) {
              yield {
                type: 'tool_use',
                toolName: toolCall.function.name,
                toolInput: toolCall.function.arguments
                  ? JSON.parse(toolCall.function.arguments)
                  : undefined
              }
            }
          }
        }

        // Check if done
        if (chunk.choices[0]?.finish_reason === 'stop') {
          yield { type: 'done' }
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
