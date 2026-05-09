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

// Inline color shorthand: ==red:text== or ==#3b82f6:text==
// Named colors compile to a CSS class (theme-aware via :root tokens); arbitrary
// hex compiles to an inline style. Both are escaped before injection.
export const NAMED_COLORS = new Set([
  "red",
  "blue",
  "green",
  "yellow",
  "purple",
  "orange",
  "pink",
  "gray",
  "grey",
]);

const COLOR_SHORTHAND =
  /==(?:([a-zA-Z]+)|(#[0-9a-fA-F]{3,8})):([^=\n]+)==/g;

function isSafeHexColor(hex: string): boolean {
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(
    hex,
  );
}

function escapeAttr(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#39;";
      default: return c;
    }
  });
}

export function applyColorShorthand(src: string): string {
  return src.replace(COLOR_SHORTHAND, (full, named, hex, text) => {
    if (named) {
      const key = (named as string).toLowerCase();
      if (!NAMED_COLORS.has(key)) return full;
      // "grey" is an alias for "gray" — normalise for consistent CSS.
      const cls = key === "grey" ? "gray" : key;
      return `<span class="tippani-color-${cls}">${text}</span>`;
    }
    if (hex && isSafeHexColor(hex)) {
      return `<span style="color:${escapeAttr(hex)}">${text}</span>`;
    }
    return full;
  });
}

export function renderMarkdownHtml(md: string): string {
  const preprocessed = applyColorShorthand(md);
  const html = marked.parse(preprocessed, { async: false }) as string;
  return DOMPurify.sanitize(html, { ADD_ATTR: ["style"] });
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
