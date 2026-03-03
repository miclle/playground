# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## Documentation

- `docs/requirement.md` - Full requirements specification
- `docs/TODO.md` - Development roadmap with 8 phases

## Planned Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Electron Main Process                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   AI Service │  │  Sandbox    │  │   Storage Backends  │  │
│  │  (OpenAI/    │  │  (e2b)      │  │  (Local/S3/GitHub)  │  │
│  │   Claude)    │  │             │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
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

## Tech Stack (Planned)

- **Runtime**: Electron + Node.js
- **Language**: TypeScript
- **Build**: Vite (electron-vite)
- **UI**: React + Monaco Editor
- **Sandbox**: e2b protocol compatible services
- **Secure Storage**: system Keychain for API keys

## Key Integration Points

1. **AI Service Interface** - Abstract interface with OpenAI and Claude adapters
2. **Sandbox Interface** - e2b-compatible API for file operations and command execution
3. **Storage Interface** - Pluggable backends for artifact persistence

## Development Phases

See `docs/TODO.md` for the full checklist. Current phase: **Phase 0 (Project Initialization)**

Phase dependencies:
- Phase 2 (AI) and Phase 3 (Sandbox) can run in parallel
- Phase 4 requires both Phase 2 and 3
- Phase 5-7 can run in parallel after Phase 4
