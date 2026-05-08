import { useState } from "react";
import { type VaultEntry } from "../../lib/tauri";

type Props = {
  entries: VaultEntry[];
  activePath: string | null;
  onSelect: (path: string) => void;
};

export function FileTree({ entries, activePath, onSelect }: Props) {
  if (entries.length === 0) {
    return (
      <div className="px-3 py-2 text-xs text-[var(--tippani-muted)]">
        Empty vault — no markdown files yet.
      </div>
    );
  }
  return (
    <ul role="tree" className="text-sm select-none">
      {entries.map((e) => (
        <Node
          key={e.path}
          entry={e}
          depth={0}
          activePath={activePath}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}

type NodeProps = {
  entry: VaultEntry;
  depth: number;
  activePath: string | null;
  onSelect: (path: string) => void;
};

function Node({ entry, depth, activePath, onSelect }: NodeProps) {
  const [open, setOpen] = useState(true);
  const padding = { paddingLeft: `${depth * 12 + 8}px` };

  if (entry.kind === "folder") {
    return (
      <li role="treeitem" aria-expanded={open}>
        <button
          type="button"
          aria-label={`Folder ${entry.name}`}
          className="flex w-full items-center gap-1 px-2 py-1 text-left hover:bg-black/5 dark:hover:bg-white/5"
          style={padding}
          onClick={() => setOpen(!open)}
        >
          <span
            aria-hidden
            className="inline-block w-3 text-[var(--tippani-muted)]"
          >
            {open ? "▾" : "▸"}
          </span>
          <span className="truncate font-medium">{entry.name}</span>
        </button>
        {open && entry.children && entry.children.length > 0 && (
          <ul role="group">
            {entry.children.map((c) => (
              <Node
                key={c.path}
                entry={c}
                depth={depth + 1}
                activePath={activePath}
                onSelect={onSelect}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  const active = activePath === entry.path;
  return (
    <li role="treeitem" aria-selected={active}>
      <button
        type="button"
        className={`flex w-full items-center gap-1 px-2 py-1 text-left hover:bg-black/5 dark:hover:bg-white/5 ${
          active ? "bg-black/10 dark:bg-white/10" : ""
        }`}
        style={padding}
        onClick={() => onSelect(entry.path)}
      >
        <span aria-hidden className="inline-block w-3" />
        <span className="truncate">{displayName(entry.name)}</span>
      </button>
    </li>
  );
}

function displayName(filename: string): string {
  return filename.replace(/\.md$/i, "");
}
