# Shiori (栞) - AI Note Meet Summarizer

<div align="center">

A privacy-focused desktop application that transcribes meetings using local Whisper models and generates intelligent summaries with cloud LLMs.

[![Version](https://img.shields.io/badge/version-0.1.0--alpha-blue.svg)](https://github.com/ToufiqSenpai/shiori)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-v2-24C8DB.svg)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)

</div>

## 🌟 Features

- **🔒 Privacy-First**: Transcription runs locally using Whisper.cpp models - your audio never leaves your device
- **🤖 AI-Powered Summaries**: Leverage Gemini API for intelligent meeting summaries
- **📁 Multiple Formats**: Support for audio and video files (MP3, WAV, MP4, MOV, etc.)
- **⚡ Hardware Acceleration**: GPU support for faster transcription Vulkan
- **🎨 Modern UI**: Built with React 19 and shadcn/ui components
- **🔐 Secure Storage**: API keys stored safely in OS keyring

## 📋 Prerequisites

Before installing Shiori, ensure you have the following:

### For Users

- **Operating System**: Windows 10/11
- **RAM**: Minimum 8GB (16GB recommended for large models)
- **Disk Space**: ~5GB for base models, more for larger models

### For Developers

- **Node.js**: v18 or higher
- **Rust**: Latest stable version (install via [rustup](https://rustup.rs/))
- **System Dependencies**:
  - **Windows**: Microsoft Visual C++ build tools

## 🚀 Installation (End Users)

### Windows

1. Download the latest `.exe` installer from the [Releases](https://github.com/ToufiqSenpai/shiori/releases) page
2. Run the installer and follow the setup wizard
3. Launch Shiori from the Start Menu or Desktop shortcut

## 🛠️ Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/ToufiqSenpai/shiori.git
cd shiori
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Rust dependencies are managed by Cargo and will be downloaded automatically
```

### 3. Configure Environment (Optional)

Create a `.env` file in the root directory if you need custom configuration:

```env
# Optional: Custom API endpoints
VITE_API_BASE_URL=https://api.example.com
```

### 4. Run Development Server

```bash
# Start both frontend and backend in development mode
npm run tauri dev
```

This will:

- Start the Vite dev server (frontend with hot reload)
- Build and run the Tauri app (backend with auto-rebuild)
- Open the application window

### 5. Build for Production

```bash
# Create optimized production build
npm run tauri build
```

Build artifacts will be available in `src-tauri/target/release/bundle/`

## 🏗️ Project Structure

```text
shiori/
├── src/                      # Frontend React code
│   ├── routes/              # TanStack Router file-based routing
│   ├── components/          # React components (shadcn/ui)
│   ├── stores/              # Zustand state management
│   ├── api/                 # Tauri command wrappers
│   └── enums/               # TypeScript enums
├── src-tauri/               # Backend Rust code
│   ├── src/
│   │   ├── features/       # Feature modules (model, summarize, chat)
│   │   ├── api/            # External API clients (Hugging Face)
│   │   ├── security/       # Secret management (keyring)
│   │   └── state/          # Application state (download manager)
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # Tauri configuration
└── package.json             # Node.js dependencies
```

## 📚 Technology Stack

### Frontend

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TanStack Router** - File-based routing
- **Zustand** - State management
- **shadcn/ui** - Component library
- **Tailwind CSS v4** - Styling

### Backend

- **Tauri v2** - Desktop app framework
- **Rust** - System programming language
- **whisper.cpp** - Local speech-to-text (via downloaded models)
- **Gemini API** - Cloud-based text generation
- **keyring** - Secure credential storage

## 🔧 Development Commands

```bash
# Start development server
npm run tauri dev

# Build for production
npm run tauri build

# Run linter with auto-fix
npm run lint

# Format code with Prettier
npm run format

# Frontend only (for UI development)
npm run dev
```

## 🧪 Testing

```bash
# Run Rust tests
cd src-tauri
cargo test

# Run frontend tests (if configured)
npm test
```

## 📦 Adding UI Components

This project uses shadcn/ui. To add new components:

```bash
# Example: Add a new component
npx shadcn@latest add <component-name>

# Example: Add a table component
npx shadcn@latest add table
```

Components will be added to `src/components/ui/` with the new-york style.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the GNU General Public License v3.0 (GPL-3.0).
Commercial licensing is available upon request. - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Whisper.cpp](https://github.com/ggerganov/whisper.cpp) for local transcription
- [Tauri](https://tauri.app/) for the amazing desktop framework
- [shadcn/ui](https://ui.shadcn.com/) for beautiful React components
- [Google Gemini](https://ai.google.dev/) for AI-powered summaries

## 📧 Support

- **Issues**: [GitHub Issues](https://github.com/ToufiqSenpai/shiori/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ToufiqSenpai/shiori/discussions)

## 🗺️ Roadmap

- [ ] Support for more LLM providers (OpenAI, Anthropic, local LLMs)
- [ ] Real-time transcription during meetings
- [ ] Export summaries to multiple formats (PDF, Markdown, DOCX)
- [ ] Meeting templates and custom prompts
- [ ] Speaker diarization
- [ ] Cloud sync (optional, encrypted)

---

<div align="center">
Made with ❤️ by <a href="https://github.com/ToufiqSenpai">ToufiqSenpai</a>
</div>
