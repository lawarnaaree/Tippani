import { create } from "zustand";

type PreviewScrollState = {
  scrollToId: string | null;
  requestScroll: (id: string) => void;
  clearScroll: () => void;
};

export const usePreviewScroll = create<PreviewScrollState>((set) => ({
  scrollToId: null,
  requestScroll: (id) => set({ scrollToId: id }),
  clearScroll: () => set({ scrollToId: null }),
}));
