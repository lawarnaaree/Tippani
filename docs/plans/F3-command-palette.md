# F3 — Command Palette `⌘K` (Implementation Plan)

> Companion to [docs/FEATURES.md](../FEATURES.md). Per-feature plan for **F3**.

## Context

F2 shipped tabs, resizable layout, and theme cycling. The app is now usable with mouse-only interaction, but there's no keyboard-first workflow. F3 adds a command palette (`Ctrl/Cmd+K`) that provides fuzzy-searchable access to **every vault note** and **all registered actions** from a single overlay — mirroring the `⌘K` experience from Eraser, Linear, and VS Code.

**Library.** `cmdk@1.1.1` is already installed. It provides the headless `<Command>` component with built-in fuzzy-matching, keyboard navigation, and accessibility (ARIA `combobox`).

**Scope.** Frontend-only — no new Rust commands. All data (entries, actions) is already available in Zustand stores.

---

## Architecture

### 1. Command registry — `src/lib/commands.ts`

A pure-data registry of app-wide actions. Each command has:

```ts
type Command = {
  id: string;           // e.g. "theme.cycle", "vault.change"
  label: string;        // displayed in palette
  keywords?: string[];  // extra search terms for fuzzy match
  shortcut?: string;    // display-only shortcut hint (e.g. "Ctrl+Shift+L")
  section: "notes" | "actions";
  run: () => void;      // executed on Enter
};
```

The registry is built dynamically at render time, not a static array, because it depends on live store state (vault entries, theme mode, etc.). The palette component calls a `useCommands()` hook that merges:

- **Notes** — one `Command` per vault entry (flattened recursively), `run()` → `tabs.openTab(path)`
- **Actions** — static list: "New note", "Change vault", "Refresh vault", "Cycle theme", "Close tab", "Close all tabs"

### 2. Palette component — `src/components/CommandPalette/Palette.tsx`

A `cmdk`-based dialog overlay composed of:

```
<Command.Dialog>     ← overlay + backdrop
  <Command.Input>    ← search field
  <Command.List>     ← scrollable results
    <Command.Group heading="Notes">
      <Command.Item>  ← one per vault file
    <Command.Group heading="Actions">
      <Command.Item>  ← one per registered action
  <Command.Empty>    ← "No results found."
```

**Visual design:**
- Centered modal overlay with semi-transparent backdrop (Eraser/Linear style)
- Monochrome, tight spacing, consistent with Tippani's aesthetic
- Shortcut hints right-aligned per item (dim text)
- Smooth fade-in animation via CSS transitions
- Max-height scrollable list
- Focus trap within the dialog

### 3. Global shortcuts hook — `src/hooks/useGlobalShortcuts.ts`

Consolidates all global keyboard shortcuts into one hook, replacing the inline `useEffect` in App.tsx:

| Shortcut | Action |
|---|---|
| `Ctrl/Cmd+K` | Toggle command palette |
| `Ctrl/Cmd+Shift+L` | Cycle theme (moved from App.tsx) |
| `Ctrl/Cmd+N` | New note (triggers inline create in sidebar) |
| `Ctrl/Cmd+P` | Open command palette (alias for ⌘K, for VS Code muscle memory) |

All shortcuts use `preventDefault()` to avoid browser/editor conflicts. The hook receives callbacks as params so it stays pure.

### 4. Integration — `src/App.tsx`

- Adds `const [paletteOpen, setPaletteOpen] = useState(false)` state
- Renders `<Palette>` as a top-level child (portals above everything)
- Passes store actions into `useGlobalShortcuts()`
- Removes the inline `Ctrl+Shift+L` effect (now in the hook)

---

## Key Design Decisions

| Choice | Decision | Why |
|---|---|---|
| cmdk Dialog vs custom | `Command.Dialog` | Built-in focus trap, backdrop, portal, accessibility |
| Shortcut collision | `preventDefault` + listen at `window` level | CodeMirror handles its own events; palette shortcut fires first at window |
| Fuzzy search source | `cmdk`'s built-in filtering | Good enough for vault sizes < 10K files; no custom index needed |
| Notes flattening | Recursive flatten of vault `entries` tree | cmdk `Item` is a flat list; folders don't make sense as openable items |
| Shortcut display | Platform-aware (`⌘` on macOS, `Ctrl` on others) | Detected via `navigator.platform` at render time |
| Palette z-index | `z-50` (above everything) | Must overlay tabs, editor, sidebar |
| Animation | CSS `opacity` + `transform` transition (150ms) | Minimal, performant, matches Tippani feel |
| New note flow | Opens inline create in sidebar (reuses existing) | Consistent with F2's flow; no new modal |

---

## Proposed Changes

### New Files

#### [NEW] `src/lib/commands.ts`
- `Command` type definition
- `useCommands(opts)` hook that builds the full command list from store state
- Flattens vault entries recursively, creates one command per `.md` file
- Registers static action commands (theme, vault, tabs)

#### [NEW] `src/components/CommandPalette/Palette.tsx`
- `cmdk` `Command.Dialog` integration
- Two groups: "Notes" (files) and "Actions" (commands)
- Keyboard shortcut hints on each item
- Themed with Tippani CSS variables
- `Command.Empty` fallback
- Close on Esc, close on item select

#### [NEW] `src/hooks/useGlobalShortcuts.ts`
- Single `useEffect` listener for all global shortcuts
- Accepts callback props: `onTogglePalette`, `onCycleTheme`, `onNewNote`
- Platform detection util for display purposes

#### [NEW] `tests/component/command-palette.test.tsx`
- Palette renders when open
- Typing filters items
- Enter selects and closes
- Esc closes
- Notes section populated from vault entries
- Actions section shows registered commands

---

### Modified Files

#### [MODIFY] `src/App.tsx`
- Add `paletteOpen` state
- Render `<Palette>` at top level
- Replace inline `Ctrl+Shift+L` effect with `useGlobalShortcuts()`
- Wire `⌘K` → `setPaletteOpen`, `⌘N` → trigger new note flow

#### [MODIFY] `src/styles/global.css`
- Add command palette overlay styles (backdrop, dialog, input, item, animation)
- All themed via `--tippani-*` variables for light/dark consistency

#### [MODIFY] `docs/FEATURES.md`
- Update F3 status from ⬜ to ✅ with status note after completion

---

## CSS Design

The palette uses Tippani's existing CSS variable system. Key styles:

```css
/* Backdrop */
.tippani-palette-backdrop { background: rgba(0,0,0,0.5); }
.dark .tippani-palette-backdrop { background: rgba(0,0,0,0.7); }

/* Dialog */
.tippani-palette { 
  background: var(--tippani-bg);
  border: 1px solid var(--tippani-border);
  border-radius: 12px;
  box-shadow: 0 16px 70px rgba(0,0,0,0.2);
  max-width: 560px;
  width: 90%;
}

/* Items */
.tippani-palette-item[data-selected="true"] {
  background: var(--tippani-hover);
}
```

---

## Test Plan

### Unit / Component tests (Vitest + RTL)

| Test | Assertion |
|---|---|
| `useCommands` returns notes from vault entries | Count matches flattened entries |
| `useCommands` includes static actions | "Cycle theme", "Change vault" present |
| Palette renders when `open={true}` | Dialog visible in DOM |
| Palette hidden when `open={false}` | Dialog not in DOM |
| Typing filters items | Only matching items visible |
| Enter on item fires `run()` and closes | `onOpenChange(false)` called |
| Esc closes palette | `onOpenChange(false)` called |
| `useGlobalShortcuts` fires `onTogglePalette` on Ctrl+K | Callback called once |
| `useGlobalShortcuts` fires `onCycleTheme` on Ctrl+Shift+L | Callback called once |

### Verification commands

```bash
npx tsc --noEmit
npm test
npm run build
```

### Manual smoke (`npm run tauri dev`)

1. Press `Ctrl+K` → palette opens centered, with backdrop
2. Type a note name → list filters in real time
3. Arrow-down + Enter → note opens in a tab, palette closes
4. Press `Ctrl+K`, type "theme" → "Cycle theme" action visible
5. Enter on "Cycle theme" → theme toggles, palette closes
6. Press `Esc` → palette closes without action
7. Click backdrop → palette closes
8. `Ctrl+P` → palette opens (alias)
9. `Ctrl+N` → new note input appears in sidebar
10. Dark mode → palette respects dark tokens
11. With no vault open → palette shows only action commands (no notes section)

---

## Risks

| Risk | Mitigation |
|---|---|
| `Ctrl+K` captured by CodeMirror | Listener on `window` with `capture: true` fires before CM; `preventDefault` stops propagation |
| Large vault (1000+ entries) makes palette slow | cmdk's built-in filter is O(n) string match — fine for 10K items. If perf matters later (F6), pre-compute a search index |
| Focus trap conflict with Tauri window | cmdk `Dialog` uses `dialog` element with `open`; standard browser focus trap |
| cmdk v1 API differences | Verified against `cmdk@1.1.1` — `Command.Dialog`, `Command.Input`, `Command.List`, `Command.Item`, `Command.Group`, `Command.Empty` are all stable |

---

## Out of Scope

- Contextual sub-menus (e.g. "Go to line", "Go to symbol") — these are F6/F8 territory
- Recently-opened notes ordering (requires persistence — deferred to F6)
- Custom user-defined commands
