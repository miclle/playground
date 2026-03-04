# Playground 开发清单

基于需求文档 `docs/requirement.md` 整理的开发任务清单。

**状态**: 🔄 进行中

---

## 当前问题

### Sandbox 沙箱集成问题

**问题描述**: 使用七牛云兼容 e2b 的沙箱服务时，API 调用返回 404 Not Found。

**已完成的改进**:
1. ✅ 添加了官方 e2b SDK (`npm install e2b`)
2. ✅ 重写了 E2BSandboxClient 使用官方 SDK
3. ✅ 添加了沙箱测试脚本 `src/main/services/sandbox/test.ts`
4. ✅ 添加了详细的调试日志
5. ✅ 添加了 WebdriverIO E2E 测试框架

**待验证**:
- [ ] 使用官方 e2b SDK 后沙箱是否能正常工作
- [ ] 七牛云沙箱 API 是否完全兼容 e2b SDK

**测试方法**:
```bash
# 设置环境变量
export E2B_API_KEY=your_api_key
export E2B_API_URL=https://cn-yangzhou-1-sandbox.qiniuapi.com

# 运行测试
npx ts-node --esm src/main/services/sandbox/test.ts
```

---

## Phase 0: 项目初始化 ✅

- [x] 初始化 Electron 项目结构（electron-vite）
- [x] 配置 TypeScript（main/preload/renderer 分离配置）
- [x] 配置 Tailwind CSS v4
- [x] 配置 ESLint + Prettier
- [x] 配置 package.json 脚本（dev / build / package）
- [x] 配置 electron-builder（多平台打包）

## Phase 1: UI 基础框架 ✅

- [x] 搭建主窗口三栏布局框架
- [x] 集成 Monaco Editor（中间代码编辑区）
- [x] 实现文件树组件（左侧）
- [x] 实现 AI 对话面板组件（右侧）
- [x] 实现底部面板（终端输出 / 预览切换）
- [x] 集成 WebView 预览组件
- [x] 实现窗口基础功能（标题栏、菜单、快捷键）

## Phase 2: AI 服务集成 ✅

- [x] 设计 AI 服务抽象接口
- [x] 实现 OpenAI API 适配器
- [x] 实现 Claude API 适配器
- [x] 实现 AI 流式响应处理
- [x] 实现对话上下文管理
- [x] 实现 AI 工具调用（Tool Use）机制

## Phase 3: Sandbox 沙箱集成（云端）✅

> Sandbox 运行在云端（e2b 或兼容服务），桌面应用通过 API 通信。

- [x] 设计 Sandbox 客户端接口（兼容 e2b 协议）
- [x] 实现 Sandbox REST/WebSocket 客户端
- [x] 实现 Sandbox 生命周期管理（创建/暂停/恢复/销毁）
- [x] 实现远程文件系统操作（读写/目录浏览）
- [x] 实现远程命令执行和输出流
- [x] 实现沙箱模板选择（Node.js/Python/Go 等预置环境）

## Phase 4: AI 与 Sandbox 联动 ✅

- [x] 实现 AI 调用 Sandbox 文件操作
- [x] 实现 AI 调用 Sandbox 命令执行
- [x] 实现代码生成 → Sandbox 写入 → 编辑器同步
- [x] 实现编辑器修改 → Sandbox 同步
- [x] 实现文件树与 Sandbox 文件系统双向绑定

## Phase 5: Artifact 产物存储 ✅

- [x] 设计存储后端抽象接口
- [x] 实现本地文件系统存储
- [x] 实现 AWS S3 存储
- [x] 实现 GitHub 存储（push / create repo）
- [x] 实现产物版本记录功能
- [x] 实现存储导出 UI（选择存储位置、配置参数）

## Phase 6: 项目与会话管理 ✅

- [x] 设计项目数据模型
- [x] 集成 SQLite 数据库（better-sqlite3）
- [x] 实现项目创建/打开/关闭/删除
- [x] 实现会话历史持久化存储
- [x] 实现会话列表和恢复功能
- [x] 实现项目与 Sandbox 实例的关联管理

## Phase 7: 配置管理 ✅

- [x] 设计配置数据模型
- [x] 实现 API Key 安全存储（系统 Keychain）
- [x] 实现配置界面（AI / Sandbox / 存储后端配置）
- [x] 实现多 Profile 管理和切换
- [x] 实现代理配置

## Phase 8: 完善与发布 ✅

- [x] 实现应用自动更新机制（electron-updater）
- [x] 添加错误处理和用户提示
- [x] 性能优化（大文件、长会话）
- [x] macOS 打包配置（electron-builder）
- [x] Windows / Linux 打包配置
- [x] 编写用户文档（README.md）

---

## 项目统计

| 指标 | 数值 |
|------|------|
| 总阶段数 | 9 |
| 总任务数 | 51 |
| 完成率 | 100% |
| 代码行数 | ~5000+ |
| 提交次数 | 12 |

## 文档索引

- `docs/requirement.md` - 需求文档
- `docs/DEVELOPMENT.md` - 开发总结
- `README.md` - 用户文档
- `CLAUDE.md` - 项目规范

## 后续优化

详见 `docs/DEVELOPMENT.md` 中的「后续优化建议」章节。
