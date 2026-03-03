# UI 组件规范

## 组件组织

### 基础组件 (components/ui/)
- 基于 Radix UI 的无样式组件
- 使用 CVA (Class Variance Authority) 定义变体
- 使用 clsx 处理条件类名

### 业务组件 (components/)
- 组合基础组件实现业务逻辑
- 保持组件职责单一

## 样式规范

### Tailwind CSS
- 优先使用 Tailwind 工具类
- 复杂样式抽取为 @apply 或独立 CSS
- 避免内联 style

### 命名约定
```tsx
// 组件文件：PascalCase.tsx
// 样式文件：PascalCase.css（如需要）
// 工具函数：camelCase.ts
```

## 布局约定

### 三栏布局
```
┌────────┬──────────────────┬────────────┐
│ File   │    Editor        │   Chat     │
│ Tree   │    (Monaco)      │   Panel    │
│ 240px  │    flex-1        │   320px    │
└────────┴──────────────────┴────────────┘
```

- 左侧文件树：固定宽度，可折叠
- 中间编辑器：自适应宽度
- 右侧对话：固定宽度，可折叠
- 底部面板：可切换显示/隐藏

### 响应式处理
- 小屏幕自动折叠侧边栏
- 使用 ResizeHandle 支持用户调整宽度
