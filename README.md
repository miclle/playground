# Playground

An AI-powered coding desktop application built with Electron. Code naturally with AI in a secure sandbox environment.

## Features

- **AI-Assisted Coding**: Vibe coding with OpenAI GPT or Claude models
- **Secure Sandbox**: Code executes in isolated cloud sandbox (e2b compatible)
- **Three-Panel UI**: File tree | Monaco Editor | AI Chat
- **Multi-Backend Storage**: Export artifacts to local, S3, or GitHub
- **Cross-Platform**: macOS, Windows, Linux support

## Getting Started

### Prerequisites

- Node.js >= 18.17
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/miclle/playground.git
cd playground

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build for Production

```bash
# Build for current platform
npm run build

# Package for distribution
npm run build:mac     # macOS (DMG + ZIP)
npm run build:win     # Windows (NSIS)
npm run build:linux   # Linux (AppImage + DEB)
```

## Development

### Project Structure

```
src/
├── main/           # Electron main process
│   ├── database/   # SQLite operations
│   ├── ipc/        # IPC handlers
│   └── services/   # AI, Sandbox, Storage services
├── preload/        # Preload scripts
├── renderer/       # React frontend
│   └── src/
│       ├── components/  # UI components
│       └── App.tsx      # Main app
└── shared/         # Shared types
```

### Tech Stack

- **Runtime**: Electron + TypeScript
- **Build**: electron-vite + Vite
- **UI**: React 19 + Tailwind CSS v4 + Radix UI
- **Editor**: Monaco Editor
- **Database**: better-sqlite3
- **AI**: OpenAI SDK + Anthropic SDK

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript check |

## Configuration

### AI Services

Configure your AI provider in Settings:

- **OpenAI**: API Key, optional base URL
- **Claude**: API Key, optional base URL

### Sandbox

Configure sandbox connection:

- **API Key**: e2b or compatible service key
- **Base URL**: Optional custom endpoint
- **Template**: Node.js, Python, Go environments

### Storage Backends

- **Local**: File system path
- **S3**: Bucket, region, credentials
- **GitHub**: Token, repository

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
                              │ IPC
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Renderer Process                        │
│  ┌──────────┐  ┌───────────────┐  ┌─────────────────────┐  │
│  │ File Tree │  │ Monaco Editor │  │    AI Chat Panel    │  │
│  └──────────┘  └───────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## License

MIT License - see [LICENSE](LICENSE) for details.
