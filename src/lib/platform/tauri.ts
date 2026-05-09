import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { open, save } from "@tauri-apps/plugin-dialog";
import type {
  PlatformBackend,
  SaveDialogFilter,
  SearchHit,
  VaultChangedPayload,
  VaultEntry,
  NoteUpdatedPayload,
} from "./types";

async function pickVault(): Promise<string | null> {
  const result = await open({ directory: true, multiple: false });
  if (typeof result === "string") return result;
  return null;
}

function vaultList(path: string): Promise<VaultEntry[]> {
  return invoke<VaultEntry[]>("vault_list", { path });
}

function noteRead(path: string): Promise<string> {
  return invoke<string>("note_read", { path });
}

function noteWrite(path: string, content: string): Promise<void> {
  return invoke<void>("note_write", { path, content });
}

function noteWriteBytes(path: string, base64: string): Promise<void> {
  return invoke<void>("note_write_bytes", { path, base64 });
}

async function pickSavePath(opts: {
  defaultPath?: string;
  filters?: SaveDialogFilter[];
}): Promise<string | null> {
  const r = await save(opts);
  return typeof r === "string" ? r : null;
}

function noteCreate(path: string): Promise<void> {
  return invoke<void>("note_create", { path });
}

function noteRename(from: string, to: string): Promise<void> {
  return invoke<void>("note_rename", { from, to });
}

function noteDelete(path: string): Promise<void> {
  return invoke<void>("note_delete", { path });
}

function configGetLastVault(): Promise<string | null> {
  return invoke<string | null>("config_get_last_vault");
}

function configSetLastVault(path: string): Promise<void> {
  return invoke<void>("config_set_last_vault", { path });
}

function searchVault(
  root: string,
  query: string,
  limit = 200,
): Promise<SearchHit[]> {
  return invoke<SearchHit[]>("search_vault", { root, query, limit });
}

function vaultWatch(path: string): Promise<void> {
  return invoke<void>("vault_watch", { path });
}

function onVaultChanged(
  cb: (payload: VaultChangedPayload) => void,
): Promise<UnlistenFn> {
  return listen<VaultChangedPayload>("vault://changed", (e) => cb(e.payload));
}

function onNoteUpdated(
  cb: (payload: NoteUpdatedPayload) => void,
): Promise<UnlistenFn> {
  return listen<NoteUpdatedPayload>("vault://note-updated", (e) =>
    cb(e.payload),
  );
}

async function saveTextToUserFile(
  opts: { defaultPath?: string; filters?: SaveDialogFilter[] },
  content: string,
): Promise<boolean> {
  const path = await pickSavePath(opts);
  if (!path) return false;
  await noteWrite(path, content);
  return true;
}

async function saveBytesToUserFile(
  opts: { defaultPath?: string; filters?: SaveDialogFilter[] },
  base64: string,
): Promise<boolean> {
  const path = await pickSavePath(opts);
  if (!path) return false;
  await noteWriteBytes(path, base64);
  return true;
}

async function pendingReconnectName(): Promise<string | null> {
  return null;
}

async function reconnectStoredVault(): Promise<string | null> {
  return null;
}

export const tauriBackend: PlatformBackend = {
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
