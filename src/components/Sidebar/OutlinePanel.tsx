import { useMemo } from "react";
import { extractHeadings, type HeadingEntry } from "../../lib/markdown";
import { usePreviewScroll } from "../../stores/previewScroll";

type Props = {
  content: string;
};

export function OutlinePanel({ content }: Props) {
  const headings = useMemo(() => extractHeadings(content), [content]);
  const requestScroll = usePreviewScroll((s) => s.requestScroll);

  if (headings.length === 0) {
    return (
      <div className="px-3 py-4 text-xs" style={{ color: "var(--tippani-muted)" }}>
        No headings found in this note.
      </div>
    );
  }

  return (
    <div className="py-1 overflow-y-auto flex-1">
      {headings.map((h, i) => (
        <OutlineItem key={i} heading={h} onClick={() => requestScroll(h.id)} />
      ))}
    </div>
  );
}

function OutlineItem({ heading, onClick }: { heading: HeadingEntry; onClick: () => void }) {
  return (
    <button
      className={`tippani-outline-item tippani-outline-h${heading.level}`}
      onClick={onClick}
      title={heading.text}
    >
      {heading.text}
    </button>
  );
}
