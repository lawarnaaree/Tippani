import { useEffect, useMemo, useRef, useState } from "react";
import { searchVault, type SearchHit } from "../../lib/tauri";

const MIN_QUERY_LEN = 2;
const DEBOUNCE_MS = 200;
const RESULT_LIMIT = 200;

type Props = {
  vaultPath: string | null;
  onOpenHit: (path: string, line: number) => void;
};

type SearchState =
  | { kind: "idle" }
  | { kind: "loading"; query: string }
  | { kind: "results"; query: string; hits: SearchHit[]; truncated: boolean }
  | { kind: "error"; message: string };

export function SearchPanel({ vaultPath, onOpenHit }: Props) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>({ kind: "idle" });
  // Latest-wins guard: stale responses are ignored.
  const reqIdRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (!vaultPath || trimmed.length < MIN_QUERY_LEN) {
      setState({ kind: "idle" });
      return;
    }
    const myId = ++reqIdRef.current;
    setState({ kind: "loading", query: trimmed });
    const timer = setTimeout(async () => {
      try {
        const hits = await searchVault(vaultPath, trimmed, RESULT_LIMIT);
        if (reqIdRef.current !== myId) return;
        setState({
          kind: "results",
          query: trimmed,
          hits,
          truncated: hits.length >= RESULT_LIMIT,
        });
      } catch (e) {
        if (reqIdRef.current !== myId) return;
        setState({ kind: "error", message: String(e) });
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, vaultPath]);

  const grouped = useMemo(() => {
    if (state.kind !== "results") return [];
    const map = new Map<string, SearchHit[]>();
    for (const h of state.hits) {
      const arr = map.get(h.path) ?? [];
      arr.push(h);
      map.set(h.path, arr);
    }
    return Array.from(map.entries()).map(([path, hits]) => ({ path, hits }));
  }, [state]);

  const trimmedQuery = query.trim();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-[var(--tippani-border)] px-3 py-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search vault…"
          className="w-full rounded border border-[var(--tippani-border)] bg-[var(--tippani-bg)] px-2 py-1 text-xs outline-none focus:border-[var(--tippani-accent)]"
          disabled={!vaultPath}
          autoFocus
        />
      </div>
      <div className="flex-1 overflow-y-auto py-2 text-xs">
        {!vaultPath ? (
          <div className="px-3 py-2 text-[var(--tippani-muted)]">No vault open.</div>
        ) : trimmedQuery.length < MIN_QUERY_LEN ? (
          <div className="px-3 py-2 text-[var(--tippani-muted)]">
            Type at least {MIN_QUERY_LEN} characters.
          </div>
        ) : state.kind === "loading" ? (
          <div className="px-3 py-2 text-[var(--tippani-muted)]">Searching…</div>
        ) : state.kind === "error" ? (
          <div className="px-3 py-2 text-red-500">{state.message}</div>
        ) : state.kind === "results" && state.hits.length === 0 ? (
          <div className="px-3 py-2 text-[var(--tippani-muted)]">No matches.</div>
        ) : state.kind === "results" ? (
          <div className="flex flex-col gap-0.5">
            {state.truncated && (
              <div className="px-3 py-1 text-[var(--tippani-muted)]">
                Showing first {RESULT_LIMIT} matches.
              </div>
            )}
            {grouped.map((g) => (
              <FileGroup
                key={g.path}
                path={g.path}
                hits={g.hits}
                onOpenHit={onOpenHit}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

type FileGroupProps = {
  path: string;
  hits: SearchHit[];
  onOpenHit: (path: string, line: number) => void;
};

function FileGroup({ path, hits, onOpenHit }: FileGroupProps) {
  const [open, setOpen] = useState(true);
  const fileName = displayName(path);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1 px-2 py-1 text-left hover:bg-black/5 dark:hover:bg-white/5"
        title={path}
      >
        <span aria-hidden className="inline-block w-3 text-[var(--tippani-muted)]">
          {open ? "▾" : "▸"}
        </span>
        <span className="truncate font-medium">{fileName}</span>
        <span className="ml-auto text-[var(--tippani-muted)]">{hits.length}</span>
      </button>
      {open && (
        <ul>
          {hits.map((h, i) => (
            <li key={`${h.line}-${i}`}>
              <button
                type="button"
                onClick={() => onOpenHit(h.path, h.line)}
                className="flex w-full items-start gap-2 px-4 py-1 text-left hover:bg-black/5 dark:hover:bg-white/5"
              >
                <span className="shrink-0 text-[var(--tippani-muted)] tabular-nums">
                  {h.line}
                </span>
                <PreviewSnippet hit={h} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PreviewSnippet({ hit }: { hit: SearchHit }) {
  const start = Math.max(0, Math.min(hit.matchStart, hit.preview.length));
  const end = Math.max(start, Math.min(hit.matchEnd, hit.preview.length));
  const before = hit.preview.slice(0, start);
  const match = hit.preview.slice(start, end);
  const after = hit.preview.slice(end);
  return (
    <span className="truncate">
      <span className="text-[var(--tippani-muted)]">{before}</span>
      <span className="bg-amber-300/40 dark:bg-amber-400/30 text-[var(--tippani-fg)]">
        {match}
      </span>
      <span className="text-[var(--tippani-muted)]">{after}</span>
    </span>
  );
}

function displayName(path: string): string {
  const last = path.split(/[/\\]/).pop() ?? path;
  return last.replace(/\.md$/i, "");
}
