import type { Message, ChatEvent } from '../../shared/types'
import type { AIService, AIConfig } from './ai/types'
import type { SandboxClient, CommandEvent } from './sandbox/types'
import { createAIService } from './ai'
import { createSandboxClient } from './sandbox'
import type { SandboxConfig } from './sandbox/types'

// AI tools for sandbox operations
const SANDBOX_TOOLS = [
  {
    name: 'read_file',
    description: 'Read a file from the sandbox filesystem',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The path to the file to read'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'write_file',
    description: 'Write content to a file in the sandbox filesystem',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The path to the file to write'
        },
        content: {
          type: 'string',
          description: 'The content to write to the file'
        }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'list_dir',
    description: 'List contents of a directory in the sandbox',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The path to the directory to list'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'execute_command',
    description: 'Execute a shell command in the sandbox',
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The command to execute'
        }
      },
      required: ['command']
    }
  },
  {
    name: 'mkdir',
    description: 'Create a directory in the sandbox',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The path of the directory to create'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'delete_file',
    description: 'Delete a file from the sandbox',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The path to the file to delete'
        }
      },
      required: ['path']
    }
  }
]

// Integration service that connects AI with Sandbox
export class IntegrationService {
  private aiService: AIService | null = null
  private sandboxClient: SandboxClient | null = null
  private activeSandboxId: string | null = null

  // Initialize with configurations
  async initialize(aiConfig: AIConfig, sandboxConfig: SandboxConfig): Promise<void> {
    this.aiService = createAIService(aiConfig)
    this.sandboxClient = createSandboxClient(sandboxConfig)
  }

  // Create a new sandbox for a project
  async createSandbox(template: string = 'nodejs-20'): Promise<string> {
    if (!this.sandboxClient) {
      throw new Error('Sandbox client not initialized')
    }

    const info = await this.sandboxClient.create(template)
    this.activeSandboxId = info.id
    return info.id
  }

  // Destroy the active sandbox
  async destroySandbox(): Promise<void> {
    if (!this.sandboxClient || !this.activeSandboxId) {
      return
    }

    await this.sandboxClient.destroy(this.activeSandboxId)
    this.activeSandboxId = null
  }

  // Chat with AI, handling tool calls to interact with sandbox
  async *chat(messages: Message[]): AsyncGenerator<ChatEvent | CommandEvent> {
    if (!this.aiService || !this.sandboxClient || !this.activeSandboxId) {
      yield { type: 'error', error: 'Service not initialized' }
      return
    }

    for await (const event of this.aiService.chat(messages, { stream: true })) {
      if (event.type === 'tool_use') {
        // Handle tool call
        const toolResult = await this.handleToolCall(event.toolName || '', event.toolInput)
        yield {
          type: 'tool_result',
          toolName: event.toolName,
          toolResult
        }
      } else {
        yield event
      }
    }
  }

  // Handle AI tool calls to sandbox
  private async handleToolCall(toolName: string, input: unknown): Promise<unknown> {
    if (!this.sandboxClient || !this.activeSandboxId) {
      return { error: 'Sandbox not available' }
    }

    const args = input as Record<string, unknown>

    try {
      switch (toolName) {
        case 'read_file':
          return await this.sandboxClient.readFile(this.activeSandboxId, args.path as string)

        case 'write_file':
          await this.sandboxClient.writeFile(
            this.activeSandboxId,
            args.path as string,
            args.content as string
          )
          return { success: true }

        case 'list_dir':
          return await this.sandboxClient.listDir(this.activeSandboxId, args.path as string)

        case 'execute_command': {
          const results: string[] = []
          for await (const event of this.sandboxClient.execute(
            this.activeSandboxId,
            args.command as string
          )) {
            if (event.type === 'stdout') {
              results.push(event.content || '')
            } else if (event.type === 'stderr') {
              results.push(`[stderr] ${event.content || ''}`)
            }
          }
          return { output: results.join('\n') }
        }

        case 'mkdir':
          await this.sandboxClient.mkdir(this.activeSandboxId, args.path as string)
          return { success: true }

        case 'delete_file':
          await this.sandboxClient.deleteFile(this.activeSandboxId, args.path as string)
          return { success: true }

        default:
          return { error: `Unknown tool: ${toolName}` }
      }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Direct sandbox operations for renderer use
  async readFile(path: string): Promise<string> {
    if (!this.sandboxClient || !this.activeSandboxId) {
      throw new Error('Sandbox not available')
    }
    return this.sandboxClient.readFile(this.activeSandboxId, path)
  }

  async writeFile(path: string, content: string): Promise<void> {
    if (!this.sandboxClient || !this.activeSandboxId) {
      throw new Error('Sandbox not available')
    }
    await this.sandboxClient.writeFile(this.activeSandboxId, path, content)
  }

  async listDir(path: string) {
    if (!this.sandboxClient || !this.activeSandboxId) {
      throw new Error('Sandbox not available')
    }
    return this.sandboxClient.listDir(this.activeSandboxId, path)
  }

  async *executeCommand(command: string): AsyncGenerator<CommandEvent> {
    if (!this.sandboxClient || !this.activeSandboxId) {
      yield { type: 'error', error: 'Sandbox not available' }
      return
    }
    yield* this.sandboxClient.execute(this.activeSandboxId, command)
  }

  get sandboxTools() {
    return SANDBOX_TOOLS
  }

  get sandboxId(): string | null {
    return this.activeSandboxId
  }
}

// Singleton instance
let integrationService: IntegrationService | null = null

export function getIntegrationService(): IntegrationService {
  if (!integrationService) {
    integrationService = new IntegrationService()
  }
  return integrationService
}
