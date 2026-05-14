import { marked } from "marked";
import DOMPurify from "dompurify";
import katex from "katex";

// Vault content is user-authored markdown on a trusted local machine.
// DOMPurify still runs to neutralise pasted XSS payloads (HTML in notes).

export type MdSegment =
  | { kind: "md"; text: string }
  | { kind: "mermaid"; code: string; key: string }
  | { kind: "card"; front: string; back: string; key: string };

const MERMAID_FENCE = /^```mermaid[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*$/gim;
const CARD_FENCE = /^:::card[ \t]*\r?\n([\s\S]*?)\r?\n:::[ \t]*$/gim;

type RawBlock =
  | { kind: "mermaid"; code: string; start: number; end: number }
  | { kind: "card"; front: string; back: string; start: number; end: number };

export function splitMarkdown(src: string): MdSegment[] {
  if (!src) return [{ kind: "md", text: "" }];

  // Collect all special blocks with their positions
  const blocks: RawBlock[] = [];

  MERMAID_FENCE.lastIndex = 0;
  for (let m = MERMAID_FENCE.exec(src); m !== null; m = MERMAID_FENCE.exec(src)) {
    blocks.push({ kind: "mermaid", code: m[1], start: m.index, end: m.index + m[0].length });
  }

  CARD_FENCE.lastIndex = 0;
  for (let m = CARD_FENCE.exec(src); m !== null; m = CARD_FENCE.exec(src)) {
    const body = m[1];
    const sep = body.indexOf("\n---\n");
    const front = sep >= 0 ? body.slice(0, sep).trim() : body.trim();
    const back = sep >= 0 ? body.slice(sep + 5).trim() : "";
    blocks.push({ kind: "card", front, back, start: m.index, end: m.index + m[0].length });
  }

  // Sort by position
  blocks.sort((a, b) => a.start - b.start);

  const segments: MdSegment[] = [];
  let lastIndex = 0;
  let mermaidIdx = 0;
  let cardIdx = 0;

  for (const block of blocks) {
    const before = src.slice(lastIndex, block.start);
    if (before.length > 0) segments.push({ kind: "md", text: before });

    if (block.kind === "mermaid") {
      segments.push({ kind: "mermaid", code: block.code, key: `mermaid-${mermaidIdx}` });
      mermaidIdx += 1;
    } else {
      segments.push({ kind: "card", front: block.front, back: block.back, key: `card-${cardIdx}` });
      cardIdx += 1;
    }

    lastIndex = block.end;
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

// --- KaTeX math rendering ---
// Extract $$...$$ and $...$ before marked runs to prevent _ and ^ being
// parsed as markdown italic/bold. Placeholders are restored after marked.

type MathStore = { mode: "display" | "inline"; rendered: string }[];

function extractMath(src: string): { preprocessed: string; store: MathStore } {
  const store: MathStore = [];

  // Display math first ($$...$$) to avoid consuming $$ as two inline $
  let out = src.replace(/\$\$([^$]+?)\$\$/gs, (_, tex) => {
    const idx = store.length;
    store.push({
      mode: "display",
      rendered: katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false }),
    });
    return `TIPPANI_MATH_${idx}_END`;
  });

  // Inline math ($...$) — single-line only to avoid runaway matches
  out = out.replace(/\$([^$\n]+?)\$/g, (_, tex) => {
    const idx = store.length;
    store.push({
      mode: "inline",
      rendered: katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false }),
    });
    return `TIPPANI_MATH_${idx}_END`;
  });

  return { preprocessed: out, store };
}

function restoreMath(html: string, store: MathStore): string {
  return html.replace(/TIPPANI_MATH_(\d+)_END/g, (_, idx) => {
    const entry = store[Number(idx)];
    if (!entry) return "";
    return entry.mode === "display"
      ? `<div class="katex-display-wrap">${entry.rendered}</div>`
      : entry.rendered;
  });
}

// --- Wikilinks ---

const WIKILINK_RE = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;

export function applyWikilinks(src: string): string {
  return src.replace(WIKILINK_RE, (_, target: string, alias?: string) => {
    const label = alias ?? target;
    return `<a href="#" data-wikilink="${escapeAttr(target.trim())}" class="tippani-wikilink">${escapeAttr(label.trim())}</a>`;
  });
}

// --- Tag links ---
// Matches #tag not at start of line (avoids headings) and not inside backticks
const TAG_RENDER_RE = /(?<![`#\w])#([a-zA-Z][a-zA-Z0-9_-]*)/g;

export function applyTagLinks(src: string): string {
  return src.replace(TAG_RENDER_RE, (_, tag: string) =>
    `<span class="tippani-tag" data-tag="${escapeAttr(tag)}">#${escapeAttr(tag)}</span>`,
  );
}

export function renderMarkdownHtml(md: string): string {
  const { preprocessed: mathExtracted, store: mathStore } = extractMath(md);
  const colored = applyColorShorthand(mathExtracted);
  const withWikilinks = applyWikilinks(colored);
  let html = marked.parse(withWikilinks, { async: false }) as string;
  html = restoreMath(html, mathStore);
  html = applyTagLinks(html);
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ["style", "aria-hidden", "data-wikilink", "data-tag"],
    FORCE_BODY: true,
  });
}

// --- Heading extraction for Outline panel ---

export type HeadingEntry = {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  id: string;
  lineIndex: number;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function extractHeadings(md: string): HeadingEntry[] {
  const headings: HeadingEntry[] = [];
  const lines = md.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s+(.+)/);
    if (m) {
      const level = m[1].length as 1 | 2 | 3 | 4 | 5 | 6;
      const text = m[2].trim();
      headings.push({ level, text, id: slugify(text), lineIndex: i });
    }
  }
  return headings;
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
