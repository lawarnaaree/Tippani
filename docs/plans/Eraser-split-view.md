# Eraser.io Split View UI/UX (Implementation Plan)

## Goal
Redesign the current tab and editor layout to match Eraser.io's paradigm. Instead of having separate tabs for the markdown note and the canvas, a single document tab will have a three-way toggle (`Document` | `Both` | `Canvas`). When in `Both` mode, the markdown editor and the Excalidraw canvas will be displayed side-by-side using resizable panels.

## User Review Required
> [!IMPORTANT]
> **Fundamental Tab Behavior Change:** Currently, a single file can be opened twice (once as a note tab, once as a canvas tab). This plan proposes changing the architecture so that a file only has **one tab**. The view mode (`Document`, `Both`, `Canvas`) becomes a property of that tab.

## Proposed Changes

### 1. Tab Store Refactor
#### [MODIFY] `src/stores/tabs.ts`
- Change `Tab` structure: Remove `kind: "markdown" | "canvas"` and introduce `viewMode: "document" | "both" | "canvas"`.
- The Tab `id` will simply become the file `path`. A file can only be opened once.
- Add a new action `setViewMode(id: string, mode: "document" | "both" | "canvas")` to the store.

### 2. Layout & UI Components
#### [MODIFY] `src/components/Layout/TopBar.tsx`
- Replace the current 2-way toggle with a centered, 3-way segmented control matching Eraser.io: `[Document] [Both] [Canvas]`.
- Update props to receive `activeViewMode` and a `onSetViewMode` callback.

#### [MODIFY] `src/App.tsx`
- Update the tab retrieval logic to use the new `viewMode`.
- **The Split View:** In the `main` content area, conditionally render based on the `viewMode`:
  - `"document"`: Render only `<MarkdownEditor />`.
  - `"canvas"`: Render only `<CanvasEditor />`.
  - `"both"`: Render a new `react-resizable-panels` `<Group>` containing two `<Panel>`s separated by a `<Separator className="tippani-resize-handle" />`. The left panel will house the `<MarkdownEditor />` and the right panel the `<CanvasEditor />`.

### 3. Command Palette Integration
#### [MODIFY] `src/lib/commands.ts`
- Replace the "Open canvas for current note" command.
- Introduce three new commands available when a file is open:
  - "View: Document only"
  - "View: Split mode (Both)"
  - "View: Canvas only"

## Verification Plan
- **Tests:** Update `tabs-store.test.ts` to reflect the new `viewMode` logic and ensure `id === path`.
- **Manual Verification:** 
  - Open a file. Click `Both` in the top bar. Verify the markdown and canvas render side-by-side and can be resized.
  - Draw on the canvas while reading the markdown. Verify debounced saves still work.
  - Switch tabs and verify that each tab remembers its own `viewMode` state.

## Open Questions
- **Default View Mode:** When you click a file in the sidebar, should it default to `Document`, or should we remember the last view mode used globally? I will default it to `Document` for now, but each tab will remember its state once opened.
- **Split Proportions:** In `Both` mode, I will set the default split to 30% Document / 70% Canvas, as canvases usually need more space. Is this acceptable?
