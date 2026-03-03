# 架构规范

## Electron 进程分离

### Main Process（主进程）
- 负责原生 API 调用、窗口管理、IPC 处理
- 所有敏感操作（文件系统、网络、数据库）在主进程执行
- 使用 `ipcMain.handle()` 处理渲染进程的异步请求

### Preload Script（预加载脚本）
- 使用 `contextBridge` 暴露安全的 API 给渲染进程
- 只暴露必要的接口，不直接暴露 Node.js API
- 保持轻量，避免复杂逻辑

### Renderer Process（渲染进程）
- 纯 React 应用，不直接访问 Node.js
- 通过 `window.electronAPI` 与主进程通信
- UI 组件和业务逻辑

## IPC 通信规范

```typescript
// preload/index.ts - 暴露 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 使用 Promise 包装
  readFile: (path: string) => ipcRenderer.invoke('fs:read', path),
  // 事件监听
  onFileChange: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('file:change', handler)
    return () => ipcRenderer.removeListener('file:change', handler)
  }
})

// main/ipc/fs.ts - 处理请求
ipcMain.handle('fs:read', async (_event, path: string) => {
  return await fs.readFile(path, 'utf-8')
})
```

## 目录结构规范

```
src/
├── main/           # 主进程代码
│   ├── index.ts    # 入口
│   ├── ipc/        # IPC handlers
│   ├── services/   # 业务服务
│   └── database/   # 数据库操作
├── preload/        # 预加载脚本
│   └── index.ts
├── renderer/       # 渲染进程（React）
│   ├── components/ # UI 组件
│   ├── hooks/      # 自定义 hooks
│   ├── contexts/   # React Context
│   ├── models/     # 类型定义
│   └── App.tsx
└── shared/         # 共享类型
    └── types.ts
```
