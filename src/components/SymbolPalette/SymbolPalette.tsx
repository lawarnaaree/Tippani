import { useEffect, useMemo, useRef, useState } from "react";
import {
  CATEGORY_LABELS,
  SYMBOLS,
  type Symbol,
  type SymbolCategory,
  searchSymbols,
} from "../../lib/symbols";

type Props = {
  open: boolean;
  onClose: () => void;
  onInsert: (char: string) => void;
};

const CATEGORIES: SymbolCategory[] = [
  "greek",
  "operators",
  "sets",
  "logic",
  "arrows",
  "misc",
];

export function SymbolPalette({ open, onClose, onInsert }: Props) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] =
    useState<SymbolCategory | "all">("all");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveCategory("all");
    // Defer focus until the dialog is mounted.
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const visible: Symbol[] = useMemo(() => {
    const base = query.trim() ? searchSymbols(query) : [...SYMBOLS];
    if (activeCategory === "all") return base;
    return base.filter((s) => s.category === activeCategory);
  }, [query, activeCategory]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Symbol palette"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-24"
      onMouseDown={(e) => {
        // Click on backdrop closes; clicks inside the dialog (which stops
        // propagation below) do not.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-xl rounded-lg border border-[var(--tippani-border)] bg-[var(--tippani-bg)] shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[var(--tippani-border)] p-3">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search symbols (e.g. theta, sum, in)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && visible.length > 0) {
                e.preventDefault();
                onInsert(visible[0].char);
                onClose();
              }
            }}
            className="w-full rounded border border-[var(--tippani-border)] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[var(--tippani-accent)]"
          />
        </div>

        <div className="flex flex-wrap gap-1 border-b border-[var(--tippani-border)] px-3 py-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            className={`rounded px-2 py-1 ${
              activeCategory === "all"
                ? "bg-[var(--tippani-accent)] text-[var(--tippani-bg)]"
                : "hover:bg-[var(--tippani-hover)]"
            }`}
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setActiveCategory(c)}
              className={`rounded px-2 py-1 ${
                activeCategory === c
                  ? "bg-[var(--tippani-accent)] text-[var(--tippani-bg)]"
                  : "hover:bg-[var(--tippani-hover)]"
              }`}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>

        <div className="max-h-80 overflow-y-auto p-3">
          {visible.length === 0 ? (
            <div className="px-2 py-6 text-center text-sm text-[var(--tippani-muted)]">
              No symbols match "{query}".
            </div>
          ) : (
            <div
              className="grid gap-1"
              style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))",
              }}
            >
              {visible.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => {
                    onInsert(s.char);
                    onClose();
                  }}
                  title={`\\${s.name}`}
                  className="flex flex-col items-center justify-center gap-0.5 rounded border border-[var(--tippani-border)] bg-[var(--tippani-bg)] px-2 py-2 hover:bg-[var(--tippani-hover)]"
                >
                  <span className="text-xl leading-none">{s.char}</span>
                  <span className="text-[10px] text-[var(--tippani-muted)]">
                    \{s.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--tippani-border)] px-3 py-2 text-[11px] text-[var(--tippani-muted)]">
          <span>
            Tip: type <kbd>\theta</kbd> in the editor and press space to
            auto-replace.
          </span>
          <span>
            <kbd>Enter</kbd> insert top match · <kbd>Esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}

export default SymbolPalette;
