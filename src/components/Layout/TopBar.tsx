import type { SaveState } from "../../stores/vault";
import type { ThemeMode } from "../../stores/settings";
import type { ViewMode } from "../../stores/tabs";

type Props = {
  vaultPath: string | null;
  saveState: SaveState;
  theme: ThemeMode;
  activeViewMode: ViewMode | null;
  onPickVault: () => void;
  onRefresh: () => void;
  onCycleTheme: () => void;
  onSetViewMode: (mode: ViewMode) => void;
};

export function TopBar({
  vaultPath,
  saveState,
  theme,
  activeViewMode,
  onPickVault,
  onRefresh,
  onCycleTheme,
  onSetViewMode,
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
        <ThemeButton theme={theme} onClick={onCycleTheme} />
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
