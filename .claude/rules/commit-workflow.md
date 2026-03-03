# 提交与工作流规范

## 提交粒度

每完成一个小的阶段或功能就提交：
- 单个组件实现完成
- 单个服务模块完成
- 配置调整完成
- Bug 修复

## 提交消息格式

```
<type>(<scope>): <subject>

<body> (可选)
```

### 常用 type
- `feat`: 新功能
- `fix`: Bug 修复
- `refactor`: 重构
- `docs`: 文档更新
- `style`: 代码格式
- `chore`: 构建/工具

### 示例
```
feat(editor): 集成 Monaco Editor

- 添加 Monaco Editor 组件
- 配置 TypeScript 语法高亮
- 实现文件内容同步
```

## 开发流程

1. 拉取最新代码
2. 实现功能
3. 自测通过
4. 提交代码
5. 推送远程
6. 更新文档（如需要）

## 文档同步

以下变更需要同步更新文档：
- 新增功能 → 更新 CLAUDE.md
- 架构调整 → 更新 CLAUDE.md 架构图
- 依赖变更 → 更新 CLAUDE.md 技术栈
- 接口变更 → 更新服务规范
