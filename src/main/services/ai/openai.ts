import OpenAI from 'openai'
import type { Message, ChatOptions, ChatEvent, ToolDefinition } from '../../../shared/types'
import type { AIService, AIConfig } from './types'

// System prompt for code generation
const SYSTEM_PROMPT = `You are an AI coding assistant that helps users write code. You have access to tools to:
- Read and write files in a sandbox environment
- Execute shell commands
- List directory contents

When asked to create or modify code:
1. First, understand what the user wants
2. Write the code to files using write_file tool
3. If needed, run commands using execute_command tool
4. Explain what you did

Always use the tools to actually create files and run code, not just describe what to do.
Be concise and focused. Write clean, well-structured code.`

export class OpenAIService implements AIService {
  readonly name = 'openai'
  private client: OpenAI
  private model: string
  private temperature: number
  private maxTokens: number
  private abortController: AbortController | null = null
  private tools: ToolDefinition[] = []

  constructor(config: AIConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl
    })
    this.model = config.model || 'gpt-4o'
    this.temperature = config.temperature ?? 0.7
    this.maxTokens = config.maxTokens ?? 4096
  }

  setTools(tools: ToolDefinition[]): void {
    this.tools = tools
  }

  async *chat(messages: Message[], options?: ChatOptions): AsyncGenerator<ChatEvent> {
    this.abortController = new AbortController()

    try {
      // Build messages with system prompt
      const openaiMessages: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: string; tool_calls?: unknown[]; tool_call_id?: string }> = [
        { role: 'system', content: SYSTEM_PROMPT }
      ]

      for (const msg of messages) {
        if (msg.role === 'tool') {
          openaiMessages.push({
            role: 'tool',
            content: msg.content,
            tool_call_id: (msg as unknown as { toolCallId: string }).toolCallId
          })
        } else {
          openaiMessages.push({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          })
        }
      }

      const requestParams: OpenAI.Chat.ChatCompletionCreateParams = {
        model: options?.model || this.model,
        messages: openaiMessages,
        temperature: options?.temperature ?? this.temperature,
        max_tokens: options?.maxTokens ?? this.maxTokens,
        stream: true
      }

      // Add tools if available
      if (this.tools.length > 0) {
        requestParams.tools = this.tools.map(tool => ({
          type: 'function' as const,
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters
          }
        }))
      }

      const stream = await this.client.chat.completions.create(
        requestParams,
        {
          signal: this.abortController.signal
        }
      )

      let currentToolCall: { id: string; name: string; arguments: string } | null = null

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta

        // Handle text content
        if (delta?.content) {
          yield { type: 'content', content: delta.content }
        }

        // Handle tool calls
        const toolCalls = delta?.tool_calls
        if (toolCalls) {
          for (const toolCall of toolCalls) {
            if (toolCall.id) {
              // Start of new tool call
              if (currentToolCall) {
                // Yield previous tool call
                yield {
                  type: 'tool_use',
                  toolName: currentToolCall.name,
                  toolInput: currentToolCall.arguments ? JSON.parse(currentToolCall.arguments) : {},
                  toolCallId: currentToolCall.id
                }
              }
              currentToolCall = {
                id: toolCall.id,
                name: toolCall.function?.name || '',
                arguments: toolCall.function?.arguments || ''
              }
            } else if (currentToolCall && toolCall.function?.arguments) {
              // Continue building arguments
              currentToolCall.arguments += toolCall.function.arguments
            }
          }
        }

        // Check finish reason
        const finishReason = chunk.choices[0]?.finish_reason
        if (finishReason === 'stop' || finishReason === 'tool_calls') {
          // Yield any remaining tool call
          if (currentToolCall) {
            yield {
              type: 'tool_use',
              toolName: currentToolCall.name,
              toolInput: currentToolCall.arguments ? JSON.parse(currentToolCall.arguments) : {},
              toolCallId: currentToolCall.id
            }
            currentToolCall = null
          }
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
