# F2 — Layout + Tippani Aesthetic (Implementation Plan)

> Companion to [docs/FEATURES.md](../FEATURES.md). Per-feature plan for **F2**.

## Context

F1 ships a working sidebar + single-pane markdown editor + auto-save, but the app does not yet *feel* like Eraser. F2 closes the gap with three additions, all frontend-only — no new Rust commands.

1. **Tabs.** Multiple notes open at once, each closeable.
2. **Resizable + collapsible panes.** Drag the divider; snap-collapse the sidebar; pane sizes persist.
3. **Theme toggle.** 3-state cycle `system / light / dark` via `Ctrl/Cmd+Shift+L`. `system` mode tracks OS `prefers-color-scheme` live.

## Architecture

### Two new stores

- [src/stores/tabs.ts](../../src/stores/tabs.ts) — `tabs: Tab[]`, `activeTabId: string | null`, with `openTab(path, kind)` (existing path → just focus), `closeTab(id)` (picks neighbor on close; `null` when last), `setActive(id)`. Tab id format `${kind}:${path}` so future canvas tabs (F4) can coexist with markdown tabs for the same path.
- [src/stores/settings.ts](../../src/stores/settings.ts) — `theme: ThemeMode`, `setTheme`, `cycleTheme`. Pure helpers `loadTheme`, `persistTheme`, `applyTheme`, `resolveDark` exported for unit testability and the FOUC-prevention bootstrap.

### Tabs ↔ vault wiring

Tabs become source of truth for "what's open"; vault remains source of truth for "what's loaded into the editor". App-level effect bridges:

```
FileTree.onSelect(path) → tabs.openTab(path)
                              ↓ (activeTabId changes)
                          App effect → vault.openNote(path) | vault.clearActive()
```

One new vault action: `clearActive()` flushes pending save and resets active note state. Used when the last tab closes.

### Theme via class

Tailwind v4's `dark:` variant defaults to media-query. F2 switches to class-based via `@custom-variant dark (&:where(.dark, .dark *));` in [src/styles/global.css](../../src/styles/global.css). CSS tokens move from a `@media (prefers-color-scheme: dark)` block to a `.dark` selector block. Theme is applied to `<html>` synchronously in [main.tsx](../../src/main.tsx) *before* React mounts, to avoid FOUC.

### Layout

`<AppShell>` is a presentational shell with four slots: `topBar`, `sidebar`, `tabBar`, `main`. It owns the `PanelGroup` with `autoSaveId="tippani-main"` (built-in localStorage size persistence). `App.tsx` becomes the orchestrator that wires state into the slots.

## Key design decisions

| Choice | Decision | Why |
|---|---|---|
| Tab id format | `${kind}:${path}` | Lets F4 add `canvas:<path>` without collisions. |
| Close-active neighbor pick | Right neighbor, fall back to left | Matches VSCode / browsers. |
| Theme persistence key | `tippani.theme` (localStorage) | Survives restarts. Tauri webview localStorage is per-app. |
| Pane size persistence | `react-resizable-panels` `autoSaveId="tippani-main"` | Library-native; no custom code. |
| Collapse behaviour | `collapsible`, `collapsedSize={0}`, `minSize={14}` | Library snaps when drag passes minSize. |
| Theme cycle shortcut | `Ctrl/Cmd+Shift+L` | Matches VSCode "Toggle Light/Dark Theme". |
| Theme cycle order | `system → light → dark → system` | Discoverable. |
| `dark:` variant gate | `.dark` class on `<html>` | Required for JS-driven theme + system mode. |
| TabBar empty state | Hidden when 0 tabs | Avoids dead chrome on first-run. |

## File-by-file work list

### New
- `src/stores/settings.ts`
- `src/stores/tabs.ts`
- `src/hooks/useResolvedTheme.ts`
- `src/components/Layout/AppShell.tsx`
- `src/components/Layout/TopBar.tsx`
- `src/components/Layout/TabBar.tsx`
- `tests/unit/tabs-store.test.ts`
- `tests/unit/settings-store.test.ts`
- `tests/component/TabBar.test.tsx`

### Modified
- `src/App.tsx` — composes `<AppShell>`; bridges tabs↔vault; wires `Ctrl/Cmd+Shift+L`.
- `src/main.tsx` — `applyTheme(loadTheme())` before render.
- `src/stores/vault.ts` — adds `clearActive()`.
- `src/styles/global.css` — `@custom-variant dark`; class-based tokens; tightened palette.
- `src/components/Editor/MarkdownEditor.tsx` — uses `useResolvedTheme()`.

## Test plan

**Frontend (Vitest):**
- Tabs store: open-then-focus duplicate path, close-active picks right neighbor, close-last clears active, close non-active preserves active id, `setActive` ignores unknown id.
- Settings store: `setTheme` persists + applies, `cycleTheme` cycles correctly, `resolveDark` correct for each mode (with mocked `matchMedia`), `applyTheme` toggles `.dark` on `<html>`.
- TabBar: renders tabs, click selects, X button closes, middle-click closes, active tab styled differently.

**Rust:** unchanged. F2 is frontend-only.

## Verification

```bash
# CI parity
npx tsc --noEmit
npm test
npm run build
cargo fmt --all -- --check     # in src-tauri/
cargo clippy --all-targets -- -D warnings
cargo test
```

**Manual smoke (`npm run tauri dev`):**

1. App opens with vault auto-restored (F1 still works).
2. Click 3 different notes → 3 tabs visible, last clicked active.
3. Click first tab → editor shows that note.
4. Edit, switch tab → unsaved content of original tab is flushed to disk.
5. Close middle tab via X → right neighbor becomes active.
6. Close all tabs → editor area shows "Select a note" empty state.
7. Drag sidebar/main divider toward left edge → sidebar snaps closed.
8. Drag from leftmost edge → sidebar snaps open.
9. Restart app → pane sizes persisted.
10. Press `Ctrl+Shift+L` three times → theme cycles system→light→dark→system. CodeMirror follows.
11. With theme `system`, change OS preference → app updates within ~1 s.

## Out of scope

- Tab drag-to-reorder.
- Preview tabs (italic, replaced).
- Per-vault state file (`.tippani/workspace.json`).
- Sidebar "icons rail" when collapsed.
- Command palette (F3).

## Risks

- **CSS token conflict** — F1 keyed dark on media query; F2 keys on `.dark` class. Mitigation: replace the entire media block.
- **Tabs↔vault race** — rapid tab switch could leak stale read. Mitigation: existing `vault.openNote` guard (`if (get().activeNotePath === path)`) covers it.
- **FOUC on first paint** — `applyTheme` *must* run before `ReactDOM.createRoot`.
