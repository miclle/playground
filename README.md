# Playground

<p align="center">
  <strong>AI-Powered Coding Desktop Application</strong>
</p>

<p align="center">
  Write code naturally with AI in a secure cloud sandbox environment.
</p>

---

## Features

- 🤖 **AI-Assisted Coding** - Vibe coding with OpenAI GPT-4o or Claude Sonnet
- 🔒 **Secure Sandbox** - Code executes in isolated cloud sandbox (e2b compatible)
- 📁 **Three-Panel UI** - File tree | Monaco Editor | AI Chat
- 💾 **Multi-Backend Storage** - Export artifacts to local, S3, or GitHub
- 🌍 **Cross-Platform** - macOS, Windows, Linux support
- 🔄 **Auto-Update** - Built-in automatic update mechanism

## Screenshots

```
┌─────────────────────────────────────────────────────────────┐
│  File Tree  │        Monaco Editor        │    AI Chat     │
│   (240px)   │         (flex-1)            │    (320px)     │
│             │                             │                │
│  📁 src     │  function hello() {         │  User: Create  │
│    📄 index │    console.log('Hi')        │  a React app   │
│    📄 app   │  }                          │                │
│  📁 public  │                             │  AI: I'll help │
│    📄 html  │                             │  you create... │
├─────────────┴─────────────────────────────┴────────────────┤
│                    Terminal / Preview                        │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js >= 18.17
- npm >= 9.0

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

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Electron Main Process                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   AI Client │  │  Sandbox    │  │   Storage Backends  │  │
│  │  (OpenAI/   │  │  Client     │  │  (Local/S3/GitHub)  │  │
│  │   Claude)   │  │  (e2b API)  │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Database (SQLite) + Keychain               │ │
│  └─────────────────────────────────────────────────────────┘ │
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

## Project Structure

```
src/
├── main/                    # Electron main process
│   ├── index.ts             # App entry point
│   ├── database/            # SQLite operations
│   ├── ipc/                 # IPC handlers
│   └── services/            # Business services
│       ├── ai/              # AI service (OpenAI, Claude)
│       ├── sandbox/         # Sandbox client (e2b)
│       ├── storage/         # Storage backends
│       ├── config/          # Configuration management
│       └── integration/     # AI-Sandbox integration
├── preload/                 # Preload scripts
├── renderer/                # React frontend
│   └── src/
│       ├── components/      # UI components
│       ├── lib/             # Utilities
│       └── App.tsx          # Main app
└── shared/                  # Shared types
```

## Tech Stack

| Category | Technology |
|----------|------------|
| Runtime | Electron 35 |
| Language | TypeScript 5.8 |
| Build | electron-vite 3 + Vite 6 |
| UI | React 19 + Tailwind CSS 4 |
| Components | Radix UI + Lucide Icons |
| Editor | Monaco Editor |
| Database | better-sqlite3 |
| Security | keytar (system Keychain) |
| AI | OpenAI SDK + Anthropic SDK |

## Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Auto-fix linting issues |
| `npm run typecheck` | Run TypeScript type check |

### Configuration

#### AI Services

Configure your AI provider in Settings:

- **OpenAI**: API Key, base URL (optional)
- **Claude**: API Key, base URL (optional)

#### Sandbox

Configure sandbox connection:

- **API Key**: e2b or compatible service key
- **Base URL**: Optional custom endpoint
- **Template**: Node.js, Python, Go environments

#### Storage Backends

- **Local**: File system path
- **S3**: Bucket, region, credentials
- **GitHub**: Token, repository

## Documentation

- [Requirements](docs/requirement.md) - Full requirements specification
- [Development Summary](docs/DEVELOPMENT.md) - Development process and technical details
- [TODO](docs/TODO.md) - Development roadmap

## Roadmap

### Completed ✅

- [x] Project initialization
- [x] UI framework (three-panel layout)
- [x] AI service integration (OpenAI, Claude)
- [x] Sandbox integration (e2b compatible)
- [x] AI-Sandbox integration
- [x] Artifact storage (Local, S3, GitHub)
- [x] Project and session management
- [x] Configuration management
- [x] Auto-update mechanism
- [x] Cross-platform packaging

### Future Enhancements

- [ ] Multiple themes (light/dark mode)
- [ ] More keyboard shortcuts
- [ ] Code signing for distribution
- [ ] CI/CD pipeline
- [ ] E2E tests with WebdriverIO

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">
  Built with ❤️ using Electron + React + AI
</p>
