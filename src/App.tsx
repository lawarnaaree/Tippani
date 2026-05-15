import { useCallback, useEffect, useState, Suspense, lazy, useMemo } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import {
  noteRead,
  noteWrite,
  onNoteUpdated,
  onVaultChanged,
  vaultWatch,
} from "./lib/tauri";
import { useVault } from "./stores/vault";
import { useTabs, type ViewMode } from "./stores/tabs";
import { useSettings } from "./stores/settings";
import { useCards } from "./stores/cards";
import { useApplyThemeOnSystemChange } from "./hooks/useResolvedTheme";
import { useGlobalShortcuts } from "./hooks/useGlobalShortcuts";
import { useCommands } from "./lib/commands";
import { flattenEntries } from "./lib/commands";
import { FileTree } from "./components/Sidebar/FileTree";
import { SearchPanel } from "./components/Sidebar/SearchPanel";
import { OutlinePanel } from "./components/Sidebar/OutlinePanel";
import { BacklinksPanel } from "./components/Sidebar/BacklinksPanel";
import { TagsPanel } from "./components/Sidebar/TagsPanel";
import { MarkdownEditor } from "./components/Editor/MarkdownEditor";
import { AppShell } from "./components/Layout/AppShell";
import { TopBar } from "./components/Layout/TopBar";
import { TabBar } from "./components/Layout/TabBar";
import { Palette } from "./components/CommandPalette/Palette";
import { PreviewPane } from "./components/Editor/PreviewPane";
import { SettingsModal } from "./components/Settings/SettingsModal";
import { SymbolPalette } from "./components/SymbolPalette/SymbolPalette";
import { ReviewModal } from "./components/Flashcards/ReviewModal";
import { TemplatePicker } from "./components/Templates/TemplatePicker";
import { exportHtml, exportPdf } from "./lib/export";
import { noteStem } from "./lib/markdown";
import { insertAtCursor, wrapSelection } from "./stores/activeEditor";
import { BUILT_IN_TEMPLATES, applyTemplateTitle } from "./lib/templates";

const CanvasEditor = lazy(() => import("./components/Canvas/CanvasEditor"));

export default function App() {
  // Vault
  const vaultPath = useVault((s) => s.vaultPath);
  const entries = useVault((s) => s.entries);
  const noteContent = useVault((s) => s.noteContent);
  const loading = useVault((s) => s.loading);
  const saveState = useVault((s) => s.saveState);
  const error = useVault((s) => s.error);
  const bootstrap = useVault((s) => s.bootstrap);
  const pickAndOpen = useVault((s) => s.pickAndOpen);
  const reconnect = useVault((s) => s.reconnect);
  const pendingReconnect = useVault((s) => s.pendingReconnect);
  const refresh = useVault((s) => s.refresh);
  const openNote = useVault((s) => s.openNote);
  const updateNoteContent = useVault((s) => s.updateNoteContent);
  const flushPendingSave = useVault((s) => s.flushPendingSave);
  const clearActive = useVault((s) => s.clearActive);
  const createNote = useVault((s) => s.createNote);
  const createNoteFromTemplate = useVault((s) => s.createNoteFromTemplate);
  const tagIndex = useVault((s) => s.tagIndex);
  const tagFilter = useVault((s) => s.tagFilter);
  const setTagFilter = useVault((s) => s.setTagFilter);

  // Tabs
  const tabs = useTabs((s) => s.tabs);
  const activeTabId = useTabs((s) => s.activeTabId);
  const openTab = useTabs((s) => s.openTab);
  const closeTab = useTabs((s) => s.closeTab);
  const setActiveTab = useTabs((s) => s.setActive);
  const setViewMode = useTabs((s) => s.setViewMode);
  const closeAllTabs = useTabs((s) => s.closeAll);
  
  const activeTabInfo = useTabs((s) => {
    if (!s.activeTabId) return null;
    return s.tabs.find((t) => t.id === s.activeTabId) ?? null;
  });
  const activePath = activeTabInfo?.path ?? null;
  const activeViewMode = activeTabInfo?.viewMode ?? null;

  // Settings
  const theme = useSettings((s) => s.theme);
  const cycleTheme = useSettings((s) => s.cycleTheme);

  // Flashcard review
  const dueCount = useCards((s) => s.getDueCount());

  // Command palette state
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sidebarCreating, setSidebarCreating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [symbolPaletteOpen, setSymbolPaletteOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string, ms = 2200) => {
    setToast(msg);
    window.setTimeout(() => {
      setToast((cur) => (cur === msg ? null : cur));
    }, ms);
  }, []);

  const handleInsertSymbol = useCallback(
    (char: string) => {
      // Document/Both: route to the active CodeMirror editor.
      if (activeViewMode !== "canvas") {
        const ok = insertAtCursor(char);
        if (ok) return;
      }
      // Canvas (or no editor focused): copy to clipboard. Excalidraw's text
      // overlay accepts paste, so this is a one-keystroke completion.
      void navigator.clipboard
        .writeText(char)
        .then(() =>
          showToast(
            activeViewMode === "canvas"
              ? `${char} copied — paste with Ctrl+V into a text element.`
              : `${char} copied to clipboard.`,
          ),
        )
        .catch(() => showToast("Could not copy symbol to clipboard."));
    },
    [activeViewMode, showToast],
  );

  const handleApplyColor = useCallback(
    (color: string) => {
      // Color is either a named token (red, blue, …) or a hex string.
      const ok = wrapSelection(`==${color}:`, `==`);
      if (!ok) {
        showToast("Open a markdown editor to apply a color.");
      }
    },
    [showToast],
  );

  // Bootstrap vault on mount
  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  // Mirror active tab → editor
  useEffect(() => {
    // Only open the note for markdown tabs to load the text content.
    // Canvas handles its own file loading.
    if (activePath === null) {
      void clearActive();
    } else if (activeViewMode === "document" || activeViewMode === "both") {
      void openNote(activePath);
    }
  }, [activePath, activeViewMode, openNote, clearActive]);

  // Re-apply theme when OS preference changes (only matters for "system" mode)
  useApplyThemeOnSystemChange();

  // Flush pending save on unload
  useEffect(() => {
    const handler = () => {
      void flushPendingSave();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [flushPendingSave]);

  // File watcher: re-point to the active vault, refresh tree on tree changes,
  // sync open note on external content updates (skipped if local edits are pending).
  useEffect(() => {
    if (!vaultPath) return;
    let unlistenChanged: (() => void) | null = null;
    let unlistenUpdated: (() => void) | null = null;
    let cancelled = false;

    void (async () => {
      try {
        await vaultWatch(vaultPath);
      } catch (e) {
        console.error("vault_watch failed", e);
        return;
      }
      if (cancelled) return;
      unlistenChanged = await onVaultChanged(() => {
        void useVault.getState().refresh();
      });
      unlistenUpdated = await onNoteUpdated(async ({ path }) => {
        if (useVault.getState().activeNotePath !== path) return;
        try {
          const content = await noteRead(path);
          useVault.getState().syncNoteContent(path, content);
        } catch (e) {
          console.error("syncNoteContent read failed", e);
        }
      });
      if (cancelled) {
        unlistenChanged?.();
        unlistenUpdated?.();
      }
    })();

    return () => {
      cancelled = true;
      unlistenChanged?.();
      unlistenUpdated?.();
    };
  }, [vaultPath]);

  // --- Palette helpers -------------------------------------------------------

  const handleCloseActiveTab = useCallback(() => {
    if (activeTabId) closeTab(activeTabId);
  }, [activeTabId, closeTab]);

  const handleNewNote = useCallback(() => {
    setPaletteOpen(false);
    setSidebarCreating(true);
  }, []);

  const handleOpenNote = useCallback(
    (path: string) => {
      openTab(path);
    },
    [openTab],
  );

  const handleOpenSettings = useCallback(() => {
    setPaletteOpen(false);
    setSettingsOpen(true);
  }, []);

  const handleExportHtml = useCallback(() => {
    if (!activePath) return;
    void exportHtml(noteStem(activePath), noteContent);
  }, [activePath, noteContent]);

  const handleExportPdf = useCallback(() => {
    if (!activePath) return;
    exportPdf(noteStem(activePath), noteContent);
  }, [activePath, noteContent]);

  const handleWikilinkClick = useCallback(
    (noteName: string) => {
      const allEntries = flattenEntries(entries);
      const match = allEntries.find(
        (e) => e.name.replace(/\.md$/i, "").toLowerCase() === noteName.toLowerCase(),
      );
      if (match) {
        openTab(match.path);
      } else {
        showToast(`Note "${noteName}" not found in vault.`);
      }
    },
    [entries, openTab, showToast],
  );

  const handleTagClick = useCallback(
    (tag: string) => {
      setTagFilter(tag);
    },
    [setTagFilter],
  );

  const handleNewNoteFromTemplate = useCallback(() => {
    setPaletteOpen(false);
    setTemplatePickerOpen(true);
  }, []);

  const handleTemplateSelect = useCallback(
    async (templateContent: string | null, newName: string) => {
      await createNoteFromTemplate(templateContent, newName);
    },
    [createNoteFromTemplate],
  );

  const handleCreateBuiltInTemplates = useCallback(async () => {
    if (!vaultPath) return;
    for (const t of BUILT_IN_TEMPLATES) {
      const path = `${vaultPath}/_templates/${t.filename}`;
      try {
        await noteWrite(path, applyTemplateTitle(t.content, t.name));
      } catch {
        // ignore if already exists
      }
    }
    await refresh();
    showToast("Built-in templates created in _templates/");
  }, [vaultPath, refresh, showToast]);

  const commands = useCommands({
    entries,
    activePath,
    onOpenNote: handleOpenNote,
    onSetViewMode: (mode: ViewMode) => {
      if (activePath) setViewMode(activePath, mode);
    },
    onNewNote: handleNewNote,
    onChangeVault: () => void pickAndOpen(),
    onRefreshVault: () => void refresh(),
    onCycleTheme: cycleTheme,
    onCloseTab: handleCloseActiveTab,
    onCloseAllTabs: closeAllTabs,
    onOpenSettings: handleOpenSettings,
    onExportHtml: handleExportHtml,
    onExportPdf: handleExportPdf,
    onNewNoteFromTemplate: handleNewNoteFromTemplate,
  });

  // Global keyboard shortcuts (⌘K, ⌘P, ⌘N, ⌘Shift+L, ⌘Shift+S)
  useGlobalShortcuts({
    onTogglePalette: useCallback(() => setPaletteOpen((v) => !v), []),
    onCycleTheme: cycleTheme,
    onNewNote: handleNewNote,
    onToggleSymbols: useCallback(() => setSymbolPaletteOpen((v) => !v), []),
  });

  return (
    <>
      <AppShell
        topBar={
          <TopBar
            vaultPath={vaultPath}
            saveState={saveState}
            theme={theme}
            activeViewMode={activeViewMode}
            hasActiveNote={activePath !== null}
            onPickVault={() => void pickAndOpen()}
            onRefresh={() => void refresh()}
            onCycleTheme={cycleTheme}
            onSetViewMode={(mode: ViewMode) => {
              if (activePath) setViewMode(activePath, mode);
            }}
            onOpenSettings={handleOpenSettings}
            onOpenSymbols={() => setSymbolPaletteOpen(true)}
            onApplyColor={handleApplyColor}
            onExportHtml={handleExportHtml}
            onExportPdf={handleExportPdf}
          />
        }
        sidebar={<SidebarContent
          vaultPath={vaultPath}
          loading={loading}
          entries={entries}
          activePath={activePath}
          noteContent={noteContent}
          tagIndex={tagIndex}
          tagFilter={tagFilter}
          onSelect={(p) => openTab(p)}
          onCreateNote={createNote}
          isCreating={sidebarCreating}
          onCreatingChange={setSidebarCreating}
          onOpenHit={(p) => openTab(p)}
          onSelectTag={(tag) => { setTagFilter(tag); }}
          onOpenNote={(p) => openTab(p)}
          dueCount={dueCount}
          onStartReview={() => setReviewOpen(true)}
        />}
        tabBar={
          <TabBar
            tabs={tabs}
            activeId={activeTabId}
            onSelect={setActiveTab}
            onClose={closeTab}
          />
        }
        main={
          vaultPath === null ? (
            <EmptyState
              onPick={() => void pickAndOpen()}
              reconnectName={pendingReconnect}
              onReconnect={() => void reconnect()}
            />
          ) : activePath === null ? (
            <NoNoteSelected />
          ) : activeViewMode === "both" ? (
            <Group orientation="horizontal" className="flex h-full w-full">
              <Panel
                defaultSize={50}
                minSize={20}
                className="flex flex-col relative bg-[var(--tippani-bg)] min-h-0 min-w-0"
              >
                <MarkdownEditor value={noteContent} onChange={updateNoteContent} />
              </Panel>
              <Separator className="tippani-resize-handle" />
              <Panel
                defaultSize={50}
                minSize={20}
                className="flex flex-col relative bg-[var(--tippani-bg)] min-h-0 min-w-0"
              >
                <PreviewPane path={activePath} content={noteContent} onWikilinkClick={handleWikilinkClick} onTagClick={handleTagClick} />
              </Panel>
            </Group>
          ) : activeViewMode === "canvas" ? (
            <Suspense fallback={<div className="flex h-full w-full items-center justify-center text-[var(--tippani-muted)]">Loading Excalidraw...</div>}>
              <CanvasEditor
                key={activePath}
                path={activePath}
                onOpenMenu={() => setPaletteOpen(true)}
                onOpenSymbols={() => setSymbolPaletteOpen(true)}
              />
            </Suspense>
          ) : (
            <MarkdownEditor value={noteContent} onChange={updateNoteContent} />
          )
        }
      />
      <Palette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        commands={commands}
      />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        vaultPath={vaultPath}
        onChangeVault={() => void pickAndOpen()}
      />
      <SymbolPalette
        open={symbolPaletteOpen}
        onClose={() => setSymbolPaletteOpen(false)}
        onInsert={handleInsertSymbol}
      />
      <ReviewModal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        entries={entries}
        vaultPath={vaultPath}
      />
      <TemplatePicker
        open={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
        entries={entries}
        vaultPath={vaultPath}
        onSelect={handleTemplateSelect}
        onCreateBuiltIns={() => { void handleCreateBuiltInTemplates(); }}
      />
      {toast && <Toast text={toast} />}
      {error && <ErrorBanner text={error} />}
    </>
  );
}

function Toast({ text }: { text: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded border border-[var(--tippani-border)] bg-[var(--tippani-bg)] px-3 py-2 text-xs shadow-md"
    >
      {text}
    </div>
  );
}

function EmptyState({
  onPick,
  reconnectName,
  onReconnect,
}: {
  onPick: () => void;
  reconnectName: string | null;
  onReconnect: () => void;
}) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-center">
      <h2 className="text-lg font-medium">Welcome to Tippani</h2>
      <p className="max-w-sm text-sm text-[var(--tippani-muted)]">
        Pick a folder on your machine to use as a vault. Tippani stores notes
        as plain <code>.md</code> files — no lock-in.
      </p>
      {reconnectName && (
        <button
          type="button"
          onClick={onReconnect}
          className="rounded border border-[var(--tippani-border)] bg-[var(--tippani-hover)] px-3 py-1.5 text-sm hover:opacity-90"
        >
          Reconnect to "{reconnectName}"
        </button>
      )}
      <button
        type="button"
        onClick={onPick}
        className="rounded border border-[var(--tippani-border)] px-3 py-1.5 text-sm hover:bg-[var(--tippani-hover)]"
      >
        Pick a vault
      </button>
    </div>
  );
}

function NoNoteSelected() {
  return (
    <div className="flex h-full w-full items-center justify-center text-sm text-[var(--tippani-muted)]">
      Select a note from the sidebar to begin.
    </div>
  );
}

function ErrorBanner({ text }: { text: string }) {
  return (
    <div
      role="alert"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400"
    >
      {text}
    </div>
  );
}

type SidebarTab = "files" | "search" | "outline" | "backlinks" | "tags";

type SidebarContentProps = {
  vaultPath: string | null;
  loading: boolean;
  entries: import("./lib/tauri").VaultEntry[];
  activePath: string | null;
  noteContent: string;
  tagIndex: import("./lib/tags").TagIndex;
  tagFilter: string | null;
  onSelect: (path: string) => void;
  onCreateNote: (path: string) => Promise<void>;
  isCreating: boolean;
  onCreatingChange: (v: boolean) => void;
  onOpenHit: (path: string, line: number) => void;
  onSelectTag: (tag: string | null) => void;
  onOpenNote: (path: string) => void;
  dueCount: number;
  onStartReview: () => void;
};

function SidebarContent({
  vaultPath,
  loading,
  entries,
  activePath,
  noteContent,
  tagIndex,
  tagFilter,
  onSelect,
  onCreateNote,
  isCreating,
  onCreatingChange,
  onOpenHit,
  onSelectTag,
  onOpenNote,
  dueCount,
  onStartReview,
}: SidebarContentProps) {
  const [newFileName, setNewFileName] = useState("");
  const [tab, setTab] = useState<SidebarTab>("files");

  // Compute filtered entries for tag filter
  const displayEntries = useMemo(() => {
    if (!tagFilter || !tagIndex[tagFilter]) return entries;
    const taggedPaths = new Set(tagIndex[tagFilter]);
    function filterEntries(ents: import("./lib/tauri").VaultEntry[]): import("./lib/tauri").VaultEntry[] {
      const result: import("./lib/tauri").VaultEntry[] = [];
      for (const e of ents) {
        if (e.kind === "file" && taggedPaths.has(e.path)) {
          result.push(e);
        } else if (e.kind === "folder" && e.children) {
          const filtered = filterEntries(e.children);
          if (filtered.length > 0) result.push({ ...e, children: filtered });
        }
      }
      return result;
    }
    return filterEntries(entries);
  }, [entries, tagFilter, tagIndex]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    await onCreateNote(newFileName.trim());
    setNewFileName("");
    onCreatingChange(false);
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {vaultPath !== null && (
        <div className="shrink-0 flex flex-wrap border-b border-[var(--tippani-border)] text-xs">
          <SidebarTabButton active={tab === "files"} onClick={() => setTab("files")}>
            Files
          </SidebarTabButton>
          <SidebarTabButton active={tab === "search"} onClick={() => setTab("search")}>
            Search
          </SidebarTabButton>
          <SidebarTabButton active={tab === "outline"} onClick={() => setTab("outline")}>
            Outline
          </SidebarTabButton>
          <SidebarTabButton active={tab === "backlinks"} onClick={() => setTab("backlinks")}>
            Links
          </SidebarTabButton>
          <SidebarTabButton active={tab === "tags"} onClick={() => setTab("tags")}>
            Tags
          </SidebarTabButton>
        </div>
      )}

      {tab === "files" && (
        <>
          {vaultPath !== null && !loading && (
            <div className="shrink-0 border-b border-[var(--tippani-border)] px-3 py-2">
              {isCreating ? (
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder="filename.md"
                    className="flex-1 rounded border border-[var(--tippani-border)] bg-[var(--tippani-bg)] px-2 py-1 text-xs outline-none focus:border-[var(--tippani-accent)]"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="rounded bg-[var(--tippani-accent)] px-2 py-1 text-xs text-[var(--tippani-bg)] hover:opacity-90"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onCreatingChange(false);
                      setNewFileName("");
                    }}
                    className="rounded border border-[var(--tippani-border)] px-2 py-1 text-xs hover:bg-[var(--tippani-hover)]"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => onCreatingChange(true)}
                  className="flex w-full items-center justify-center gap-1 rounded border border-[var(--tippani-border)] px-3 py-1.5 text-xs hover:bg-[var(--tippani-hover)]"
                >
                  <span>+</span>
                  <span>New File</span>
                </button>
              )}
            </div>
          )}
          {tagFilter && (
            <div className="shrink-0 px-3 py-1 flex items-center gap-2 text-xs border-b border-[var(--tippani-border)]">
              <span style={{ color: "var(--tippani-muted)" }}>Filtered: #{tagFilter}</span>
              <button
                onClick={() => onSelectTag(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tippani-muted)", fontSize: 12 }}
              >
                ✕
              </button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto py-2">
            {vaultPath === null ? (
              <div className="px-3 py-2 text-xs text-[var(--tippani-muted)]">No vault open.</div>
            ) : loading ? (
              <div className="px-3 py-2 text-xs text-[var(--tippani-muted)]">Loading…</div>
            ) : (
              <FileTree entries={displayEntries} activePath={activePath} onSelect={onSelect} />
            )}
          </div>
          {dueCount > 0 && (
            <div className="shrink-0 border-t border-[var(--tippani-border)] px-3 py-2">
              <button
                onClick={onStartReview}
                className="flex w-full items-center justify-center gap-1.5 rounded border border-[var(--tippani-border)] px-3 py-1.5 text-xs hover:bg-[var(--tippani-hover)]"
              >
                <span>📚</span>
                <span>Review ({dueCount} due)</span>
              </button>
            </div>
          )}
        </>
      )}

      {tab === "search" && (
        <SearchPanel vaultPath={vaultPath} onOpenHit={onOpenHit} />
      )}

      {tab === "outline" && (
        <OutlinePanel content={noteContent} />
      )}

      {tab === "backlinks" && (
        <BacklinksPanel
          activePath={activePath}
          entries={entries}
          onOpenNote={onOpenNote}
        />
      )}

      {tab === "tags" && (
        <TagsPanel
          tagIndex={tagIndex}
          activeFilter={tagFilter}
          onSelectTag={(tag) => {
            onSelectTag(tag);
            setTab("files");
          }}
        />
      )}
    </div>
  );
}

function SidebarTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-2 py-2 ${active ? "bg-[var(--tippani-hover)] font-medium" : "text-[var(--tippani-muted)] hover:bg-[var(--tippani-hover)]"}`}
    >
      {children}
    </button>
  );
}
