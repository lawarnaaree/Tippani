import { useEffect, useRef, useMemo } from "react";
import { splitMarkdown, renderMarkdownHtml, noteStem } from "../../lib/markdown";
import { MermaidBlock } from "../Diagram/MermaidBlock";
import { FlashcardBlock } from "../Flashcards/FlashcardBlock";
import { usePreviewScroll } from "../../stores/previewScroll";

type Props = {
  path: string | null;
  content: string;
  onWikilinkClick?: (name: string) => void;
  onTagClick?: (tag: string) => void;
};

export function PreviewPane({ path, content, onWikilinkClick, onTagClick }: Props) {
  const segments = useMemo(() => splitMarkdown(content), [content]);
  const stem = useMemo(() => noteStem(path), [path]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll to heading when outline panel requests it
  const scrollToId = usePreviewScroll((s) => s.scrollToId);
  const clearScroll = usePreviewScroll((s) => s.clearScroll);

  useEffect(() => {
    if (!scrollToId || !containerRef.current) return;
    const el = containerRef.current.querySelector(`#${CSS.escape(scrollToId)}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    clearScroll();
  }, [scrollToId, clearScroll]);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;

    // Wikilink clicks
    const wikiEl = target.closest("[data-wikilink]") as HTMLElement | null;
    if (wikiEl) {
      e.preventDefault();
      const name = wikiEl.getAttribute("data-wikilink");
      if (name && onWikilinkClick) onWikilinkClick(name);
      return;
    }

    // Tag clicks
    const tagEl = target.closest("[data-tag]") as HTMLElement | null;
    if (tagEl) {
      e.preventDefault();
      const tag = tagEl.getAttribute("data-tag");
      if (tag && onTagClick) onTagClick(tag);
    }
  }

  let mermaidIndex = 0;
  let cardIndex = 0;

  return (
    <div
      ref={containerRef}
      className="tippani-preview h-full w-full overflow-y-auto"
      onClick={handleClick}
    >
      <div className="tippani-preview-inner">
        {segments.map((seg, i) => {
          if (seg.kind === "mermaid") {
            const idx = mermaidIndex;
            mermaidIndex += 1;
            return (
              <MermaidBlock
                key={seg.key}
                code={seg.code}
                noteStem={stem}
                blockIndex={idx}
              />
            );
          }
          if (seg.kind === "card") {
            const idx = cardIndex;
            cardIndex += 1;
            return (
              <FlashcardBlock
                key={seg.key}
                cardId={seg.key}
                front={seg.front}
                back={seg.back}
                noteIndex={idx}
              />
            );
          }
          const html = renderMarkdownHtml(seg.text);
          return (
            <div
              key={`md-${i}`}
              className="tippani-preview-md"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        })}
      </div>
    </div>
  );
}

export default PreviewPane;
