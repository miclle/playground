# Playground 开发清单

基于需求文档 `docs/requirement.md` 整理的开发任务清单。

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
- [ ] 实现产物版本记录功能
- [ ] 实现存储导出 UI（选择存储位置、配置参数）

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
- [ ] 实现代理配置

## Phase 8: 完善与发布 ✅

- [x] 实现应用自动更新机制（electron-updater）
- [x] 添加错误处理和用户提示
- [x] 性能优化（大文件、长会话）
- [x] macOS 打包配置（electron-builder）
- [x] Windows / Linux 打包配置
- [x] 编写用户文档（README.md）

---

## 依赖关系说明

```
Phase 0 ──► Phase 1 ──► Phase 2 ──► Phase 4
                │              │
                │              ▼
                └──► Phase 3 ──┘
                      │
                      ▼
                Phase 5 ──► Phase 6
                               │
                               ▼
                          Phase 7 ──► Phase 8
```

- **Phase 0-1**：基础框架，无依赖
- **Phase 2-3**：可并行开发
- **Phase 4**：依赖 Phase 2 和 Phase 3 完成
- **Phase 5-7**：可并行开发，依赖 Phase 4
- **Phase 8**：最后阶段

---

## 技术调研记录

### Sandbox 沙箱技术方案

**结论**：采用云端沙箱方案（e2b 协议兼容服务）

**原因**：
1. **安全性**：代码在云端隔离环境执行，不影响用户宿主机
2. **零依赖**：用户无需在本地安装 Node.js、Python 等运行时
3. **环境一致**：预置模板确保运行环境标准化
4. **资源弹性**：云端可动态分配计算资源

**技术对比**：

| 方案 | 隔离级别 | 本地依赖 | 适用场景 |
|------|----------|----------|----------|
| e2b (Firecracker) | microVM | 无 | ✅ 本项目首选 |
| Claude Code CLI | OS 进程级 | 需本地环境 | 本地开发工具 |
| OpenAI Codex CLI | OS 进程级 | 需本地环境 | 本地开发工具 |
| Docker | 容器级 | 需安装 Docker | 自建沙箱 |

**参考资源**：
- [e2b 官方文档](https://e2b.dev/docs)
- [Anthropic + E2B 合作](https://www.anthropic.com)
