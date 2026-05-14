import type { VaultEntry } from "./tauri";
import { noteRead } from "./tauri";

export type BacklinkMap = Record<string, string[]>; // targetStem → [source paths]

const WIKILINK_EXTRACT = /\[\[([^\]|]+?)(?:\|[^\]]+?)?\]\]/g;

function flatFiles(entries: VaultEntry[]): string[] {
  const paths: string[] = [];
  for (const e of entries) {
    if (e.kind === "file") paths.push(e.path);
    else if (e.children) paths.push(...flatFiles(e.children));
  }
  return paths;
}

export async function buildBacklinks(entries: VaultEntry[]): Promise<BacklinkMap> {
  const map: BacklinkMap = {};
  const paths = flatFiles(entries);

  await Promise.all(
    paths.map(async (sourcePath) => {
      try {
        const content = await noteRead(sourcePath);
        WIKILINK_EXTRACT.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = WIKILINK_EXTRACT.exec(content)) !== null) {
          const target = m[1].trim().toLowerCase();
          if (!map[target]) map[target] = [];
          if (!map[target].includes(sourcePath)) {
            map[target].push(sourcePath);
          }
        }
      } catch {
        // skip unreadable files
      }
    }),
  );

  return map;
}

export function getBacklinksForPath(map: BacklinkMap, filePath: string): string[] {
  const stem = filePath
    .split(/[/\\]/)
    .pop()!
    .replace(/\.md$/i, "")
    .toLowerCase();
  return map[stem] ?? [];
}
