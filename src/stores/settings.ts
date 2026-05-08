import { create } from "zustand";

export type ThemeMode = "system" | "light" | "dark";

const STORAGE_KEY = "tippani.theme";
const THEME_CYCLE: ThemeMode[] = ["system", "light", "dark"];

export function loadTheme(): ThemeMode {
  try {
    if (typeof window === "undefined" || !window.localStorage) return "system";
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    // localStorage may throw under security or quota restrictions; ignore.
  }
  return "system";
}

export function persistTheme(mode: ThemeMode): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // ignore
  }
}

export function resolveDark(mode: ThemeMode): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyTheme(mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  const dark = resolveDark(mode);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export type SettingsState = {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  cycleTheme: () => void;
};

export function createSettingsStore() {
  return create<SettingsState>((set, get) => ({
    theme: loadTheme(),

    setTheme: (theme) => {
      persistTheme(theme);
      applyTheme(theme);
      set({ theme });
    },

    cycleTheme: () => {
      const cur = get().theme;
      const i = THEME_CYCLE.indexOf(cur);
      const next = THEME_CYCLE[(i + 1) % THEME_CYCLE.length];
      get().setTheme(next);
    },
  }));
}

export const useSettings = createSettingsStore();
