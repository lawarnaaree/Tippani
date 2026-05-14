import type { VaultEntry } from "./tauri";
import { noteRead } from "./tauri";

export type TagIndex = Record<string, string[]>; // tagName → [notePaths]

// Match #tag not at start of line and not preceded by # or word chars (to skip headings)
const TAG_RE = /(?<![`#\w])#([a-zA-Z][a-zA-Z0-9_-]*)/g;

export function extractTags(md: string): string[] {
  const tags: string[] = [];
  TAG_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TAG_RE.exec(md)) !== null) {
    tags.push(m[1].toLowerCase());
  }
  return [...new Set(tags)];
}

function flatFiles(entries: VaultEntry[]): string[] {
  const paths: string[] = [];
  for (const e of entries) {
    if (e.kind === "file") paths.push(e.path);
    else if (e.children) paths.push(...flatFiles(e.children));
  }
  return paths;
}

export async function buildTagIndex(entries: VaultEntry[]): Promise<TagIndex> {
  const index: TagIndex = {};
  const paths = flatFiles(entries);

  await Promise.all(
    paths.map(async (p) => {
      try {
        const content = await noteRead(p);
        const tags = extractTags(content);
        for (const tag of tags) {
          if (!index[tag]) index[tag] = [];
          if (!index[tag].includes(p)) index[tag].push(p);
        }
      } catch {
        // skip
      }
    }),
  );

  return index;
}
