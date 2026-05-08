# F1 — Vault + Markdown Editor (Implementation Plan)

> Companion to [docs/FEATURES.md](../FEATURES.md). This is the per-feature plan for **F1**.

## Context

F0 (scaffold) and F0.5 (rebrand) are complete. Tippani currently shows the default Tauri+React greet boilerplate. F1 is the first feature that actually delivers product value: a user can pick a folder, browse `.md` files in a sidebar, click one, edit it, and the file on disk updates within ~500 ms.

This plan also stands up the **testing infrastructure** (Vitest + Testing Library for the frontend, `cargo test` for Rust commands), so every feature from F1 onward has a place to put unit + component tests.

## Goal

After F1:
- First launch shows a "Pick a vault" empty state.
- After picking a folder, the sidebar lists every `.md` file (in nested folders) in the vault.
- Clicking a file opens it in a CodeMirror 6 markdown editor.
- Editing debounces saves to disk after 400 ms of inactivity.
- The chosen vault path persists across restarts.

Out of scope (deferred): file watcher (F6), search (F6), tabs (F2), command palette (F3), canvas (F4), live preview (F5).

## Architecture

### IPC contract (Rust ↔ React)

All file-system access is owned by Rust. The React side never imports `node:fs` (it can't anyway in a webview) and never calls `invoke` directly outside of `src/lib/tauri.ts`.

| Command | Args | Returns | Purpose |
|---|---|---|---|
| `vault_list` | `path: String` | `Vec<VaultEntry>` | Recursive walk; returns nested tree filtered to folders + `.md` files. |
| `note_read` | `path: String` | `String` | Read a file's text contents. |
| `note_write` | `path: String, content: String` | `()` | Write text contents (overwrite). Creates parent dirs if missing. |
| `note_create` | `path: String` | `()` | Create a new empty `.md`; error if exists. |
| `note_rename` | `from: String, to: String` | `()` | Rename / move. |
| `note_delete` | `path: String` | `()` | Delete file. |
| `config_get_last_vault` | — | `Option<String>` | Read `<app_config_dir>/config.json`. |
| `config_set_last_vault` | `path: String` | `()` | Write `<app_config_dir>/config.json`. |

Every error is converted to `String` at the IPC boundary. `Result<T, String>` is the shape on every command so the frontend gets readable messages.

### Frontend layers

```
React component  →  src/lib/tauri.ts (typed wrappers)  →  invoke()  →  Rust command
                       ↑
            Zustand store (src/stores/vault.ts) calls the wrappers
```

Components do **not** call `invoke` directly. The store is the only consumer of `src/lib/tauri.ts` for file operations.

### Persistence

- **App-global** (last vault path): `<app_config_dir>/config.json`. On Windows: `%APPDATA%/com.tippani.app/config.json`. Owned by Rust, accessed via `config_get/set_last_vault`.
- **Per-vault** (tabs, layout): deferred to F2.
- **Files**: plain `.md` on disk in the vault.

### Picker

The native folder dialog comes from `tauri-plugin-dialog` (Rust + JS). The JS package is already in `package.json`; this plan adds the Rust crate + capability + plugin registration in `lib.rs`.

## File-by-file work list

### New Rust files
- `src-tauri/src/commands/mod.rs` — module barrel.
- `src-tauri/src/commands/vault.rs` — all eight commands above + `VaultEntry` struct + unit tests (`#[cfg(test)]`).

### Modified Rust files
- `src-tauri/Cargo.toml` — add `tauri-plugin-dialog = "2"`, `[dev-dependencies] tempfile = "3"`.
- `src-tauri/src/lib.rs` — register dialog plugin; register the new commands in `invoke_handler!`. Drop the `greet` demo command.
- `src-tauri/capabilities/default.json` — add `dialog:default`.

### New TS files
- `src/lib/tauri.ts` — typed `invoke` wrappers + `pickVault()` using `@tauri-apps/plugin-dialog`. Re-exports a `VaultEntry` type matching the Rust struct.
- `src/stores/vault.ts` — Zustand store: `vaultPath`, `entries`, `activeNotePath`, `noteContent`, `loading`, `error`, plus `bootstrap`, `pickAndOpen`, `refresh`, `openNote`, `updateNoteContent`, `flushPendingSave`.
- `src/components/Sidebar/FileTree.tsx` — recursive list, click-to-open, expand/collapse folders.
- `src/components/Editor/MarkdownEditor.tsx` — wraps `@uiw/react-codemirror` with markdown lang + dark theme; debounces saves (400 ms).
- `src/components/EmptyState.tsx` — "Pick a vault to begin" panel.
- `src/styles/global.css` — Tailwind v4 entry (`@import "tailwindcss";`) + a couple of CSS vars.

### Modified TS files
- `src/App.tsx` — replace boilerplate with `<AppShell>`: top bar, sidebar, editor pane.
- `src/main.tsx` — import `./styles/global.css`.
- `src/App.css` — delete (replaced by Tailwind / global.css).
- `vite.config.ts` — add `@tailwindcss/vite` plugin.
- `package.json` — add Vitest + Testing Library dev-deps + `test` / `test:ui` scripts.

### New tests
- `tests/setup.ts` — extend `expect` with `@testing-library/jest-dom`.
- `tests/README.md` — how to run.
- `tests/unit/tauri-wrapper.test.ts` — mocks `@tauri-apps/api/core` + `@tauri-apps/plugin-dialog`; asserts each wrapper calls the expected command with the expected args.
- `tests/unit/vault-store.test.ts` — mocks `src/lib/tauri.ts`; covers `bootstrap` (with/without saved vault), `pickAndOpen`, `refresh`, `openNote`, debounced save.
- `tests/component/FileTree.test.tsx` — renders a fixture tree; clicking a file fires the callback; folders expand/collapse.
- `vitest.config.ts` — jsdom env, RTL setup, `tests/**/*.test.{ts,tsx}` include.
- `src-tauri/src/commands/vault.rs` `#[cfg(test)] mod tests` — round-trip read/write, list filters, create-already-exists error, rename, delete.

## Test plan

**Frontend (Vitest, run via `npm test`):**
1. `pickVault` calls `open({ directory: true })` and returns the chosen path.
2. `vaultList`, `noteRead`, etc. each invoke the right command name with the right args.
3. Store `bootstrap` loads last vault if present; no-ops when not.
4. Store `pickAndOpen` writes config + refreshes entries.
5. Store `openNote` reads file content.
6. `FileTree` renders nested folders, clicking a `.md` calls `onSelect(path)`.

**Rust (cargo test, run via `cargo test --manifest-path src-tauri/Cargo.toml`):**
1. `vault_list` on a temp dir with a mix of `.md`, `.txt`, and folders returns only `.md` and folders.
2. `note_read` after `note_write` returns the same bytes.
3. `note_create` errors when the target already exists.
4. `note_rename` moves the file.
5. `note_delete` removes the file.

**E2E smoke (manual, no automation in F1):**
1. `npm run tauri dev` → window titled "Tippani" with empty state.
2. Click "Pick a vault" → choose a folder containing `notes/foo.md`.
3. Tree shows `notes/` with `foo.md` nested.
4. Click `foo.md` → editor opens with current contents.
5. Type a few characters → wait ~500 ms → confirm `foo.md` on disk has the new content (`type foo.md` in PowerShell or open in another editor).
6. Restart the app → vault is restored automatically; tree repopulates.

## Risks & mitigations

- **CodeMirror learning curve.** Stick to `@uiw/react-codemirror` + `@codemirror/lang-markdown` + a dark theme. Don't write a custom extension in F1.
- **Debounce-on-unmount data loss.** When the active note changes (or the app closes via Tauri's close event), flush any pending save synchronously before swapping. Implemented in the store via `flushPendingSave()`.
- **Path encoding on Windows.** Always pass absolute paths; never re-construct paths in JS. Rust `PathBuf` handles separators.
- **Permission scope creep.** `dialog:default` is plenty for the picker. We do **not** add `fs:default` because all file ops go through our own commands (tighter surface area).
- **Tauri 2 plugin registration order.** Register `tauri_plugin_dialog::init()` before `invoke_handler!`. Documented inline in `lib.rs`.

## Verification checklist (Definition of Done)

- [ ] `npm install` succeeds; no peer-dep warnings about Vitest.
- [ ] `npm test` passes all Vitest suites.
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml` passes.
- [ ] `npm run tauri dev` opens, picks a vault, edits a file, restarts, restores.
- [ ] No `eraser-clone` references remain anywhere.
- [ ] `docs/FEATURES.md` F1 row flips ✅ with a one-line dated note.
