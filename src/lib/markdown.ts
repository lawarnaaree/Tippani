import { marked } from "marked";
import DOMPurify from "dompurify";

// Vault content is user-authored markdown on a trusted local machine.
// DOMPurify still runs to neutralise pasted XSS payloads (HTML in notes).

export type MdSegment =
  | { kind: "md"; text: string }
  | { kind: "mermaid"; code: string; key: string };

const MERMAID_FENCE = /^```mermaid[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*$/gim;

export function splitMarkdown(src: string): MdSegment[] {
  if (!src) return [{ kind: "md", text: "" }];

  const segments: MdSegment[] = [];
  let lastIndex = 0;
  let blockIndex = 0;

  MERMAID_FENCE.lastIndex = 0;
  for (let m = MERMAID_FENCE.exec(src); m !== null; m = MERMAID_FENCE.exec(src)) {
    const before = src.slice(lastIndex, m.index);
    if (before.length > 0) {
      segments.push({ kind: "md", text: before });
    }
    segments.push({
      kind: "mermaid",
      code: m[1],
      key: `mermaid-${blockIndex}`,
    });
    blockIndex += 1;
    lastIndex = m.index + m[0].length;
  }

  const tail = src.slice(lastIndex);
  if (tail.length > 0 || segments.length === 0) {
    segments.push({ kind: "md", text: tail });
  }

  return segments;
}

marked.setOptions({ gfm: true, breaks: false });

export function renderMarkdownHtml(md: string): string {
  const html = marked.parse(md, { async: false }) as string;
  return DOMPurify.sanitize(html);
}

export function noteStem(path: string | null): string {
  if (!path) return "diagram";
  const last = path.split(/[/\\]/).pop() ?? path;
  return last.replace(/\.md$/i, "") || "diagram";
}

export function hasMermaid(src: string): boolean {
  if (!src) return false;
  MERMAID_FENCE.lastIndex = 0;
  return MERMAID_FENCE.test(src);
}
