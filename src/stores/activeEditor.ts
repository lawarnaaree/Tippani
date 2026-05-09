import { create } from "zustand";
import type { EditorView } from "@codemirror/view";

// Shared reference to the CodeMirror view that currently owns insertion focus.
// Set by MarkdownEditor when it mounts / unmounts. Read by global commands
// (symbol palette, color picker) that need to insert text at the cursor.
type ActiveEditorState = {
  view: EditorView | null;
  setView: (v: EditorView | null) => void;
};

export const useActiveEditor = create<ActiveEditorState>((set) => ({
  view: null,
  setView: (view) => set({ view }),
}));

// Imperative helpers used outside React components.

export function insertAtCursor(text: string): boolean {
  const view = useActiveEditor.getState().view;
  if (!view) return false;
  const { state } = view;
  const sel = state.selection.main;
  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert: text },
    selection: { anchor: sel.from + text.length },
    scrollIntoView: true,
  });
  view.focus();
  return true;
}

// Wrap the current selection (or insert markers at cursor) with the given
// before/after strings. Returns true on success.
export function wrapSelection(before: string, after: string): boolean {
  const view = useActiveEditor.getState().view;
  if (!view) return false;
  const { state } = view;
  const sel = state.selection.main;
  const selected = state.doc.sliceString(sel.from, sel.to);
  const insert = before + selected + after;
  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert },
    selection: {
      anchor: sel.from + before.length,
      head: sel.from + before.length + selected.length,
    },
    scrollIntoView: true,
  });
  view.focus();
  return true;
}
