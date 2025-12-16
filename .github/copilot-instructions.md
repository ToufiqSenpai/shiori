# Copilot Instructions for Shiori (AI Note Meet Summarizer)

## Project Overview

Shiori is a privacy-focused Tauri v2 desktop app that transcribes meetings using local Whisper models and summarizes them with cloud LLMs (Gemini). The app name "shiori" appears in `package.json`, `Cargo.toml`, and `tauri.conf.json`.

## Architecture

### Frontend (React + TypeScript)
- **Framework**: React 19 + Vite + TanStack Router (file-based routing in `src/routes/`)
- **State Management**: Zustand stores in `src/stores/` - prefer Zustand over React context
- **UI Components**: shadcn/ui (new-york style) in `src/components/ui/` - add new components via `npx shadcn@latest add <component>`. See `.github/shadcn-instructions.md` for details.
- **Styling**: Tailwind CSS v4 with `@` path alias pointing to `src/`

### Backend (Rust + Tauri)
- **Entry point**: `src-tauri/src/lib.rs` - registers Tauri commands and plugins
- **Feature modules**: `src-tauri/src/features/` - organize by domain (e.g., `model/`)
- **API clients**: `src-tauri/src/api/` - external service integrations (Hugging Face)
- **State**: `src-tauri/src/state/` - app-wide state like `DownloadManager`
- **Security**: `src-tauri/src/security/secret_manager.rs` - uses OS keyring for API keys

## Key Patterns

### Tauri Command Pattern
1. Define command in Rust: `src-tauri/src/features/<domain>/commands.rs`
2. Register in `lib.rs` invoke_handler
3. Create TypeScript wrapper in `src/api/<domain>.ts` using `invoke()`

```typescript
// src/api/model.ts
export function getSpeechToTextModels(): Promise<SpeechToTextModelResult[]> {
  return invoke<SpeechToTextModelResult[]>('get_speech_to_text_models')
}
```

### Frontend-Backend Events (Download Progress)
- Rust emits events via `tauri::Emitter` with `app.emit("download", DownloadEvent::*)`
- TypeScript listens via `listen<T>('event-name', callback)` from `@tauri-apps/api/event`
- See `src/api/download.ts` and `src/stores/download-store.ts` for pattern

### Enums Synchronization
Keep Rust and TypeScript enums in sync:
- Rust: `src-tauri/src/features/model/speech_to_text.rs`, `text_generation.rs`
- TypeScript: `src/enums/` directory
- Use `#[serde(rename_all = "kebab-case")]` in Rust to match TypeScript conventions

## Development Commands

```bash
npm run tauri dev      # Start development (frontend + backend)
npm run tauri build    # Production build
npm run lint           # ESLint with autofix
npm run format         # Prettier formatting
```

## File Organization

- **Routes**: `src/routes/` - TanStack Router file-based routes (`__root.tsx` is layout)
- **Stores**: One Zustand store per domain (`settings-store.ts`, `download-store.ts`)
- **API Layer**: `src/api/` mirrors Rust command modules - keeps Tauri invocations centralized

## External Dependencies

- **Whisper Models**: Downloaded from `huggingface.co/ggerganov/whisper.cpp` to `app_local_data_dir()/models/`
- **LLM Provider**: Gemini API - keys stored securely via `keyring` crate
- **Model checksums**: SHA1 verification in `src-tauri/src/state/download.rs`

## Conventions

- Use `anyhow::Result` for Rust error handling, map to `String` at Tauri command boundary
- Prefer `#[serde(rename = "camelCase")]` for JSON field names crossing FFI boundary
- Settings persisted to `appConfigDir()/settings.json` via `@tauri-apps/plugin-fs`
