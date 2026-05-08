# Tippani — Feature Roadmap

This is the master index of features for **Tippani**, a local-first desktop notes + canvas + diagram app. Each feature below gets its own dedicated implementation plan when work begins on it; this document is the shared map they all reference.

For the original strategy doc (motivation, library choices, architecture sketch, risks), see [../i-am-planning-to-bright-codd.md](../i-am-planning-to-bright-codd.md).

## Overview

**Product.** A cross-platform desktop app (Windows / macOS / Linux) that mirrors `app.eraser.io`'s experience — markdown notes, freeform canvas, diagram-as-code, `⌘K` palette — running fully offline, with notes stored as plain `.md` files in a user-chosen vault folder (Obsidian-style, no lock-in).

**Stack.** Tauri 2 · React 19 + TypeScript · Vite · Tailwind CSS v4 · Zustand · CodeMirror 6 · Excalidraw · Mermaid · cmdk · `react-resizable-panels`.

**Storage.** Plain markdown in a vault folder. Canvas state lives in sibling `<note>.canvas.json` files. Diagram-as-code lives inside fenced ` ```mermaid ` / ` ```d2 ` blocks in markdown. App-local state in `.tippani/workspace.json` inside the vault.

**Status legend.** ✅ done · 🚧 in progress · ⬜ not started · 💤 deferred.

---

## Status board

| #     | Feature                          | Status | Est.    | Depends on |
| ----- | -------------------------------- | ------ | ------- | ---------- |
| F0    | Scaffold (Tauri + React + Vite)  | ✅     | done    | —          |
| F0.5  | Rebrand to Tippani               | ✅     | ½ day   | F0         |
| F1    | Vault + markdown editor          | ✅     | 3–5 d   | F0.5       |
| F2    | Layout + Tippani aesthetic       | ✅     | 2–3 d   | F1         |
| F3    | Command palette `⌘K`             | ⬜     | 1–2 d   | F2         |
| F4    | Excalidraw canvas                | ⬜     | 3–5 d   | F2         |
| F5    | Diagram-as-code (Mermaid)        | ⬜     | 3–4 d   | F1         |
| F6    | Polish, file watcher, search     | ⬜     | 3–5 d   | F1         |
| F7    | Distribution & auto-update       | ⬜     | 1–2 d   | F1–F6      |
| F8    | AI assist (deferred)             | 💤     | post-v1 | F7         |

**Realistic solo estimate to F7:** 4–7 weeks of focused work.

---

## Working agreement

- Each feature gets its own dedicated plan before code is written. Don't start a feature without one.
- Don't move on from a feature until its acceptance criteria pass end-to-end. Each feature is a runnable milestone.
- When a feature lands, update its **Status** column above and add a one-line dated note in its brief.
- Keep this file scannable. If a brief is growing past its budget, split detail into the per-feature plan.

---

## Feature briefs

### F0 — Scaffold ✅

- **Goal.** Boot a Tauri 2 + React 19 + TypeScript + Vite app on Windows.
- **Outcome.** `npm run tauri dev` opens a window. v1 dependencies (CodeMirror, Excalidraw, Mermaid, cmdk, Zustand, Tailwind v4, `react-resizable-panels`, `lucide-react`, `tauri-plugin-fs`, `tauri-plugin-dialog`) are installed.
- **Status note.** Done as the initial template.

### F0.5 — Rebrand to Tippani ✅

- **Goal.** Replace every `eraser-clone` / `eraser_clone_lib` / `com.eraserclone.app` reference with the `tippani` namespace.
- **Outcome.** Window title reads **Tippani**; package, crate, lib, and bundle identifier all match.
- **Files touched.** [package.json](../package.json), [src-tauri/Cargo.toml](../src-tauri/Cargo.toml), [src-tauri/src/main.rs](../src-tauri/src/main.rs), [src-tauri/tauri.conf.json](../src-tauri/tauri.conf.json), [index.html](../index.html), [README.md](../README.md).
- **Acceptance.** No `eraser-clone` / `eraser_clone` references remain in tracked source; `npm run tauri dev` launches a window titled "Tippani".

### F1 — Vault + markdown editor ✅

- **Goal.** Pick a vault folder, browse `.md` files in a sidebar, and edit them with debounced auto-save.
- **User outcome.** Pick a folder → tree populates → click a file → edit → disk updates within ~500 ms.
- **Implementation plan.** [docs/plans/F1-vault-markdown-editor.md](plans/F1-vault-markdown-editor.md).
- **Status note.** Landed 2026-05-08. 8 Rust unit tests + 29 Vitest tests passing. Tailwind v4 wired; testing infrastructure (Vitest + RTL) stood up under [tests/](../tests/).
- **Files shipped.**
  - Rust: [src-tauri/src/commands/vault.rs](../src-tauri/src/commands/vault.rs), [src-tauri/src/commands/mod.rs](../src-tauri/src/commands/mod.rs), [src-tauri/src/lib.rs](../src-tauri/src/lib.rs).
  - TS: [src/lib/tauri.ts](../src/lib/tauri.ts), [src/stores/vault.ts](../src/stores/vault.ts), [src/components/Sidebar/FileTree.tsx](../src/components/Sidebar/FileTree.tsx), [src/components/Editor/MarkdownEditor.tsx](../src/components/Editor/MarkdownEditor.tsx), [src/App.tsx](../src/App.tsx), [src/styles/global.css](../src/styles/global.css).
  - Tests: [tests/unit/](../tests/unit/), [tests/component/](../tests/component/), Rust `#[cfg(test)] mod tests` in `vault.rs`.
- **Acceptance (met).**
  - ✅ First-run vault picker; last vault path persists across restarts (Tauri `appConfigDir`).
  - ✅ Sidebar shows the vault's `.md` files and nested folders.
  - ✅ Editing a `.md` updates the file on disk after 400 ms debounce (`SAVE_DEBOUNCE_MS`).
  - ✅ Round-trip: external content edits made before app launch are loaded correctly.
- **Deferred.** Live external-edit reflection (file watcher) is F6. Multi-tab editing is F2.

### F2 — Layout + Tippani aesthetic ✅

- **Goal.** Make the app *feel* like Eraser — minimal, monochrome, tight spacing, multi-tab, resizable.
- **User outcome.** Open multiple notes as tabs; resize / collapse the sidebar; cycle theme system→light→dark with `Ctrl/Cmd+Shift+L`.
- **Implementation plan.** [docs/plans/F2-layout-aesthetic.md](plans/F2-layout-aesthetic.md).
- **Status note.** Landed 2026-05-08. 8 Rust tests + 59 Vitest tests passing. All CI gates (tsc, vitest, build, fmt, clippy, cargo test) green locally.
- **Files shipped.**
  - Stores: [src/stores/tabs.ts](../src/stores/tabs.ts), [src/stores/settings.ts](../src/stores/settings.ts), plus [src/stores/vault.ts](../src/stores/vault.ts) `clearActive()` action.
  - Hooks: [src/hooks/useResolvedTheme.ts](../src/hooks/useResolvedTheme.ts).
  - Components: [src/components/Layout/AppShell.tsx](../src/components/Layout/AppShell.tsx), [src/components/Layout/TopBar.tsx](../src/components/Layout/TopBar.tsx), [src/components/Layout/TabBar.tsx](../src/components/Layout/TabBar.tsx).
  - Updates: [src/App.tsx](../src/App.tsx) (composes shell + bridges tabs↔vault), [src/main.tsx](../src/main.tsx) (pre-render theme bootstrap), [src/styles/global.css](../src/styles/global.css) (`@custom-variant dark` + class-based tokens), [src/components/Editor/MarkdownEditor.tsx](../src/components/Editor/MarkdownEditor.tsx) (uses `useResolvedTheme`).
  - Tests: [tests/unit/tabs-store.test.ts](../tests/unit/tabs-store.test.ts) (14), [tests/unit/settings-store.test.ts](../tests/unit/settings-store.test.ts) (10), [tests/component/TabBar.test.tsx](../tests/component/TabBar.test.tsx) (6).
- **Acceptance (met).**
  - ✅ Tab open / focus-existing / close / middle-click-close / switch all work; closing active picks right neighbor.
  - ✅ Sidebar/main divider resizes; sidebar collapsible-to-0 with snap; sizes persist via `react-resizable-panels` `useDefaultLayout` + localStorage.
  - ✅ Theme cycle (system / light / dark) one shortcut away; persists; `system` mode live-tracks OS `prefers-color-scheme`.
  - ✅ Empty states + focus rings are intentional (`No vault open`, `Select a note`, `Welcome to Tippani`).
- **Notable choices.**
  - `react-resizable-panels` v4 API (`Group` / `Separator` / `useDefaultLayout`) — different from the canonical v2.x API, adapted accordingly.
  - localStorage polyfill in [tests/setup.ts](../tests/setup.ts) for jsdom 26 environment quirk.
- **Deferred.** Tab drag-to-reorder; preview tabs; per-vault state file; sidebar icons rail when collapsed.

### F3 — Command palette `⌘K` ⬜

- **Goal.** Every common action reachable from a `⌘K` palette without the mouse.
- **User outcome.** `⌘K` opens fuzzy search of notes + actions: open note, new note, new canvas, switch theme, change vault, etc.
- **Key files (to create).**
  - `src/components/CommandPalette/Palette.tsx` — `cmdk` integration.
  - `src/lib/commands.ts` — registry of actions, each with `id`, `label`, `keywords`, `run()`.
  - `src/hooks/useGlobalShortcuts.ts` — `⌘K`, `⌘N`, `⌘P`.
- **Libraries.** `cmdk`.
- **Acceptance.** `⌘K` opens overlay; typing fuzzy-matches notes and registered actions; Enter runs; Esc closes; works without a mouse.
- **Risks.** Ergonomic regression if shortcuts collide with the editor; scope shortcuts to the right focus context.

### F4 — Excalidraw canvas ⬜

- **Goal.** A "canvas" tab type backed by `@excalidraw/excalidraw`, with scene persisted to a sibling `<note>.canvas.json`.
- **User outcome.** Create a canvas → draw → close → reopen → identical scene restored.
- **Key files (to create).**
  - `src/components/Canvas/CanvasEditor.tsx` — Excalidraw wrapper, lazy-loaded.
  - `src-tauri/src/commands/vault.rs` — extend with `canvas_read` / `canvas_write` (or reuse `note_*` with arbitrary path).
  - `src/stores/tabs.ts` — extend with a `canvas` tab type.
- **Libraries.** `@excalidraw/excalidraw` (already installed).
- **Acceptance.** Round-trip draw/save/reopen preserves the scene byte-for-byte.
- **Risks.** Excalidraw's bundle is ~1 MB — lazy-load via `React.lazy` so startup stays fast.

### F5 — Diagram-as-code (Mermaid) ⬜

- **Goal.** Inline rendering of fenced ` ```mermaid ` blocks in a preview pane; live side-by-side editor/preview for `.md` files containing diagrams; PNG/SVG export.
- **User outcome.** Type Mermaid on the left → diagram updates live on the right → click "Export" to save PNG/SVG.
- **Key files (to create).**
  - `src/components/Diagram/MermaidBlock.tsx` — renders one fenced block.
  - `src/components/Editor/PreviewPane.tsx` — markdown → HTML with diagram blocks.
  - `src/lib/markdown.ts` — parse markdown, identify ` ```mermaid ` blocks.
- **Libraries.** `mermaid` (already installed). D2 via `@terrastruct/d2` WASM is optional v2.
- **Acceptance.** Diagram updates within ~250 ms of editing the source; export produces a valid PNG/SVG.
- **Risks.** Mermaid throws on parse errors mid-typing — debounce + show inline error, don't crash.

### F6 — Polish, file watcher, search ⬜

- **Goal.** External edits round-trip into the UI. Vault-wide plain-text search. Export to PDF/HTML. Settings page.
- **User outcome.** Edit a `.md` in VS Code while Tippani is open → tree and open editors refresh live. `⌘P`-style search across the vault returns hits with snippet context.
- **Key files (to create).**
  - `src-tauri/src/watcher.rs` — `notify`-based file watcher; emit Tauri events on changes.
  - `src-tauri/src/commands/search.rs` — Rust-side recursive walk + plain-text grep.
  - `src/components/Sidebar/SearchBox.tsx`.
  - `src/components/Settings/SettingsPanel.tsx`.
- **Libraries.** Rust `notify` crate. Tauri events. Optional `tantivy` for indexed FTS once vaults grow large (deferred until needed).
- **Acceptance.** Editing `.md` externally updates the in-app tree and any open editor without a manual refresh; search returns results within 200 ms on a vault of ~500 files.
- **Risks.** Watcher edge cases (rename/delete/atomic-save). Debounce events; reconcile against the in-memory file list rather than trusting individual events.

### F7 — Distribution & auto-update ⬜

- **Goal.** Signed installers for Windows / macOS / Linux from CI. Optional auto-updater.
- **User outcome.** Download `Tippani.msi` / `.dmg` / `.AppImage` and run it. App can self-update.
- **Key files (to create / finalize).**
  - `src-tauri/tauri.conf.json` — finalize icons, version, app id, updater endpoint.
  - `.github/workflows/release.yml` — matrix build (Win/macOS/Linux) on tag push.
- **Libraries.** Tauri bundler + Tauri updater plugin.
- **Acceptance.** Tagged release produces signed installers for all three OSes from GitHub Actions.
- **Risks.** macOS notarization secrets and Windows code-signing certs are out-of-scope of code; document setup in the F7 plan.

### F8 — AI assist 💤 (deferred, post-v1)

- **Goal.** Stub only. Likely candidates: chat side-panel, "explain this diagram", "expand outline", "summarize note".
- **Status.** Listed for visibility; design pass and per-feature plan happen after v1 (F7) ships.

---

## Out-of-scope for v1

- Real-time multi-user collab (the local-first design intentionally avoids server roundtrips).
- Mobile clients.
- Built-in cloud sync (the vault is a folder — Dropbox / iCloud / git already work).
- Verbatim Eraser DSL compatibility (Eraser's DSL is proprietary; Tippani uses Mermaid + optional D2).
