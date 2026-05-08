import { useCallback, useEffect, useState, Suspense, lazy } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import {
  noteRead,
  onNoteUpdated,
  onVaultChanged,
  vaultWatch,
} from "./lib/tauri";
import { useVault } from "./stores/vault";
import { useTabs, type ViewMode } from "./stores/tabs";
import { useSettings } from "./stores/settings";
import { useApplyThemeOnSystemChange } from "./hooks/useResolvedTheme";
import { useGlobalShortcuts } from "./hooks/useGlobalShortcuts";
import { useCommands } from "./lib/commands";
import { FileTree } from "./components/Sidebar/FileTree";
import { SearchPanel } from "./components/Sidebar/SearchPanel";
import { MarkdownEditor } from "./components/Editor/MarkdownEditor";
import { AppShell } from "./components/Layout/AppShell";
import { TopBar } from "./components/Layout/TopBar";
import { TabBar } from "./components/Layout/TabBar";
import { Palette } from "./components/CommandPalette/Palette";
import { PreviewPane } from "./components/Editor/PreviewPane";
import { SettingsModal } from "./components/Settings/SettingsModal";
import { exportHtml, exportPdf } from "./lib/export";
import { noteStem } from "./lib/markdown";

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
  const refresh = useVault((s) => s.refresh);
  const openNote = useVault((s) => s.openNote);
  const updateNoteContent = useVault((s) => s.updateNoteContent);
  const flushPendingSave = useVault((s) => s.flushPendingSave);
  const clearActive = useVault((s) => s.clearActive);
  const createNote = useVault((s) => s.createNote);

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

  // Command palette state
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sidebarCreating, setSidebarCreating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
  });

  // Global keyboard shortcuts (⌘K, ⌘P, ⌘N, ⌘Shift+L)
  useGlobalShortcuts({
    onTogglePalette: useCallback(() => setPaletteOpen((v) => !v), []),
    onCycleTheme: cycleTheme,
    onNewNote: handleNewNote,
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
            onExportHtml={handleExportHtml}
            onExportPdf={handleExportPdf}
          />
        }
        sidebar={<SidebarContent
          vaultPath={vaultPath}
          loading={loading}
          entries={entries}
          activePath={activePath}
          onSelect={(p) => openTab(p)}
          onCreateNote={createNote}
          isCreating={sidebarCreating}
          onCreatingChange={setSidebarCreating}
          onOpenHit={(p) => openTab(p)}
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
            <EmptyState onPick={() => void pickAndOpen()} />
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
                <PreviewPane path={activePath} content={noteContent} />
              </Panel>
            </Group>
          ) : activeViewMode === "canvas" ? (
            <Suspense fallback={<div className="flex h-full w-full items-center justify-center text-[var(--tippani-muted)]">Loading Excalidraw...</div>}>
              <CanvasEditor path={activePath} onOpenMenu={() => setPaletteOpen(true)} />
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
      {error && <ErrorBanner text={error} />}
    </>
  );
}

function EmptyState({ onPick }: { onPick: () => void }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-center">
      <h2 className="text-lg font-medium">Welcome to Tippani</h2>
      <p className="max-w-sm text-sm text-[var(--tippani-muted)]">
        Pick a folder on your machine to use as a vault. Tippani stores notes
        as plain <code>.md</code> files — no lock-in.
      </p>
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

type SidebarTab = "files" | "search";

type SidebarContentProps = {
  vaultPath: string | null;
  loading: boolean;
  entries: import("./lib/tauri").VaultEntry[];
  activePath: string | null;
  onSelect: (path: string) => void;
  onCreateNote: (path: string) => Promise<void>;
  isCreating: boolean;
  onCreatingChange: (v: boolean) => void;
  onOpenHit: (path: string, line: number) => void;
};

function SidebarContent({ vaultPath, loading, entries, activePath, onSelect, onCreateNote, isCreating, onCreatingChange, onOpenHit }: SidebarContentProps) {
  const [newFileName, setNewFileName] = useState("");
  const [tab, setTab] = useState<SidebarTab>("files");

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
        <div className="shrink-0 flex border-b border-[var(--tippani-border)] text-xs">
          <SidebarTabButton active={tab === "files"} onClick={() => setTab("files")}>
            Files
          </SidebarTabButton>
          <SidebarTabButton active={tab === "search"} onClick={() => setTab("search")}>
            Search
          </SidebarTabButton>
        </div>
      )}
      {tab === "files" ? (
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
          <div className="flex-1 overflow-y-auto py-2">
            {vaultPath === null ? (
              <div className="px-3 py-2 text-xs text-[var(--tippani-muted)]">
                No vault open.
              </div>
            ) : loading ? (
              <div className="px-3 py-2 text-xs text-[var(--tippani-muted)]">
                Loading…
              </div>
            ) : (
              <FileTree
                entries={entries}
                activePath={activePath}
                onSelect={onSelect}
              />
            )}
          </div>
        </>
      ) : (
        <SearchPanel vaultPath={vaultPath} onOpenHit={onOpenHit} />
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
      className={`flex-1 px-3 py-2 ${active ? "bg-[var(--tippani-hover)] font-medium" : "text-[var(--tippani-muted)] hover:bg-[var(--tippani-hover)]"}`}
    >
      {children}
    </button>
  );
}
