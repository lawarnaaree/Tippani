import type {
  PlatformBackend,
  SaveDialogFilter,
  SearchHit,
  VaultEntry,
  UnlistenFn,
} from "./types";
import { clearDirHandle, loadDirHandle, saveDirHandle } from "./web-idb";

// Synthetic vault paths look like "<rootName>/sub/dir/file.md". We treat them
// as opaque IDs throughout the store/UI; only this module decodes them back
// into directory + file handles.

let rootHandle: FileSystemDirectoryHandle | null = null;
const fileHandles = new Map<string, FileSystemFileHandle>();
const dirHandles = new Map<string, FileSystemDirectoryHandle>();

function ensureSupported(): void {
  if (typeof window === "undefined" || !("showDirectoryPicker" in window)) {
    throw new Error(
      "Your browser does not support the File System Access API. " +
        "Please use Chrome, Edge, Brave, or another Chromium-based browser.",
    );
  }
}

function joinPath(parent: string, name: string): string {
  return parent.endsWith("/") ? parent + name : parent + "/" + name;
}

function splitPath(path: string): { dir: string; name: string } {
  const i = path.lastIndexOf("/");
  if (i < 0) return { dir: "", name: path };
  return { dir: path.slice(0, i), name: path.slice(i + 1) };
}

function clearCaches(): void {
  fileHandles.clear();
  dirHandles.clear();
}

async function ensurePermission(
  handle: FileSystemHandle,
  mode: FileSystemPermissionMode = "readwrite",
): Promise<boolean> {
  const q = await handle.queryPermission({ mode });
  if (q === "granted") return true;
  const r = await handle.requestPermission({ mode });
  return r === "granted";
}

// Walk from rootHandle to the directory containing `path`. With `create: true`,
// missing intermediate directories are created (mirrors note_write's behavior
// at src-tauri/src/commands/vault.rs:128).
async function resolveDir(
  path: string,
  opts: { create?: boolean } = {},
): Promise<FileSystemDirectoryHandle> {
  if (!rootHandle) throw new Error("No vault is open");
  const cached = dirHandles.get(path);
  if (cached) return cached;

  // Strip the root segment — paths are "<rootName>/<rest>".
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0 || segments[0] !== rootHandle.name) {
    throw new Error(`Path is not inside the open vault: ${path}`);
  }
  let dir: FileSystemDirectoryHandle = rootHandle;
  let walked = rootHandle.name;
  dirHandles.set(walked, dir);
  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    dir = await dir.getDirectoryHandle(seg, { create: opts.create ?? false });
    walked = walked + "/" + seg;
    dirHandles.set(walked, dir);
  }
  return dir;
}

async function resolveFile(
  path: string,
  opts: { create?: boolean; createDirs?: boolean } = {},
): Promise<FileSystemFileHandle> {
  const cached = fileHandles.get(path);
  if (cached && !opts.create) return cached;
  const { dir, name } = splitPath(path);
  const parent = await resolveDir(dir, { create: opts.createDirs ?? opts.create });
  const handle = await parent.getFileHandle(name, { create: opts.create ?? false });
  fileHandles.set(path, handle);
  return handle;
}

async function walkVault(
  dir: FileSystemDirectoryHandle,
  basePath: string,
): Promise<VaultEntry[]> {
  const out: VaultEntry[] = [];
  for await (const [name, handle] of dir.entries()) {
    const childPath = joinPath(basePath, name);
    if (handle.kind === "directory") {
      dirHandles.set(childPath, handle);
      const children = await walkVault(handle, childPath);
      out.push({ path: childPath, name, kind: "folder", children });
    } else if (handle.kind === "file" && name.toLowerCase().endsWith(".md")) {
      fileHandles.set(childPath, handle);
      out.push({ path: childPath, name, kind: "file" });
    }
  }
  // Match the Rust impl ordering: folders first, then files, both alphabetical.
  out.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return out;
}

async function pickVault(): Promise<string | null> {
  ensureSupported();
  try {
    const handle = await window.showDirectoryPicker!({ mode: "readwrite" });
    if (!(await ensurePermission(handle, "readwrite"))) return null;
    rootHandle = handle;
    clearCaches();
    dirHandles.set(handle.name, handle);
    await saveDirHandle(handle);
    return handle.name;
  } catch (e) {
    // User cancelled the picker — Chromium throws AbortError.
    if (e && typeof e === "object" && "name" in e && (e as { name: string }).name === "AbortError") {
      return null;
    }
    throw e;
  }
}

async function vaultList(_path: string): Promise<VaultEntry[]> {
  if (!rootHandle) return [];
  return walkVault(rootHandle, rootHandle.name);
}

async function noteRead(path: string): Promise<string> {
  const handle = await resolveFile(path);
  const file = await handle.getFile();
  return file.text();
}

async function noteWrite(path: string, content: string): Promise<void> {
  const handle = await resolveFile(path, { create: true, createDirs: true });
  const writable = await handle.createWritable();
  try {
    await writable.write(content);
  } finally {
    await writable.close();
  }
}

function decodeBase64(base64: string): Uint8Array {
  const bin = atob(base64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function noteWriteBytes(path: string, base64: string): Promise<void> {
  const handle = await resolveFile(path, { create: true, createDirs: true });
  const writable = await handle.createWritable();
  try {
    await writable.write(decodeBase64(base64));
  } finally {
    await writable.close();
  }
}

async function noteCreate(path: string): Promise<void> {
  // Mirror the Rust check at src-tauri/src/commands/vault.rs:154 — error if exists.
  const { dir, name } = splitPath(path);
  const parent = await resolveDir(dir, { create: true });
  try {
    await parent.getFileHandle(name, { create: false });
    throw new Error(`File already exists: ${path}`);
  } catch (e) {
    if (
      e instanceof DOMException &&
      (e.name === "NotFoundError" || e.name === "TypeMismatchError")
    ) {
      const handle = await parent.getFileHandle(name, { create: true });
      fileHandles.set(path, handle);
      return;
    }
    throw e;
  }
}

async function noteRename(from: string, to: string): Promise<void> {
  // FSA has no native rename. Copy bytes, then remove the source.
  const src = await resolveFile(from);
  const file = await src.getFile();
  const buf = await file.arrayBuffer();
  const dest = await resolveFile(to, { create: true, createDirs: true });
  const writable = await dest.createWritable();
  try {
    await writable.write(buf);
  } finally {
    await writable.close();
  }
  const { dir, name } = splitPath(from);
  const parent = await resolveDir(dir);
  await parent.removeEntry(name);
  fileHandles.delete(from);
}

async function noteDelete(path: string): Promise<void> {
  const { dir, name } = splitPath(path);
  const parent = await resolveDir(dir);
  await parent.removeEntry(name);
  fileHandles.delete(path);
}

// In web, the "last vault" is implicit — the directory handle stored in IDB.
// configGet returns the vault name only if permission is already granted (so
// the bootstrap path can mount it without prompting). The user-visible
// "reconnect" UI handles the prompt-required case via reconnectStoredVault.
async function configGetLastVault(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const stored = await loadDirHandle();
  if (!stored) return null;
  try {
    const perm = await stored.queryPermission({ mode: "readwrite" });
    if (perm !== "granted") return null;
    rootHandle = stored;
    clearCaches();
    dirHandles.set(stored.name, stored);
    return stored.name;
  } catch {
    return null;
  }
}

async function configSetLastVault(_path: string): Promise<void> {
  // No-op: the directory handle was already persisted by pickVault().
}

async function searchVault(
  _root: string,
  query: string,
  limit = 200,
): Promise<SearchHit[]> {
  if (!rootHandle) return [];
  const needle = query.toLowerCase();
  if (needle.length === 0) return [];
  const hits: SearchHit[] = [];

  async function visit(
    dir: FileSystemDirectoryHandle,
    basePath: string,
  ): Promise<boolean> {
    for await (const [name, handle] of dir.entries()) {
      if (hits.length >= limit) return true;
      const childPath = joinPath(basePath, name);
      if (handle.kind === "directory") {
        const stop = await visit(handle, childPath);
        if (stop) return true;
      } else if (handle.kind === "file" && name.toLowerCase().endsWith(".md")) {
        const file = await handle.getFile();
        const text = await file.text();
        const lines = text.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const idx = line.toLowerCase().indexOf(needle);
          if (idx >= 0) {
            hits.push({
              path: childPath,
              line: i + 1,
              preview: line,
              matchStart: idx,
              matchEnd: idx + needle.length,
            });
            if (hits.length >= limit) return true;
          }
        }
      }
    }
    return false;
  }

  await visit(rootHandle, rootHandle.name);
  return hits;
}

async function vaultWatch(_path: string): Promise<void> {
  // No-op: File System Access API has no change notification yet.
}

const noopUnlisten: UnlistenFn = () => {};

async function onVaultChanged(): Promise<UnlistenFn> {
  return noopUnlisten;
}

async function onNoteUpdated(): Promise<UnlistenFn> {
  return noopUnlisten;
}

async function pickAndWrite(
  opts: { defaultPath?: string; filters?: SaveDialogFilter[] },
  data: string | BufferSource,
): Promise<boolean> {
  ensureSupported();
  const types: SaveFilePickerAcceptType[] | undefined = opts.filters?.map(
    (f) => ({
      description: f.name,
      accept: { "application/octet-stream": f.extensions.map((e) => "." + e) },
    }),
  );
  try {
    const handle = await window.showSaveFilePicker!({
      suggestedName: opts.defaultPath,
      types,
    });
    const writable = await handle.createWritable();
    try {
      await writable.write(data);
    } finally {
      await writable.close();
    }
    return true;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return false;
    throw e;
  }
}

async function saveTextToUserFile(
  opts: { defaultPath?: string; filters?: SaveDialogFilter[] },
  content: string,
): Promise<boolean> {
  return pickAndWrite(opts, content);
}

async function saveBytesToUserFile(
  opts: { defaultPath?: string; filters?: SaveDialogFilter[] },
  base64: string,
): Promise<boolean> {
  return pickAndWrite(opts, decodeBase64(base64));
}

async function pendingReconnectName(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (rootHandle) return null;
  const stored = await loadDirHandle();
  if (!stored) return null;
  try {
    const perm = await stored.queryPermission({ mode: "readwrite" });
    if (perm === "prompt") return stored.name;
  } catch {
    return null;
  }
  return null;
}

async function reconnectStoredVault(): Promise<string | null> {
  const stored = await loadDirHandle();
  if (!stored) return null;
  const granted = await ensurePermission(stored, "readwrite");
  if (!granted) {
    await clearDirHandle();
    return null;
  }
  rootHandle = stored;
  clearCaches();
  dirHandles.set(stored.name, stored);
  return stored.name;
}

export const webBackend: PlatformBackend = {
  pickVault,
  vaultList,
  noteRead,
  noteWrite,
  noteWriteBytes,
  noteCreate,
  noteRename,
  noteDelete,
  configGetLastVault,
  configSetLastVault,
  searchVault,
  vaultWatch,
  onVaultChanged,
  onNoteUpdated,
  saveTextToUserFile,
  saveBytesToUserFile,
  pendingReconnectName,
  reconnectStoredVault,
};
