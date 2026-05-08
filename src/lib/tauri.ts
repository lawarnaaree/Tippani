import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { open, save } from "@tauri-apps/plugin-dialog";

export type EntryKind = "file" | "folder";

export type VaultEntry = {
  path: string;
  name: string;
  kind: EntryKind;
  children?: VaultEntry[];
};

export async function pickVault(): Promise<string | null> {
  const result = await open({ directory: true, multiple: false });
  if (typeof result === "string") return result;
  return null;
}

export function vaultList(path: string): Promise<VaultEntry[]> {
  return invoke<VaultEntry[]>("vault_list", { path });
}

export function noteRead(path: string): Promise<string> {
  return invoke<string>("note_read", { path });
}

export function noteWrite(path: string, content: string): Promise<void> {
  return invoke<void>("note_write", { path, content });
}

export function noteWriteBytes(path: string, base64: string): Promise<void> {
  return invoke<void>("note_write_bytes", { path, base64 });
}

export type SaveDialogFilter = { name: string; extensions: string[] };

export async function pickSavePath(opts: {
  defaultPath?: string;
  filters?: SaveDialogFilter[];
}): Promise<string | null> {
  const r = await save(opts);
  return typeof r === "string" ? r : null;
}

export function noteCreate(path: string): Promise<void> {
  return invoke<void>("note_create", { path });
}

export function noteRename(from: string, to: string): Promise<void> {
  return invoke<void>("note_rename", { from, to });
}

export function noteDelete(path: string): Promise<void> {
  return invoke<void>("note_delete", { path });
}

export function configGetLastVault(): Promise<string | null> {
  return invoke<string | null>("config_get_last_vault");
}

export function configSetLastVault(path: string): Promise<void> {
  return invoke<void>("config_set_last_vault", { path });
}

export type SearchHit = {
  path: string;
  line: number;
  preview: string;
  matchStart: number;
  matchEnd: number;
};

export function searchVault(
  root: string,
  query: string,
  limit = 200,
): Promise<SearchHit[]> {
  return invoke<SearchHit[]>("search_vault", { root, query, limit });
}

export function vaultWatch(path: string): Promise<void> {
  return invoke<void>("vault_watch", { path });
}

export type VaultChangedPayload = { paths: string[] };
export type NoteUpdatedPayload = { path: string };

export function onVaultChanged(
  cb: (payload: VaultChangedPayload) => void,
): Promise<UnlistenFn> {
  return listen<VaultChangedPayload>("vault://changed", (e) => cb(e.payload));
}

export function onNoteUpdated(
  cb: (payload: NoteUpdatedPayload) => void,
): Promise<UnlistenFn> {
  return listen<NoteUpdatedPayload>("vault://note-updated", (e) =>
    cb(e.payload),
  );
}
