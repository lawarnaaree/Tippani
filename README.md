# Tippani

[![CI](https://github.com/lawarnaaree/Tippani/actions/workflows/ci.yml/badge.svg)](https://github.com/lawarnaaree/Tippani/actions/workflows/ci.yml)

Tippani is a local-first, privacy-focused desktop notes application built with Tauri and React. It combines the simplicity of markdown notes with the power of freeform canvas and diagrams-as-code.

## 🚀 Key Features

- **Local-First**: All data stays on your machine in plain `.md` and `.json` files.
- **Dual View**: Seamlessly switch between a Markdown editor and a Freeform Canvas (powered by Excalidraw).
- **Diagrams-as-Code**: Render Mermaid diagrams directly inside your notes.
- **Command Palette**: Quick navigation and action execution using `⌘K` or `Ctrl+K`.
- **Customizable**: Built-in themes (Light, Dark, System) and configurable editor settings.
- **Pinch-to-Zoom**: Smooth, industry-standard canvas interactions.

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Tauri 2.0](https://tauri.app/) (Rust backend, Web frontend) |
| **Frontend** | [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) |
| **State Management** | [Zustand](https://zustand-demo.pmnd.rs/) |
| **Markdown Editor** | [CodeMirror 6](https://codemirror.net/) |
| **Canvas** | [Excalidraw](https://excalidraw.com/) |
| **Diagrams** | [Mermaid](https://mermaid.js.org/) |

## 🏗️ Architecture

### Data Storage
Tippani uses a "Vault" system similar to Obsidian.
- **Notes**: Stored as `.md` files.
- **Canvas Scenes**: Stored as `.canvas.json` files alongside their corresponding markdown notes.
- **Config**: Application settings are persisted in the OS-standard app configuration directory.

### Inter-Process Communication (IPC)
The frontend communicates with the Rust backend via Tauri's `invoke` system. All OS-level operations (file system access, dialogs, etc.) are handled by the Rust layer to ensure performance and security.

## 💻 Getting Started

### Prerequisites
- Node.js (v22+)
- Rust (stable)

### Development
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run tauri dev
   ```

### Testing
```bash
npm test                                                # Frontend unit/component tests
cargo test --manifest-path src-tauri/Cargo.toml         # Rust backend tests
```

## 📦 Production & Distribution

For detailed instructions on building, signing, and releasing the application, see [PRODUCTION.md](./PRODUCTION.md).

## 🤝 Contributing

1. Fork the repo.
2. Create a feature branch.
3. Commit your changes.
4. Push to the branch.
5. Create a new Pull Request.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.
