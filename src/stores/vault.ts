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
  pendingReconnectName,
  reconnectStoredVault,
} from "../lib/tauri";
import { buildTagIndex, type TagIndex } from "../lib/tags";
import { applyTemplateTitle } from "../lib/templates";

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
  // Web-only: name of a previously-opened vault whose stored handle needs a
  // permission re-grant before it can be used again. Always null on desktop.
  pendingReconnect: string | null;

  // Tags
  tagIndex: TagIndex;
  tagFilter: string | null;
  setTagFilter: (tag: string | null) => void;

  bootstrap: () => Promise<void>;
  pickAndOpen: () => Promise<void>;
  reconnect: () => Promise<void>;
  refresh: () => Promise<void>;
  openNote: (path: string) => Promise<void>;
  updateNoteContent: (content: string) => void;
  syncNoteContent: (path: string, content: string) => void;
  flushPendingSave: () => Promise<void>;
  clearActive: () => Promise<void>;
  createNote: (path: string) => Promise<void>;
  createNoteFromTemplate: (templateContent: string | null, newPath: string) => Promise<void>;
};

export function createVaultStore() {
  return create<VaultStoreState>((set, get) => {
    let pendingTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingPath: string | null = null;
    let pendingContent: string | null = null;

    function isDirty(): boolean {
      return pendingPath !== null && pendingContent !== null;
    }

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
      pendingReconnect: null,
      tagIndex: {},
      tagFilter: null,

      setTagFilter: (tag) => set({ tagFilter: tag }),

      bootstrap: async () => {
        try {
          const last = await configGetLastVault();
          if (last) {
            set({ vaultPath: last, pendingReconnect: null });
            await get().refresh();
            return;
          }
          // No active vault — but in web we may have a stored handle that
          // simply needs a permission re-grant on user gesture.
          const pending = await pendingReconnectName();
          if (pending) set({ pendingReconnect: pending });
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
          pendingReconnect: null,
        });
        try {
          await configSetLastVault(picked);
          await get().refresh();
        } catch (e) {
          set({ error: String(e) });
        }
      },

      reconnect: async () => {
        try {
          const name = await reconnectStoredVault();
          if (!name) return;
          await get().flushPendingSave();
          set({
            vaultPath: name,
            activeNotePath: null,
            noteContent: "",
            saveState: "idle",
            error: null,
            pendingReconnect: null,
          });
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
          // Build tag index in background after entries are set
          buildTagIndex(entries)
            .then((tagIndex) => set({ tagIndex }))
            .catch(() => {/* silent */});
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

      // Apply externally-sourced content to the active note (file watcher path).
      // Refuses to clobber unsaved local edits or an in-flight save.
      syncNoteContent: (path, content) => {
        const state = get();
        if (state.activeNotePath !== path) return;
        if (state.saveState === "saving" || isDirty()) {
          // Local edits are in-flight; preserve them. Logged so dropped external
          // edits don't disappear silently in dev tools.
          // eslint-disable-next-line no-console
          console.info(
            `[vault] external change to ${path} skipped — local edits pending`,
          );
          return;
        }
        if (state.noteContent === content) return;
        set({ noteContent: content });
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

      createNoteFromTemplate: async (templateContent, newPath) => {
        const vaultPath = get().vaultPath;
        if (!vaultPath) return;
        let fullPath = newPath.endsWith(".md") ? newPath : newPath + ".md";
        if (!fullPath.startsWith(vaultPath)) {
          fullPath = vaultPath + "/" + fullPath;
        }
        const noteName = fullPath.split(/[/\\]/).pop()!.replace(/\.md$/i, "");
        const content = templateContent
          ? applyTemplateTitle(templateContent, noteName)
          : `# ${noteName}\n\n`;
        try {
          await noteWrite(fullPath, content);
          await get().refresh();
          await get().openNote(fullPath);
        } catch (e) {
          set({ error: String(e) });
        }
      },
    };
  });
}

export const useVault = createVaultStore();
