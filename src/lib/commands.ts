import { useMemo } from "react";
import type { VaultEntry } from "./tauri";
import type { ViewMode } from "../stores/tabs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CommandSection = "notes" | "actions";

export type Command = {
  id: string;
  label: string;
  keywords?: string[];
  shortcut?: string;
  section: CommandSection;
  run: () => void;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Detect macOS / iOS for display-only shortcut labels. */
export function isMac(): boolean {
  if (typeof navigator === "undefined") return false;
  return /mac|iphone|ipad|ipod/i.test(navigator.userAgent);
}

/** Return the platform-appropriate modifier symbol. */
export function modKey(): string {
  return isMac() ? "⌘" : "Ctrl";
}

/**
 * Recursively flatten a VaultEntry tree into a list of file paths.
 * Folders are skipped — only `.md` files become palette items.
 */
export function flattenEntries(entries: VaultEntry[]): VaultEntry[] {
  const result: VaultEntry[] = [];
  for (const entry of entries) {
    if (entry.kind === "file") {
      result.push(entry);
    } else if (entry.children) {
      result.push(...flattenEntries(entry.children));
    }
  }
  return result;
}

/** Strip `.md` extension for display. */
function displayName(filename: string): string {
  return filename.replace(/\.md$/i, "");
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export type UseCommandsOpts = {
  entries: VaultEntry[];
  activePath: string | null;
  onOpenNote: (path: string) => void;
  onSetViewMode: (mode: ViewMode) => void;
  onNewNote: () => void;
  onChangeVault: () => void;
  onRefreshVault: () => void;
  onCycleTheme: () => void;
  onCloseTab: () => void;
  onCloseAllTabs: () => void;
  onOpenSettings: () => void;
  onExportHtml: () => void;
  onExportPdf: () => void;
};

/**
 * Build the full command list from live store state.
 * Memoised so the palette doesn't re-compute on every render.
 */
export function useCommands(opts: UseCommandsOpts): Command[] {
  const {
    entries,
    activePath,
    onOpenNote,
    onSetViewMode,
    onNewNote,
    onChangeVault,
    onRefreshVault,
    onCycleTheme,
    onCloseTab,
    onCloseAllTabs,
    onOpenSettings,
    onExportHtml,
    onExportPdf,
  } = opts;

  return useMemo(() => {
    const mod = modKey();

    // --- Notes ---------------------------------------------------------------
    const flat = flattenEntries(entries);
    const noteCommands: Command[] = flat.map((entry) => ({
      id: `note:${entry.path}`,
      label: displayName(entry.name),
      keywords: [entry.name, entry.path],
      section: "notes" as const,
      run: () => onOpenNote(entry.path),
    }));

    // --- Actions -------------------------------------------------------------
    const actionCommands: Command[] = [
      {
        id: "action:new-note",
        label: "New note",
        keywords: ["create", "add", "file"],
        shortcut: `${mod}+N`,
        section: "actions" as const,
        run: onNewNote,
      },
      {
        id: "action:change-vault",
        label: "Change vault",
        keywords: ["open", "folder", "pick", "switch"],
        section: "actions" as const,
        run: onChangeVault,
      },
      {
        id: "action:refresh-vault",
        label: "Refresh vault",
        keywords: ["reload", "sync"],
        section: "actions" as const,
        run: onRefreshVault,
      },
      {
        id: "action:cycle-theme",
        label: "Cycle theme",
        keywords: ["dark", "light", "system", "mode", "toggle"],
        shortcut: `${mod}+Shift+L`,
        section: "actions" as const,
        run: onCycleTheme,
      },
      {
        id: "action:close-tab",
        label: "Close current tab",
        keywords: ["tab", "close"],
        section: "actions" as const,
        run: onCloseTab,
      },
      {
        id: "action:close-all-tabs",
        label: "Close all tabs",
        keywords: ["tab", "close", "all"],
        section: "actions" as const,
        run: onCloseAllTabs,
      },
      {
        id: "action:open-settings",
        label: "Open settings",
        keywords: ["settings", "preferences", "config", "options"],
        section: "actions" as const,
        run: onOpenSettings,
      },
    ];

    if (activePath) {
      actionCommands.push(
        {
          id: "action:view-document",
          label: "View: Document only",
          keywords: ["view", "document", "markdown", "text", "note"],
          section: "actions" as const,
          run: () => onSetViewMode("document"),
        },
        {
          id: "action:view-both",
          label: "View: Editor + Preview (Both)",
          keywords: ["view", "split", "both", "side-by-side", "preview", "mermaid", "diagram"],
          section: "actions" as const,
          run: () => onSetViewMode("both"),
        },
        {
          id: "action:view-canvas",
          label: "View: Canvas only",
          keywords: ["view", "canvas", "draw", "whiteboard", "excalidraw"],
          section: "actions" as const,
          run: () => onSetViewMode("canvas"),
        },
        {
          id: "action:export-html",
          label: "Export note as HTML",
          keywords: ["export", "html", "save", "share"],
          section: "actions" as const,
          run: onExportHtml,
        },
        {
          id: "action:export-pdf",
          label: "Export note as PDF",
          keywords: ["export", "pdf", "print", "save"],
          section: "actions" as const,
          run: onExportPdf,
        },
      );
    }

    return [...noteCommands, ...actionCommands];
  }, [
    entries,
    activePath,
    onOpenNote,
    onSetViewMode,
    onNewNote,
    onChangeVault,
    onRefreshVault,
    onCycleTheme,
    onCloseTab,
    onCloseAllTabs,
    onOpenSettings,
    onExportHtml,
    onExportPdf,
  ]);
}
