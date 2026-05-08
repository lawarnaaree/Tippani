import { useMemo } from "react";
import { splitMarkdown, renderMarkdownHtml, noteStem } from "../../lib/markdown";
import { MermaidBlock } from "../Diagram/MermaidBlock";

type Props = {
  path: string | null;
  content: string;
};

export function PreviewPane({ path, content }: Props) {
  const segments = useMemo(() => splitMarkdown(content), [content]);
  const stem = useMemo(() => noteStem(path), [path]);

  let mermaidIndex = 0;
  return (
    <div className="tippani-preview h-full w-full overflow-y-auto">
      <div className="tippani-preview-inner">
        {segments.map((seg, i) => {
          if (seg.kind === "md") {
            const html = renderMarkdownHtml(seg.text);
            return (
              <div
                key={`md-${i}`}
                className="tippani-preview-md"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          }
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
        })}
      </div>
    </div>
  );
}

export default PreviewPane;
