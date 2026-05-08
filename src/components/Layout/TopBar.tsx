import type { SaveState } from "../../stores/vault";
import type { ThemeMode } from "../../stores/settings";
import type { ViewMode } from "../../stores/tabs";

type Props = {
  vaultPath: string | null;
  saveState: SaveState;
  theme: ThemeMode;
  activeViewMode: ViewMode | null;
  hasActiveNote: boolean;
  onPickVault: () => void;
  onRefresh: () => void;
  onCycleTheme: () => void;
  onSetViewMode: (mode: ViewMode) => void;
  onOpenSettings: () => void;
  onExportHtml: () => void;
  onExportPdf: () => void;
};

export function TopBar({
  vaultPath,
  saveState,
  theme,
  activeViewMode,
  hasActiveNote,
  onPickVault,
  onRefresh,
  onCycleTheme,
  onSetViewMode,
  onOpenSettings,
  onExportHtml,
  onExportPdf,
}: Props) {
  return (
    <div className="flex h-10 shrink-0 items-center justify-between border-b border-[var(--tippani-border)] px-3 text-sm">
      <div className="flex min-w-0 items-center gap-3">
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
      
      <div className="flex flex-1 justify-center mx-4">
        {activeViewMode && (
          <div className="flex items-center overflow-hidden rounded border border-[var(--tippani-border)] bg-[var(--tippani-bg)] text-xs">
            <button
              type="button"
              onClick={() => onSetViewMode("document")}
              title="Editor only"
              className={`px-3 py-1 ${activeViewMode === "document" ? "bg-[var(--tippani-accent)] text-[var(--tippani-bg)] font-medium" : "hover:bg-[var(--tippani-hover)]"}`}
            >
              Document
            </button>
            <button
              type="button"
              onClick={() => onSetViewMode("both")}
              title="Editor + live preview (Mermaid)"
              className={`px-3 py-1 border-l border-r border-[var(--tippani-border)] ${activeViewMode === "both" ? "bg-[var(--tippani-accent)] text-[var(--tippani-bg)] font-medium" : "hover:bg-[var(--tippani-hover)]"}`}
            >
              Both
            </button>
            <button
              type="button"
              onClick={() => onSetViewMode("canvas")}
              title="Excalidraw canvas only"
              className={`px-3 py-1 ${activeViewMode === "canvas" ? "bg-[var(--tippani-accent)] text-[var(--tippani-bg)] font-medium" : "hover:bg-[var(--tippani-hover)]"}`}
            >
              Canvas
            </button>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <SaveIndicator state={saveState} hidden={vaultPath === null} />
        <ExportMenu
          disabled={!hasActiveNote}
          onExportHtml={onExportHtml}
          onExportPdf={onExportPdf}
        />
        <ThemeButton theme={theme} onClick={onCycleTheme} />
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Settings"
          title="Settings"
          className="rounded border border-[var(--tippani-border)] px-2 py-1 text-xs hover:bg-[var(--tippani-hover)]"
        >
          ⚙
        </button>
        {vaultPath && (
          <button
            type="button"
            onClick={onRefresh}
            className="rounded px-2 py-1 text-xs hover:bg-[var(--tippani-hover)]"
          >
            Refresh
          </button>
        )}
        <button
          type="button"
          onClick={onPickVault}
          className="rounded border border-[var(--tippani-border)] px-2 py-1 text-xs hover:bg-[var(--tippani-hover)]"
        >
          {vaultPath ? "Change vault" : "Pick a vault"}
        </button>
      </div>
    </div>
  );
}

function ExportMenu({
  disabled,
  onExportHtml,
  onExportPdf,
}: {
  disabled: boolean;
  onExportHtml: () => void;
  onExportPdf: () => void;
}) {
  return (
    <div className="relative group">
      <button
        type="button"
        disabled={disabled}
        className="rounded border border-[var(--tippani-border)] px-2 py-1 text-xs hover:bg-[var(--tippani-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
        title={disabled ? "Open a note to export" : "Export note"}
      >
        Export ▾
      </button>
      {!disabled && (
        <div className="absolute right-0 top-full z-20 mt-1 hidden min-w-[140px] flex-col rounded border border-[var(--tippani-border)] bg-[var(--tippani-bg)] py-1 text-xs shadow-md group-hover:flex group-focus-within:flex">
          <button
            type="button"
            onClick={onExportHtml}
            className="px-3 py-1.5 text-left hover:bg-[var(--tippani-hover)]"
          >
            HTML
          </button>
          <button
            type="button"
            onClick={onExportPdf}
            className="px-3 py-1.5 text-left hover:bg-[var(--tippani-hover)]"
          >
            PDF
          </button>
        </div>
      )}
    </div>
  );
}

function SaveIndicator({
  state,
  hidden,
}: {
  state: SaveState;
  hidden: boolean;
}) {
  if (hidden) return null;
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

function ThemeButton({
  theme,
  onClick,
}: {
  theme: ThemeMode;
  onClick: () => void;
}) {
  const label =
    theme === "system" ? "Auto" : theme === "light" ? "Light" : "Dark";
  const glyph = theme === "system" ? "◐" : theme === "light" ? "☀" : "☾";
  return (
    <button
      type="button"
      onClick={onClick}
      title="Cycle theme (Ctrl/Cmd+Shift+L)"
      aria-label={`Theme: ${label} (click to cycle)`}
      className="flex items-center gap-1 rounded border border-[var(--tippani-border)] px-2 py-1 text-xs hover:bg-[var(--tippani-hover)]"
    >
      <span aria-hidden>{glyph}</span>
      <span>{label}</span>
    </button>
  );
}
