import { create } from "zustand";

export type ThemeMode = "system" | "light" | "dark";
export type Keymap = "default";

const LEGACY_THEME_KEY = "tippani.theme";
const SETTINGS_KEY = "tippani.settings";
const THEME_CYCLE: ThemeMode[] = ["system", "light", "dark"];

const DEFAULT_FONT_FAMILY =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
export const DEFAULT_FONT_SIZE = 14;
export const FONT_SIZE_MIN = 10;
export const FONT_SIZE_MAX = 22;

export type Settings = {
  theme: ThemeMode;
  editorFontFamily: string;
  editorFontSize: number;
  keymap: Keymap;
};

const DEFAULTS: Settings = {
  theme: "system",
  editorFontFamily: DEFAULT_FONT_FAMILY,
  editorFontSize: DEFAULT_FONT_SIZE,
  keymap: "default",
};

function isThemeMode(v: unknown): v is ThemeMode {
  return v === "system" || v === "light" || v === "dark";
}

function clampFontSize(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_FONT_SIZE;
  return Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, Math.round(n)));
}

export function loadSettings(): Settings {
  try {
    if (typeof window === "undefined" || !window.localStorage) return DEFAULTS;
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Settings>;
      return {
        theme: isThemeMode(parsed.theme) ? parsed.theme : DEFAULTS.theme,
        editorFontFamily:
          typeof parsed.editorFontFamily === "string" && parsed.editorFontFamily
            ? parsed.editorFontFamily
            : DEFAULTS.editorFontFamily,
        editorFontSize:
          typeof parsed.editorFontSize === "number"
            ? clampFontSize(parsed.editorFontSize)
            : DEFAULTS.editorFontSize,
        keymap: parsed.keymap === "default" ? parsed.keymap : DEFAULTS.keymap,
      };
    }
    // Migrate legacy `tippani.theme` key (theme-only schema).
    const legacy = window.localStorage.getItem(LEGACY_THEME_KEY);
    if (isThemeMode(legacy)) {
      return { ...DEFAULTS, theme: legacy };
    }
  } catch {
    // localStorage may throw under security or quota restrictions; ignore.
  }
  return DEFAULTS;
}

export function persistSettings(s: Settings): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
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

export type SettingsState = Settings & {
  setTheme: (t: ThemeMode) => void;
  cycleTheme: () => void;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
};

function snapshot(s: SettingsState): Settings {
  return {
    theme: s.theme,
    editorFontFamily: s.editorFontFamily,
    editorFontSize: s.editorFontSize,
    keymap: s.keymap,
  };
}

export function createSettingsStore() {
  return create<SettingsState>((set, get) => {
    const initial = loadSettings();

    return {
      ...initial,

      setTheme: (theme) => {
        const next: Settings = { ...snapshot(get()), theme };
        persistSettings(next);
        applyTheme(theme);
        set({ theme });
      },

      cycleTheme: () => {
        const cur = get().theme;
        const i = THEME_CYCLE.indexOf(cur);
        const next = THEME_CYCLE[(i + 1) % THEME_CYCLE.length];
        get().setTheme(next);
      },

      update: (key, value) => {
        const sanitized: Settings[typeof key] =
          key === "editorFontSize"
            ? (clampFontSize(value as number) as Settings[typeof key])
            : value;
        const next: Settings = { ...snapshot(get()), [key]: sanitized };
        persistSettings(next);
        set({ [key]: sanitized } as Partial<SettingsState>);
      },
    };
  });
}

export const useSettings = createSettingsStore();
