# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Design Principles

**Less is more** — 少即是多。保持简洁，避免过度设计，只实现必要功能。

## Project Overview

Playground is an Electron-based desktop application for AI-assisted coding. The core concept:

```
User (vibe coding) → AI (LLM) → Sandbox (e2b) → Artifact (storage)
```

Key characteristics:
- AI executes code in isolated sandboxes (e2b protocol compatible)
- Supports both OpenAI and Claude APIs
- Three-panel UI: File tree | Monaco Editor | AI Chat
- Artifacts can be exported to local filesystem, S3, GitHub, etc.
- **Distributable**: App runs independently without requiring host environment (no Node.js, Python, etc. on user's machine)

## Documentation

- `docs/requirement.md` - Full requirements specification
- `docs/TODO.md` - Development roadmap with 8 phases

## Tech Stack

### Core
| Category | Technology | Version |
|----------|------------|---------|
| Runtime | Electron | Latest |
| Language | TypeScript | v5.x |
| Build Tool | electron-vite | v3.x |
| Bundler | Vite | v6.x |
| Packager | electron-builder | v26.x |
| UI Framework | React | v19.x |
| Router | React Router | v7.x |

### UI & Styling
| Category | Technology | Notes |
|----------|------------|-------|
| CSS | Tailwind CSS v4 | Utility-first styling |
| Components | Radix UI | Headless, accessible components |
| Icons | Lucide React | Consistent icon library |
| Code Editor | Monaco Editor | VS Code's editor engine |
| Class Utilities | clsx + CVA | Conditional classes and variants |

### Data & Storage
| Category | Technology | Notes |
|----------|------------|-------|
| Local DB | better-sqlite3 | Projects, sessions, settings |
| Secure Storage | keytar / keychain | API keys encryption |
| File Storage | Node.js fs | Artifact local export |

### Internationalization
| Category | Technology |
|----------|------------|
| i18n | i18next + react-i18next |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Electron Main Process                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   AI Client │  │  Sandbox    │  │   Storage Backends  │  │
│  │  (OpenAI/   │  │  Client     │  │  (Local/S3/GitHub)  │  │
│  │   Claude)   │  │  (e2b API)  │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Database (SQLite) + Keychain               ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │ IPC (contextBridge)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Renderer Process                        │
│  ┌──────────┐  ┌───────────────┐  ┌─────────────────────┐  │
│  │ File Tree │  │ Monaco Editor │  │    AI Chat Panel    │  │
│  └──────────┘  └───────────────┘  └─────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Bottom Panel (Terminal / Preview)          ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
src/
├── main/           # Electron main process
│   ├── index.ts    # App entry, window management
│   ├── ipc/        # IPC handlers
│   ├── services/   # AI, Sandbox, Storage clients
│   └── database/   # SQLite operations
├── preload/        # Preload scripts (contextBridge)
│   └── index.ts    # Expose safe APIs to renderer
├── renderer/       # React frontend
│   ├── components/ # UI components
│   ├── hooks/      # Custom React hooks
│   ├── contexts/   # React contexts
│   ├── models/     # TypeScript interfaces
│   └── App.tsx     # Main app component
└── shared/         # Shared types and utilities
```

## Architecture Patterns

### IPC Communication
- Use `contextBridge` to expose safe APIs to renderer
- Use `ipcMain.handle` for async operations (returns Promise)
- Use `ipcMain.on` for fire-and-forget events
- Broadcast events across windows using `BrowserWindow.getAllWindows()`

### Database Pattern
- SQLite for local persistence (projects, sessions, settings)
- Soft deletes for recoverable data
- Proper indexing on frequently queried columns

### State Management
- Local React state for component-level state
- React Context for cross-component state
- IPC events for cross-window synchronization
- Debounced updates to prevent excessive writes

### Window Management
- Persist window bounds (x, y, width, height) to settings
- Restore window state on launch
- Handle multiple windows (main + separate note windows)

## Key Integration Points

### 1. AI Service Interface
Abstract interface with adapters for:
- OpenAI API (GPT models)
- Claude API (Claude models)

Supports:
- Streaming responses
- Tool Use / Function Calling
- Context management

### 2. Sandbox Interface (e2b Protocol)
Remote sandbox for code execution:
- Create/destroy sandbox instances
- File operations (read/write/list)
- Command execution with streaming output
- Pre-built templates (Node.js, Python, Go)

**Note**: Sandbox runs in cloud (e2b or compatible), not locally. The desktop app only sends commands and receives results.

### 3. Storage Interface
Pluggable backends for artifact persistence:
- Local filesystem
- AWS S3
- GitHub (push to repo)
- Extensible for other backends

## Development Commands

```bash
# Development
npm run dev          # Start dev server with hot reload

# Build
npm run build        # Build for production
npm run package      # Package for distribution

# Lint
npm run lint         # Run ESLint
npm run lint:fix     # Fix linting issues

# Type check
npm run typecheck    # Run TypeScript compiler
```

## Build & Distribution

### Platforms
- macOS (priority): DMG, ZIP
- Windows: NSIS installer
- Linux: AppImage, DEB

### electron-builder Configuration
- Code signing for macOS
- Auto-update support
- Bundle Node.js runtime (no host dependency)

## Development Phases

See `docs/TODO.md` for the full checklist. Current phase: **Phase 0 (Project Initialization)**

Phase dependencies:
- Phase 2 (AI) and Phase 3 (Sandbox) can run in parallel
- Phase 4 requires both Phase 2 and 3
- Phase 5-7 can run in parallel after Phase 4
