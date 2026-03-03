# 服务集成规范

## AI 服务接口

所有 AI 服务适配器必须实现统一接口：

```typescript
interface AIService {
  // 发送消息，获取流式响应
  chat(messages: Message[], options?: ChatOptions): AsyncGenerator<ChatEvent>

  // 工具调用
  tools?: ToolDefinition[]

  // 取消请求
  abort(): void
}
```

### 适配器实现
- OpenAI: 使用 openai SDK
- Claude: 使用 @anthropic-ai/sdk

## Sandbox 服务接口

兼容 e2b 协议的沙箱客户端：

```typescript
interface SandboxClient {
  // 生命周期
  create(template: string): Promise<Sandbox>
  destroy(id: string): Promise<void>

  // 文件操作
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  listDir(path: string): Promise<FileInfo[]>

  // 命令执行
  execute(cmd: string): AsyncGenerator<CommandEvent>
}
```

## 存储服务接口

```typescript
interface StorageBackend {
  // 保存产物
  save(artifact: Artifact): Promise<SaveResult>

  // 列出产物
  list(filter?: Filter): Promise<Artifact[]>

  // 删除产物
  delete(id: string): Promise<void>
}
```

## 错误处理

所有服务调用需要统一错误包装：

```typescript
class ServiceError extends Error {
  constructor(
    public service: 'ai' | 'sandbox' | 'storage',
    public code: string,
    message: string,
    public cause?: Error
  ) {
    super(message)
  }
}
```
