import { useState, useEffect } from "react";
import type { VaultEntry } from "../../lib/tauri";
import { buildBacklinks, getBacklinksForPath } from "../../lib/backlinks";

type Props = {
  activePath: string | null;
  entries: VaultEntry[];
  onOpenNote: (path: string) => void;
};

function noteName(path: string): string {
  return path.split(/[/\\]/).pop()!.replace(/\.md$/i, "");
}

export function BacklinksPanel({ activePath, entries, onOpenNote }: Props) {
  const [backlinks, setBacklinks] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activePath) {
      setBacklinks([]);
      return;
    }
    setLoading(true);
    buildBacklinks(entries)
      .then((map) => {
        setBacklinks(getBacklinksForPath(map, activePath));
      })
      .finally(() => setLoading(false));
  }, [activePath, entries]);

  if (!activePath) {
    return (
      <div className="px-3 py-4 text-xs" style={{ color: "var(--tippani-muted)" }}>
        Open a note to see its backlinks.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="px-3 py-4 text-xs" style={{ color: "var(--tippani-muted)" }}>
        Scanning backlinks…
      </div>
    );
  }

  if (backlinks.length === 0) {
    return (
      <div className="px-3 py-4 text-xs" style={{ color: "var(--tippani-muted)" }}>
        No notes link to this note.
      </div>
    );
  }

  return (
    <div className="py-1 overflow-y-auto flex-1">
      <div className="px-3 py-1 text-xs" style={{ color: "var(--tippani-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        Linked from ({backlinks.length})
      </div>
      {backlinks.map((path) => (
        <button
          key={path}
          className="tippani-outline-item"
          onClick={() => onOpenNote(path)}
          title={path}
        >
          {noteName(path)}
        </button>
      ))}
    </div>
  );
}
