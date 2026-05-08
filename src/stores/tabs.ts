import { create } from "zustand";

export type TabKind = "markdown";

export type Tab = {
  id: string;
  path: string;
  kind: TabKind;
  title: string;
};

export type TabsState = {
  tabs: Tab[];
  activeTabId: string | null;

  openTab: (path: string, kind?: TabKind) => string;
  closeTab: (id: string) => void;
  setActive: (id: string) => void;
  closeAll: () => void;
};

export function tabIdFor(path: string, kind: TabKind): string {
  return `${kind}:${path}`;
}

export function deriveTitle(path: string): string {
  const last = path.split(/[/\\]/).pop() ?? path;
  return last.replace(/\.md$/i, "");
}

export function createTabsStore() {
  return create<TabsState>((set, get) => ({
    tabs: [],
    activeTabId: null,

    openTab: (path, kind = "markdown") => {
      const id = tabIdFor(path, kind);
      const existing = get().tabs.find((t) => t.id === id);
      if (existing) {
        set({ activeTabId: id });
        return id;
      }
      const tab: Tab = { id, path, kind, title: deriveTitle(path) };
      set({ tabs: [...get().tabs, tab], activeTabId: id });
      return id;
    },

    closeTab: (id) => {
      const state = get();
      const idx = state.tabs.findIndex((t) => t.id === id);
      if (idx === -1) return;
      const next = state.tabs.filter((_, i) => i !== idx);
      let newActive = state.activeTabId;
      if (state.activeTabId === id) {
        if (next.length === 0) {
          newActive = null;
        } else {
          const neighborIdx = Math.min(idx, next.length - 1);
          newActive = next[neighborIdx].id;
        }
      }
      set({ tabs: next, activeTabId: newActive });
    },

    setActive: (id) => {
      if (get().tabs.some((t) => t.id === id)) {
        set({ activeTabId: id });
      }
    },

    closeAll: () => set({ tabs: [], activeTabId: null }),
  }));
}

export const useTabs = createTabsStore();
