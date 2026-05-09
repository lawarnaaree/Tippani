import type { PlatformBackend } from "./types";
import { tauriBackend } from "./tauri";
import { webBackend } from "./web";

export type {
  EntryKind,
  VaultEntry,
  SearchHit,
  SaveDialogFilter,
  VaultChangedPayload,
  NoteUpdatedPayload,
  UnlistenFn,
} from "./types";

function detectBackend(): PlatformBackend {
  if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
    return tauriBackend;
  }
  return webBackend;
}

const backend = detectBackend();

export const isTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export const isWeb = !isTauri;

export const pickVault = backend.pickVault;
export const vaultList = backend.vaultList;
export const noteRead = backend.noteRead;
export const noteWrite = backend.noteWrite;
export const noteWriteBytes = backend.noteWriteBytes;
export const noteCreate = backend.noteCreate;
export const noteRename = backend.noteRename;
export const noteDelete = backend.noteDelete;
export const configGetLastVault = backend.configGetLastVault;
export const configSetLastVault = backend.configSetLastVault;
export const searchVault = backend.searchVault;
export const vaultWatch = backend.vaultWatch;
export const onVaultChanged = backend.onVaultChanged;
export const onNoteUpdated = backend.onNoteUpdated;
export const saveTextToUserFile = backend.saveTextToUserFile;
export const saveBytesToUserFile = backend.saveBytesToUserFile;
export const pendingReconnectName = backend.pendingReconnectName;
export const reconnectStoredVault = backend.reconnectStoredVault;
