import type { TagIndex } from "../../lib/tags";

type Props = {
  tagIndex: TagIndex;
  activeFilter: string | null;
  onSelectTag: (tag: string | null) => void;
};

export function TagsPanel({ tagIndex, activeFilter, onSelectTag }: Props) {
  const tags = Object.entries(tagIndex).sort((a, b) => b[1].length - a[1].length);

  if (tags.length === 0) {
    return (
      <div className="px-3 py-4 text-xs" style={{ color: "var(--tippani-muted)" }}>
        No tags found. Add <code>#tag</code> in any note.
      </div>
    );
  }

  return (
    <div className="py-1 overflow-y-auto flex-1">
      {activeFilter && (
        <div className="px-3 pb-2 pt-1">
          <button
            onClick={() => onSelectTag(null)}
            style={{
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 4,
              border: "1px solid var(--tippani-border)",
              background: "var(--tippani-hover)",
              color: "var(--tippani-fg)",
              cursor: "pointer",
            }}
          >
            ✕ Clear filter
          </button>
        </div>
      )}
      {tags.map(([tag, paths]) => (
        <button
          key={tag}
          className="tippani-outline-item"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: activeFilter === tag ? "var(--tippani-active)" : undefined,
          }}
          onClick={() => onSelectTag(activeFilter === tag ? null : tag)}
        >
          <span className="tippani-tag" style={{ cursor: "pointer", pointerEvents: "none" }}>
            #{tag}
          </span>
          <span style={{ fontSize: 11, color: "var(--tippani-muted)", marginLeft: 8 }}>
            {paths.length}
          </span>
        </button>
      ))}
    </div>
  );
}
