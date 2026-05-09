import { useEffect } from "react";

export type GlobalShortcutHandlers = {
  onTogglePalette: () => void;
  onCycleTheme: () => void;
  onNewNote: () => void;
  onToggleSymbols: () => void;
};

/**
 * Consolidated global keyboard shortcuts.
 *
 * Listens on `window` in the **capture** phase so shortcuts fire before
 * CodeMirror or other focused elements consume the event.
 *
 * | Shortcut              | Action                |
 * |-----------------------|-----------------------|
 * | Ctrl/Cmd + K          | Toggle palette        |
 * | Ctrl/Cmd + P          | Toggle palette alias  |
 * | Ctrl/Cmd + Shift + L  | Cycle theme           |
 * | Ctrl/Cmd + N          | New note              |
 * | Ctrl/Cmd + Shift + S  | Toggle symbol palette |
 */
export function useGlobalShortcuts({
  onTogglePalette,
  onCycleTheme,
  onNewNote,
  onToggleSymbols,
}: GlobalShortcutHandlers): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;

      const key = e.key.toLowerCase();

      // Ctrl/Cmd + K  or  Ctrl/Cmd + P  →  toggle palette
      if ((key === "k" || key === "p") && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        onTogglePalette();
        return;
      }

      // Ctrl/Cmd + Shift + L  →  cycle theme
      if (key === "l" && e.shiftKey && !e.altKey) {
        e.preventDefault();
        onCycleTheme();
        return;
      }

      // Ctrl/Cmd + N  →  new note
      if (key === "n" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        onNewNote();
        return;
      }

      // Ctrl/Cmd + Shift + S  →  toggle symbol palette
      if (key === "s" && e.shiftKey && !e.altKey) {
        e.preventDefault();
        onToggleSymbols();
        return;
      }
    };

    // capture phase → fires before CodeMirror's keydown handlers
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [onTogglePalette, onCycleTheme, onNewNote, onToggleSymbols]);
}
