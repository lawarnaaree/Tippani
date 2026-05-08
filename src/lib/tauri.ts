import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

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
