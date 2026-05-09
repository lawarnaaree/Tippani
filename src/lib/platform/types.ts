import type { UnlistenFn } from "@tauri-apps/api/event";

export type EntryKind = "file" | "folder";

export type VaultEntry = {
  path: string;
  name: string;
  kind: EntryKind;
  children?: VaultEntry[];
};

export type SaveDialogFilter = { name: string; extensions: string[] };

export type SearchHit = {
  path: string;
  line: number;
  preview: string;
  matchStart: number;
  matchEnd: number;
};

export type VaultChangedPayload = { paths: string[] };
export type NoteUpdatedPayload = { path: string };

// Re-exported so consumers don't have to import from @tauri-apps/api/event
// when the web backend returns its own no-op unsubscribe function.
export type { UnlistenFn };

// The shape every backend (Tauri / web) implements. Kept narrow on purpose —
// adding a new operation means adding it here and in both backends.
export interface PlatformBackend {
  pickVault(): Promise<string | null>;
  vaultList(path: string): Promise<VaultEntry[]>;
  noteRead(path: string): Promise<string>;
  noteWrite(path: string, content: string): Promise<void>;
  noteWriteBytes(path: string, base64: string): Promise<void>;
  noteCreate(path: string): Promise<void>;
  noteRename(from: string, to: string): Promise<void>;
  noteDelete(path: string): Promise<void>;
  configGetLastVault(): Promise<string | null>;
  configSetLastVault(path: string): Promise<void>;
  searchVault(root: string, query: string, limit?: number): Promise<SearchHit[]>;
  vaultWatch(path: string): Promise<void>;
  onVaultChanged(cb: (payload: VaultChangedPayload) => void): Promise<UnlistenFn>;
  onNoteUpdated(cb: (payload: NoteUpdatedPayload) => void): Promise<UnlistenFn>;

  // Combined "pick + write text file" used by the export flow. The Tauri
  // backend implements it as pickSavePath + noteWrite; the web backend uses
  // showSaveFilePicker + writable in one shot (no path round-trip needed).
  saveTextToUserFile(
    opts: { defaultPath?: string; filters?: SaveDialogFilter[] },
    content: string,
  ): Promise<boolean>;

  // Same shape as saveTextToUserFile but for binary payloads (e.g. PNG export).
  // Bytes are passed in as base64 so the call site doesn't need to allocate
  // an ArrayBuffer when the source is already a data: URL.
  saveBytesToUserFile(
    opts: { defaultPath?: string; filters?: SaveDialogFilter[] },
    base64: string,
  ): Promise<boolean>;

  // Optional reconnect surface — only the web backend ever has a meaningful
  // "stored handle but permission lapsed" state. Tauri returns null for the
  // pending name and a no-op for reconnect.
  pendingReconnectName(): Promise<string | null>;
  reconnectStoredVault(): Promise<string | null>;
}
