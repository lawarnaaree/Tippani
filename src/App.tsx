import { useEffect, useState } from "react";
import { useVault } from "./stores/vault";
import { useTabs } from "./stores/tabs";
import { useSettings } from "./stores/settings";
import { useApplyThemeOnSystemChange } from "./hooks/useResolvedTheme";
import { FileTree } from "./components/Sidebar/FileTree";
import { MarkdownEditor } from "./components/Editor/MarkdownEditor";
import { AppShell } from "./components/Layout/AppShell";
import { TopBar } from "./components/Layout/TopBar";
import { TabBar } from "./components/Layout/TabBar";

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
  const activePath = useTabs((s) => {
    if (!s.activeTabId) return null;
    return s.tabs.find((t) => t.id === s.activeTabId)?.path ?? null;
  });

  // Settings
  const theme = useSettings((s) => s.theme);
  const cycleTheme = useSettings((s) => s.cycleTheme);

  // Bootstrap vault on mount
  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  // Mirror active tab → editor
  useEffect(() => {
    if (activePath === null) {
      void clearActive();
    } else {
      void openNote(activePath);
    }
  }, [activePath, openNote, clearActive]);

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

  // Global keyboard shortcut: Ctrl/Cmd+Shift+L cycles theme
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.shiftKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        cycleTheme();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cycleTheme]);

  return (
    <>
      <AppShell
        topBar={
          <TopBar
            vaultPath={vaultPath}
            saveState={saveState}
            theme={theme}
            onPickVault={() => void pickAndOpen()}
            onRefresh={() => void refresh()}
            onCycleTheme={cycleTheme}
          />
        }
        sidebar={<SidebarContent
          vaultPath={vaultPath}
          loading={loading}
          entries={entries}
          activePath={activePath}
          onSelect={(p) => openTab(p)}
          onCreateNote={createNote}
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
          ) : (
            <MarkdownEditor value={noteContent} onChange={updateNoteContent} />
          )
        }
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

type SidebarContentProps = {
  vaultPath: string | null;
  loading: boolean;
  entries: import("./lib/tauri").VaultEntry[];
  activePath: string | null;
  onSelect: (path: string) => void;
  onCreateNote: (path: string) => Promise<void>;
};

function SidebarContent({ vaultPath, loading, entries, activePath, onSelect, onCreateNote }: SidebarContentProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    await onCreateNote(newFileName.trim());
    setNewFileName("");
    setIsCreating(false);
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
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
                className="rounded bg-[var(--tippani-accent)] px-2 py-1 text-xs text-white hover:opacity-90"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
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
              onClick={() => setIsCreating(true)}
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
    </div>
  );
}
