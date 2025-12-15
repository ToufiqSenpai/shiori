# AI Coding Agent Instructions

This project is a **Tauri 2 + React + TypeScript + Vite** desktop app using **TanStack Router** and **Tailwind CSS 4**.
Use these conventions to stay productive and consistent with the existing code.

## Architecture & Entry Points

- **Frontend root**: `src/main.tsx` creates a TanStack router from `routeTree.gen.ts` and renders `<RouterProvider />`.
- **Routing**: File-based routes live under `src/routes/` and are wired via the generated `src/routeTree.gen.ts` (never edit the generated file directly).
- **Root layout**: `src/routes/__root.tsx` defines the app shell and mounts `TanStackRouterDevtools`; keep global layout/UI and devtools here.
- **Home redirect**: `src/routes/index.tsx` immediately navigates to `/setup`; if you change the first-run flow, update this route.
- **State Management**: Use Zustand (see `src/stores/`) for global state or context. For local component state, use React `useState`/`useReducer`.
- **Utility functions**: Shared React/Tailwind helpers live in `src/lib/` (e.g. `cn` in `src/lib/utils.ts`); prefer extending these instead of re-implementing.
- **Tauri backend**: Rust code lives under `src-tauri/`; `src-tauri/src/main.rs` delegates to `ai_note_meet_summarizer_lib::run()` in `src-tauri/src/lib.rs`.
- **Tauri commands**: Backend commands are exposed with `#[tauri::command]` (see `greet` in `src-tauri/src/lib.rs`) and registered via `invoke_handler`.

## Styling & UI

- **Tailwind 4**: Styling is primarily via utility classes configured through `@tailwindcss/vite` in `vite.config.ts` and `src/main.css`.
- **Class composition**: Use the `cn` helper from `src/lib/utils.ts` to combine conditional class names instead of manual string concatenation.
- **Icons**: Use `lucide-react` for icons when needed; keep icon imports per-component (no global icon registry yet).
- **Shadcn UI**: This project using components from `shadcn/ui` (see `.github/shadcn-instructions.md`); follow their docs for usage patterns and theming. For shadcn configuration, see `components.json`.

## Routing Patterns

- **Create routes with TanStack**: Use `createFileRoute` in files under `src/routes/` (see `src/routes/index.tsx` and `src/routes/setup/index.tsx`).
- **Route exports**: Each route file should export a `Route` created via `createFileRoute()` and a `RouteComponent` (or inline `component` function).
- **Navigation**: Use `useNavigate` from `@tanstack/react-router` rather than direct `window.location` or history APIs.
- **Devtools**: Leave `TanStackRouterDevtools` wired in `__root.tsx` for easier debugging during development.

## Tauri Integration

- **Plugins**: `tauri-plugin-opener` is already configured in `src-tauri/src/lib.rs`; follow this pattern when adding new plugins.
- **Context**: `tauri::generate_context!()` is called in `run()`; update `src-tauri/tauri.conf.json` when changing app metadata or capabilities.
- **New commands**: When you add Rust commands (annotated with `#[tauri::command]`), register them in the `invoke_handler!` macro and call them from React via `@tauri-apps/api` (already in `package.json`).

## Build, Run & Dev Workflows

- **Dev (web only)**: `npm run dev` → Vite dev server on the configured port.
- **Tauri dev**: `npm run tauri` → runs `tauri dev` (frontend + Rust backend). This expects port **1420** and HMR on **1421** as configured in `vite.config.ts`.
- **Build**: `npm run build` → `tsc` type-checks then `vite build` bundles the frontend. Use `tauri build` (via `npm run tauri build` from the Tauri CLI) for packaging the desktop app.
- **Preview**: `npm run preview` serves the built frontend bundle.

## Code Generation & Tooling

- **TanStack router plugin**: `@tanstack/router-plugin/vite` is configured in `vite.config.ts` with `autoCodeSplitting: true`; it generates `routeTree.gen.ts` from files in `src/routes/`.
- **Do not edit generated files**: Treat `src/routeTree.gen.ts` (and any other `*.gen.ts` files) as generated; change the source route files instead.

## Conventions for New Code

- **File placement**: Put new React route screens under `src/routes/` using TanStack file routing; put shared hooks/utils in `src/lib/`.
- **Components**: Place reusable React components in `src/components/`. Organize by domain (e.g., `src/components/setup/`, `src/components/meeting/`). Do NOT create components inside `src/routes/`—that folder is strictly for file-based routing.
- **TypeScript**: Use typed props/return values and avoid `any`. Follow the existing simple functional component style.
- **Enums**: For any constant options (e.g., dropdown values, step indicators, status codes), use TypeScript enums and place them in `src/enums/`. Create a barrel export in `src/enums/index.ts`.
- **Imports**: Prefer relative imports within `src/` (`../lib/utils`) rather than deep absolute paths, matching existing files.
- **Error handling**: Surface errors in the UI rather than throwing globally; for Tauri commands, return `Result` on the Rust side and handle failures in the React caller.

## When Editing Rust Backend

- **Keep `run()` small**: Extend the builder in `src-tauri/src/lib.rs` (add plugins, manage windows, register commands) but keep `run()` as the central entry.
- **Serialization**: Use `serde`/`serde_json` for data passed between Rust and JS; add `#[derive(Serialize, Deserialize)]` on shared structs.

If anything here seems inconsistent with your changes or you add new major features (e.g., more routes, state management, or plugins), please update this file to document the new patterns.
