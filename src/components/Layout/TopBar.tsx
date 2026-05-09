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
  onOpenSymbols: () => void;
  onApplyColor: (color: string) => void;
  onExportHtml: () => void;
  onExportPdf: () => void;
};

const COLOR_BUTTON_OPTIONS: { name: string; cls: string }[] = [
  { name: "red", cls: "tippani-color-red" },
  { name: "orange", cls: "tippani-color-orange" },
  { name: "yellow", cls: "tippani-color-yellow" },
  { name: "green", cls: "tippani-color-green" },
  { name: "blue", cls: "tippani-color-blue" },
  { name: "purple", cls: "tippani-color-purple" },
  { name: "pink", cls: "tippani-color-pink" },
  { name: "gray", cls: "tippani-color-gray" },
];

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
  onOpenSymbols,
  onApplyColor,
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
        <SymbolButton onClick={onOpenSymbols} />
        <ColorButton onApply={onApplyColor} />
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

function SymbolButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Insert symbol (Ctrl/Cmd+Shift+S)"
      aria-label="Insert symbol"
      className="rounded border border-[var(--tippani-border)] px-2 py-1 text-xs hover:bg-[var(--tippani-hover)]"
      style={{ fontFamily: "serif", fontStyle: "italic" }}
    >
      π
    </button>
  );
}

function ColorButton({ onApply }: { onApply: (color: string) => void }) {
  return (
    <div className="relative group">
      <button
        type="button"
        title="Color text — wraps the current selection"
        aria-label="Color text"
        className="rounded border border-[var(--tippani-border)] px-2 py-1 text-xs hover:bg-[var(--tippani-hover)]"
      >
        <span style={{ fontWeight: 600 }}>A</span>
        <span aria-hidden style={{ marginLeft: 2 }}>▾</span>
      </button>
      <div className="absolute right-0 top-full z-20 mt-1 hidden w-44 flex-col rounded border border-[var(--tippani-border)] bg-[var(--tippani-bg)] py-1 text-xs shadow-md group-hover:flex group-focus-within:flex">
        {COLOR_BUTTON_OPTIONS.map((c) => (
          <button
            key={c.name}
            type="button"
            onClick={() => onApply(c.name)}
            className={`flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[var(--tippani-hover)] ${c.cls}`}
          >
            <span
              aria-hidden
              className={c.cls}
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                borderRadius: 2,
                background: "currentColor",
              }}
            />
            <span style={{ color: "var(--tippani-fg)" }}>{c.name}</span>
          </button>
        ))}
        <label className="flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[var(--tippani-hover)]">
          <span
            aria-hidden
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              borderRadius: 2,
              border: "1px solid var(--tippani-border)",
            }}
          />
          <span>Custom…</span>
          <input
            type="color"
            onChange={(e) => onApply(e.target.value)}
            className="ml-auto h-5 w-6 cursor-pointer border-0 bg-transparent p-0"
          />
        </label>
      </div>
    </div>
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
