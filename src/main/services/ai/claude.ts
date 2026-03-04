import Anthropic from '@anthropic-ai/sdk'
import type { Message, ChatOptions, ChatEvent, ToolDefinition } from '../../../shared/types'
import type { AIService, AIConfig } from './types'

export class ClaudeService implements AIService {
  readonly name = 'claude'
  private client: Anthropic
  private model: string
  private temperature: number
  private maxTokens: number
  private abortController: AbortController | null = null
  private tools: ToolDefinition[] = []

  constructor(config: AIConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl
    })
    this.model = config.model || 'claude-sonnet-4-6-20250514'
    this.temperature = config.temperature ?? 0.7
    this.maxTokens = config.maxTokens ?? 4096
  }

  setTools(tools: ToolDefinition[]): void {
    this.tools = tools
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

      const requestParams: Anthropic.Messages.MessageCreateParams = {
        model: options?.model || this.model,
        max_tokens: options?.maxTokens ?? 16384, // Increased to 16k to handle larger file content in tool calls
        temperature: options?.temperature ?? this.temperature,
        system: systemMessage?.content,
        messages: conversationMessages
      }

      // Add tools if available
      if (this.tools.length > 0) {
        requestParams.tools = this.tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          input_schema: tool.parameters as Anthropic.Messages.Tool['input_schema']
        }))
      }

      const stream = this.client.messages.stream(requestParams)

      // Track current tool call being built
      let currentToolCall: { id: string; name: string; inputJson: string } | null = null

      for await (const event of stream) {
        console.log('[Claude] Event:', event.type)
        switch (event.type) {
          case 'content_block_delta':
            if (event.delta.type === 'text_delta') {
              yield { type: 'content', content: event.delta.text }
            } else if (event.delta.type === 'input_json_delta' && currentToolCall) {
              // Accumulate tool input JSON
              console.log('[Claude] input_json_delta:', event.delta.partial_json.substring(0, 100))
              currentToolCall.inputJson += event.delta.partial_json
            }
            break

          case 'content_block_start':
            if (event.content_block.type === 'tool_use') {
              // Start tracking new tool call - don't use input from content_block_start
              // because the actual input comes via input_json_delta events
              currentToolCall = {
                id: event.content_block.id,
                name: event.content_block.name,
                inputJson: '' // Start empty, accumulate from input_json_delta
              }
              console.log('[Claude] Tool use started:', { id: currentToolCall.id, name: currentToolCall.name })
              // Log what's in content_block.input for debugging
              if (event.content_block.input) {
                console.log('[Claude] content_block.input present (will be ignored):', event.content_block.input)
              }
            }
            break

          case 'content_block_stop':
            // When content block ends, yield the tool call
            if (currentToolCall) {
              console.log('[Claude] Tool use completed:', {
                id: currentToolCall.id,
                name: currentToolCall.name,
                inputJsonLength: currentToolCall.inputJson.length
              })

              let toolInput = {}
              if (currentToolCall.inputJson) {
                // Clean up the input - remove any leading {} if present
                let cleanedJson = currentToolCall.inputJson.trim()

                // If JSON starts with "{}{" or similar, extract the actual object
                const match = cleanedJson.match(/^\{\}\s*(\{.+\})$/s)
                if (match) {
                  console.log('[Claude] Found leading {} in JSON, extracting actual content')
                  cleanedJson = match[1]
                }

                // Also handle case where we have escaped JSON string
                if (cleanedJson.startsWith('"') && cleanedJson.endsWith('"')) {
                  console.log('[Claude] Found escaped JSON string, unescaping...')
                  try {
                    cleanedJson = JSON.parse(cleanedJson)
                  } catch {
                    console.log('[Claude] Unescape failed, using as-is')
                  }
                }

                try {
                  toolInput = JSON.parse(cleanedJson)
                  console.log('[Claude] Parsed tool input successfully:', { keys: Object.keys(toolInput), path: (toolInput as any).path })
                } catch (e) {
                  // JSON might be truncated - try to complete it
                  console.error('[Claude] Failed to parse tool input:', e)
                  console.log('[Claude] Attempting to complete truncated JSON...')

                  let completed = cleanedJson

                  // First, handle unterminated strings
                  // Count quotes to detect unterminated strings (excluding escaped quotes)
                  let quoteCount = 0
                  let i = 0
                  while (i < completed.length) {
                    if (completed[i] === '"' && (i === 0 || completed[i - 1] !== '\\')) {
                      quoteCount++
                    }
                    i++
                  }

                  console.log('[Claude] Quote count:', quoteCount)

                  // If odd number of quotes, we have an unterminated string
                  if (quoteCount % 2 !== 0) {
                    console.log('[Claude] Detected unterminated string, adding closing quote')
                    completed += '"'
                  }

                  // Count brackets to try to complete the JSON
                  const openBraces = (completed.match(/\{/g) || []).length
                  const closeBraces = (completed.match(/\}/g) || []).length
                  const openBrackets = (completed.match(/\[/g) || []).length
                  const closeBrackets = (completed.match(/\]/g) || []).length

                  console.log('[Claude] Bracket count:', {
                    openBraces,
                    closeBraces,
                    openBrackets,
                    closeBrackets
                  })

                  // Add missing closing brackets
                  for (let j = 0; j < openBrackets - closeBrackets; j++) {
                    completed += ']'
                  }
                  for (let j = 0; j < openBraces - closeBraces; j++) {
                    completed += '}'
                  }

                  try {
                    toolInput = JSON.parse(completed)
                    console.log('[Claude] Parsed tool input after completion:', { keys: Object.keys(toolInput), path: (toolInput as any).path })
                  } catch (e2) {
                    console.error('[Claude] JSON completion also failed:', e2)
                    console.log('[Claude] Completed JSON preview:', completed.substring(0, 200))

                    // Return the raw string as fallback with error info
                    toolInput = {
                      _error: 'JSON_PARSE_FAILED',
                      _truncated: true,
                      _expectedBraces: openBraces - closeBraces,
                      _expectedBrackets: openBrackets - closeBrackets,
                      _oddQuotes: quoteCount % 2 !== 0,
                      _raw: cleanedJson.substring(0, 500),
                      _length: cleanedJson.length
                    }
                  }
                }
              }

              yield {
                type: 'tool_use',
                toolName: currentToolCall.name,
                toolInput,
                toolCallId: currentToolCall.id
              }
              currentToolCall = null
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
