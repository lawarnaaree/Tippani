# F4 — Excalidraw Canvas (Implementation Plan)

> Companion to [docs/FEATURES.md](../FEATURES.md). Per-feature plan for **F4**.

## Context

Tippani aims to provide an Eraser-like experience with both markdown notes and a freeform canvas. F4 introduces the canvas capability using `@excalidraw/excalidraw`. To keep the local-first, plain-file philosophy, canvas data will be saved as plain JSON files next to their corresponding markdown notes (e.g., `hello.md` has a sibling `hello.canvas.json`). 

**Libraries:** `@excalidraw/excalidraw@0.18.1` is already installed.
**Scope:** Add a new "canvas" tab type, integrate the Excalidraw editor (lazy-loaded for performance), and wire it up to save/load from the vault.

---

## Architecture

### 1. Canvas File Storage (`hello.canvas.json`)
- Every markdown note in the vault implicitly has a potential sibling canvas file.
- The existing Rust commands (`note_read`, `note_write`) in `vault.rs` do not restrict file extensions, so we can reuse them directly to read and write `.canvas.json` files without writing new Rust code.
- If a canvas file doesn't exist when opened, the app will simply initialize a blank Excalidraw scene and create the file upon the first save.

### 2. Tabs Store (`src/stores/tabs.ts`)
- Update `TabKind` to `"markdown" | "canvas"`.
- The `Tab` ID format is already `${kind}:${path}`, so `canvas:/vault/hello.md` will naturally coexist with `markdown:/vault/hello.md`.
- No store changes are strictly necessary, just utilizing the existing `kind` parameter.

### 3. Canvas Editor Component (`src/components/Canvas/CanvasEditor.tsx`)
- **Lazy Loading:** Excalidraw is a large dependency (~1MB). It will be loaded via `React.lazy` and wrapped in `<Suspense>` so the initial app bundle remains tiny and app startup stays fast.
- **State Management:** The component will fetch the `.canvas.json` content on mount using `note_read`.
- **Saving:** Uses Excalidraw's `onChange` callback, debounced (similar to the markdown editor), to serialize the `elements` and `appState` to JSON and save via `note_write`.
- **Theme:** Passes the current Tippani theme (`light` or `dark`) directly into Excalidraw's `theme` prop for a seamless aesthetic.

### 4. UI/UX Smoothness & Integration (`src/App.tsx` & `TopBar.tsx`)
- **Navigation:** How do users get to the canvas?
  - **TopBar Toggle:** When a document is active, the `TopBar` will show a segmented control or buttons to switch between "Note" and "Canvas" for the current file.
  - **Command Palette:** Add an action in `⌘K` to "Open canvas for current note".
- **Rendering:** In `App.tsx`, check the `activeTab.kind`. If it's `"canvas"`, render the lazy-loaded `<CanvasEditor />`. Otherwise, render the `<MarkdownEditor />`.
- **Loading State:** A smooth, minimal loading skeleton or spinner will match the app's aesthetic while Excalidraw's JS chunk loads.

---

## Proposed Changes

### New Files

#### [NEW] `src/components/Canvas/CanvasEditor.tsx`
- The wrapper for `<Excalidraw />`.
- Handles reading the sibling `.canvas.json` file.
- Debounces `onChange` to save to disk.
- Accepts `path` (the `.md` path) and `theme`.

### Modified Files

#### [MODIFY] `src/stores/tabs.ts`
- Change `TabKind` from `"markdown"` to `"markdown" | "canvas"`.

#### [MODIFY] `src/lib/commands.ts`
- Add a new action: "Open canvas for current note" (only visible if a note is currently active).

#### [MODIFY] `src/components/Layout/TopBar.tsx`
- Add a subtle Note / Canvas toggle switch when a file is open, allowing users to easily hop between the markdown and whiteboard views of a document.

#### [MODIFY] `src/App.tsx`
- Import `CanvasEditor` using `React.lazy`.
- Add `<Suspense>` fallback.
- Render either `<MarkdownEditor>` or `<CanvasEditor>` based on `activeTab?.kind`.
- Pass down the active tab's kind to the `TopBar` so it can highlight the correct toggle state.

#### [MODIFY] `docs/FEATURES.md`
- Mark F4 as completed and update the shipped files / acceptance criteria.

---

## UI / Theme Details
- Excalidraw provides a clean `UIOptions` prop to hide its default background/canvas controls if we want to customize them, but for v1, we will keep the default Excalidraw UI overlaid on our app shell.
- Excalidraw's `theme` prop will be strictly bound to Tippani's `useResolvedTheme()` so it cycles perfectly with `⌘+Shift+L`.

---

## Test Plan

- **Unit/Component:**
  - Verify `TabKind` accepts `"canvas"`.
  - Verify `TopBar` renders the Note/Canvas toggle.
- **Manual Verification:**
  - Click "Canvas" in the TopBar -> switches to a new tab for the canvas.
  - Draw a rectangle -> wait 500ms -> check disk for `*.canvas.json`.
  - Close tab -> reopen -> rectangle is restored perfectly.
  - Cycle theme (`⌘+Shift+L`) -> Canvas instantly switches between light and dark mode.
  - Lazy load is confirmed by checking network tab (Excalidraw chunk loads only when a canvas is opened).

## Open Questions for User
- **Sibling File Naming:** I plan to use `filename.canvas.json` alongside `filename.md`. Is this acceptable, or do you prefer them stored in a `.tippani` subfolder to keep the vault clean? (Using siblings is closer to the Obsidian-canvas approach).
- **Tab Behavior:** Currently, clicking "Canvas" will open a *separate* tab (e.g. you can have both `markdown:hello.md` and `canvas:hello.md` open simultaneously as two tabs). Is this desired, or should switching to Canvas replace the current tab's view? (Separate tabs is standard IDE behavior).
