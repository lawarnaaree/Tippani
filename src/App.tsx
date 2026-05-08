import { useEffect } from "react";
import { useVault, type SaveState } from "./stores/vault";
import { FileTree } from "./components/Sidebar/FileTree";
import { MarkdownEditor } from "./components/Editor/MarkdownEditor";

export default function App() {
  const vaultPath = useVault((s) => s.vaultPath);
  const entries = useVault((s) => s.entries);
  const activeNotePath = useVault((s) => s.activeNotePath);
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

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const handler = () => {
      void flushPendingSave();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [flushPendingSave]);

  return (
    <div className="flex h-full flex-col bg-[var(--tippani-bg)] text-[var(--tippani-fg)]">
      <TopBar
        vaultPath={vaultPath}
        saveState={saveState}
        onPick={() => void pickAndOpen()}
        onRefresh={() => void refresh()}
      />
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-64 shrink-0 flex-col overflow-hidden border-r border-[var(--tippani-border)] bg-[var(--tippani-sidebar)]">
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
                activePath={activeNotePath}
                onSelect={(p) => void openNote(p)}
              />
            )}
          </div>
        </aside>
        <main className="flex min-w-0 flex-1">
          {vaultPath === null ? (
            <EmptyState onPick={() => void pickAndOpen()} />
          ) : activeNotePath === null ? (
            <NoNoteSelected />
          ) : (
            <MarkdownEditor
              value={noteContent}
              onChange={updateNoteContent}
            />
          )}
        </main>
      </div>
      {error && <ErrorBanner text={error} />}
    </div>
  );
}

function TopBar({
  vaultPath,
  saveState,
  onPick,
  onRefresh,
}: {
  vaultPath: string | null;
  saveState: SaveState;
  onPick: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className="flex h-10 shrink-0 items-center justify-between border-b border-[var(--tippani-border)] px-3 text-sm">
      <div className="flex items-center gap-3 truncate">
        <span className="font-semibold tracking-tight">Tippani</span>
        {vaultPath && (
          <span
            className="truncate text-xs text-[var(--tippani-muted)]"
            title={vaultPath}
          >
            {vaultPath}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <SaveIndicator state={saveState} />
        {vaultPath && (
          <button
            type="button"
            onClick={onRefresh}
            className="rounded px-2 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/10"
          >
            Refresh
          </button>
        )}
        <button
          type="button"
          onClick={onPick}
          className="rounded border border-[var(--tippani-border)] px-2 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/10"
        >
          {vaultPath ? "Change vault" : "Pick a vault"}
        </button>
      </div>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  const label =
    state === "pending"
      ? "Unsaved…"
      : state === "saving"
        ? "Saving…"
        : state === "error"
          ? "Save failed"
          : "Saved";
  const color =
    state === "error"
      ? "text-red-500"
      : state === "idle"
        ? "text-[var(--tippani-muted)]"
        : "text-amber-500";
  return (
    <span aria-live="polite" className={`text-xs ${color}`}>
      {label}
    </span>
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
        className="rounded border border-[var(--tippani-border)] px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/10"
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
      className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400"
    >
      {text}
    </div>
  );
}
