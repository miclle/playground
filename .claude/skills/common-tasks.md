# Skills

本项目的可复用技能和模式。

---

## 新增 IPC 通道

当需要在渲染进程和主进程之间添加新的通信通道时：

### 1. 定义类型 (shared/types.ts)
```typescript
export interface MyAPI {
  doSomething: (param: string) => Promise<Result>
  onEvent: (callback: (data: EventData) => void) => () => void
}
```

### 2. 实现主进程处理 (main/ipc/myApi.ts)
```typescript
import { ipcMain } from 'electron'

export function registerMyAPIHandlers() {
  ipcMain.handle('myApi:doSomething', async (_event, param: string) => {
    // 实现逻辑
    return result
  })
}
```

### 3. 暴露到渲染进程 (preload/index.ts)
```typescript
contextBridge.exposeInMainWorld('myAPI', {
  doSomething: (param: string) => ipcRenderer.invoke('myApi:doSomething', param)
})
```

### 4. 在渲染进程使用
```typescript
const result = await window.myAPI.doSomething('param')
```

---

## 新增 AI 服务适配器

当需要支持新的 AI 服务提供商时：

### 1. 实现适配器
```typescript
// main/services/ai/newProviderAdapter.ts
export class NewProviderAdapter implements AIService {
  async *chat(messages: Message[], options?: ChatOptions): AsyncGenerator<ChatEvent> {
    // 实现流式响应
  }

  abort(): void {
    // 取消请求
  }
}
```

### 2. 注册到工厂
```typescript
// main/services/ai/factory.ts
export function createAIService(config: AIConfig): AIService {
  switch (config.provider) {
    case 'newprovider':
      return new NewProviderAdapter(config)
    // ...
  }
}
```

---

## 新增存储后端

当需要支持新的存储方式时：

### 1. 实现后端
```typescript
// main/services/storage/newBackend.ts
export class NewBackend implements StorageBackend {
  async save(artifact: Artifact): Promise<SaveResult> {
    // 实现保存逻辑
  }

  async list(filter?: Filter): Promise<Artifact[]> {
    // 实现列表逻辑
  }

  async delete(id: string): Promise<void> {
    // 实现删除逻辑
  }
}
```

### 2. 注册到工厂
```typescript
// main/services/storage/factory.ts
export function createStorage(config: StorageConfig): StorageBackend {
  switch (config.type) {
    case 'newbackend':
      return new NewBackend(config)
    // ...
  }
}
```

---

## 添加新的 UI 组件

### 1. 创建基础组件 (如需要)
```typescript
// renderer/components/ui/MyComponent.tsx
import { cn } from '@/lib/utils'

interface MyComponentProps {
  variant?: 'default' | 'primary'
  className?: string
}

export function MyComponent({ variant = 'default', className }: MyComponentProps) {
  return <div className={cn('base-classes', className)} />
}
```

### 2. 在业务组件中使用
```typescript
// renderer/components/FeatureComponent.tsx
import { MyComponent } from '@/components/ui/MyComponent'

export function FeatureComponent() {
  return <MyComponent variant="primary" />
}
```
