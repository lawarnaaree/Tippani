import { create } from "zustand";
import {
  type VaultEntry,
  vaultList,
  configGetLastVault,
  configSetLastVault,
  pickVault,
  noteRead,
  noteWrite,
  noteCreate,
} from "../lib/tauri";

export const SAVE_DEBOUNCE_MS = 400;

export type SaveState = "idle" | "pending" | "saving" | "error";

export type VaultStoreState = {
  vaultPath: string | null;
  entries: VaultEntry[];
  activeNotePath: string | null;
  noteContent: string;
  loading: boolean;
  saveState: SaveState;
  error: string | null;

  bootstrap: () => Promise<void>;
  pickAndOpen: () => Promise<void>;
  refresh: () => Promise<void>;
  openNote: (path: string) => Promise<void>;
  updateNoteContent: (content: string) => void;
  flushPendingSave: () => Promise<void>;
  clearActive: () => Promise<void>;
  createNote: (path: string) => Promise<void>;
};

export function createVaultStore() {
  return create<VaultStoreState>((set, get) => {
    let pendingTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingPath: string | null = null;
    let pendingContent: string | null = null;

    async function performSave() {
      const path = pendingPath;
      const content = pendingContent;
      if (path === null || content === null) return;
      set({ saveState: "saving" });
      try {
        await noteWrite(path, content);
        if (pendingPath === path && pendingContent === content) {
          pendingPath = null;
          pendingContent = null;
          set({ saveState: "idle" });
        }
      } catch (e) {
        set({ saveState: "error", error: String(e) });
      }
    }

    return {
      vaultPath: null,
      entries: [],
      activeNotePath: null,
      noteContent: "",
      loading: false,
      saveState: "idle",
      error: null,

      bootstrap: async () => {
        try {
          const last = await configGetLastVault();
          if (last) {
            set({ vaultPath: last });
            await get().refresh();
          }
        } catch (e) {
          set({ error: String(e) });
        }
      },

      pickAndOpen: async () => {
        const picked = await pickVault();
        if (!picked) return;
        await get().flushPendingSave();
        set({
          vaultPath: picked,
          activeNotePath: null,
          noteContent: "",
          saveState: "idle",
          error: null,
        });
        try {
          await configSetLastVault(picked);
          await get().refresh();
        } catch (e) {
          set({ error: String(e) });
        }
      },

      refresh: async () => {
        const path = get().vaultPath;
        if (!path) return;
        set({ loading: true, error: null });
        try {
          const entries = await vaultList(path);
          set({ entries, loading: false });
        } catch (e) {
          set({ error: String(e), loading: false });
        }
      },

      openNote: async (path) => {
        await get().flushPendingSave();
        set({
          activeNotePath: path,
          noteContent: "",
          saveState: "idle",
          error: null,
        });
        try {
          const content = await noteRead(path);
          if (get().activeNotePath === path) {
            set({ noteContent: content });
          }
        } catch (e) {
          set({ error: String(e) });
        }
      },

      updateNoteContent: (content) => {
        const path = get().activeNotePath;
        if (!path) return;
        set({ noteContent: content, saveState: "pending" });
        pendingPath = path;
        pendingContent = content;
        if (pendingTimer) clearTimeout(pendingTimer);
        pendingTimer = setTimeout(() => {
          pendingTimer = null;
          void performSave();
        }, SAVE_DEBOUNCE_MS);
      },

      flushPendingSave: async () => {
        if (pendingTimer) {
          clearTimeout(pendingTimer);
          pendingTimer = null;
        }
        if (pendingPath !== null && pendingContent !== null) {
          await performSave();
        }
      },

      clearActive: async () => {
        await get().flushPendingSave();
        set({
          activeNotePath: null,
          noteContent: "",
          saveState: "idle",
          error: null,
        });
      },

      createNote: async (path) => {
        if (!path.endsWith(".md")) {
          path = path + ".md";
        }
        const vaultPath = get().vaultPath;
        if (!vaultPath) return;
        const fullPath = vaultPath + "/" + path;
        try {
          await noteCreate(fullPath);
          await get().refresh();
        } catch (e) {
          set({ error: String(e) });
        }
      },
    };
  });
}

export const useVault = createVaultStore();
