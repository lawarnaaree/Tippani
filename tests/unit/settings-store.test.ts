import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  createSettingsStore,
  applyTheme,
  resolveDark,
  loadSettings,
  persistSettings,
  type Settings,
} from "../../src/stores/settings";

const SETTINGS_KEY = "tippani.settings";
const LEGACY_THEME_KEY = "tippani.theme";

const baseSettings = (): Settings => ({
  theme: "system",
  editorFontFamily:
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  editorFontSize: 14,
  keymap: "default",
});

type MqlListener = (e: { matches: boolean }) => void;

function mockMatchMedia(initialDark: boolean) {
  let matches = initialDark;
  const listeners = new Set<MqlListener>();
  const fn = vi.fn(() => ({
    get matches() {
      return matches;
    },
    addEventListener: (_: string, l: MqlListener) => listeners.add(l),
    removeEventListener: (_: string, l: MqlListener) => listeners.delete(l),
    media: "(prefers-color-scheme: dark)",
  }));
  Object.defineProperty(window, "matchMedia", {
    value: fn,
    configurable: true,
    writable: true,
  });
  return {
    fn,
    setSystemDark(next: boolean) {
      matches = next;
      listeners.forEach((l) => l({ matches: next }));
    },
  };
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.classList.remove("dark");
  document.documentElement.style.colorScheme = "";
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loadSettings / persistSettings", () => {
  it("defaults to baseline when nothing is stored", () => {
    const s = loadSettings();
    expect(s).toEqual(baseSettings());
  });

  it("reads back what was persisted", () => {
    persistSettings({ ...baseSettings(), theme: "dark", editorFontSize: 18 });
    const s = loadSettings();
    expect(s.theme).toBe("dark");
    expect(s.editorFontSize).toBe(18);
  });

  it("falls back to defaults for invalid stored fields", () => {
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ theme: "rainbow", editorFontSize: "huge" }),
    );
    const s = loadSettings();
    expect(s.theme).toBe("system");
    expect(s.editorFontSize).toBe(14);
  });

  it("migrates legacy tippani.theme key when no settings stored", () => {
    window.localStorage.setItem(LEGACY_THEME_KEY, "dark");
    const s = loadSettings();
    expect(s.theme).toBe("dark");
    expect(s.editorFontFamily).toBe(baseSettings().editorFontFamily);
  });

  it("ignores legacy key when modern settings are present", () => {
    window.localStorage.setItem(LEGACY_THEME_KEY, "dark");
    persistSettings({ ...baseSettings(), theme: "light" });
    expect(loadSettings().theme).toBe("light");
  });
});

describe("resolveDark", () => {
  it("returns true for 'dark' regardless of system", () => {
    mockMatchMedia(false);
    expect(resolveDark("dark")).toBe(true);
  });

  it("returns false for 'light' regardless of system", () => {
    mockMatchMedia(true);
    expect(resolveDark("light")).toBe(false);
  });

  it("follows system preference when 'system'", () => {
    mockMatchMedia(true);
    expect(resolveDark("system")).toBe(true);
    mockMatchMedia(false);
    expect(resolveDark("system")).toBe(false);
  });
});

describe("applyTheme", () => {
  it("toggles the .dark class on <html> based on resolved mode", () => {
    mockMatchMedia(false);
    applyTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe("dark");

    applyTheme("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it("'system' mode follows the OS preference", () => {
    mockMatchMedia(true);
    applyTheme("system");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    mockMatchMedia(false);
    applyTheme("system");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});

describe("settings store", () => {
  it("setTheme persists, applies, and updates state", () => {
    mockMatchMedia(false);
    const store = createSettingsStore();
    store.getState().setTheme("dark");

    expect(store.getState().theme).toBe("dark");
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("cycleTheme cycles system → light → dark → system", () => {
    mockMatchMedia(false);
    const store = createSettingsStore();
    expect(store.getState().theme).toBe("system");

    store.getState().cycleTheme();
    expect(store.getState().theme).toBe("light");

    store.getState().cycleTheme();
    expect(store.getState().theme).toBe("dark");

    store.getState().cycleTheme();
    expect(store.getState().theme).toBe("system");
  });

  it("update mutates a field, persists, and clamps font size", () => {
    const store = createSettingsStore();
    store.getState().update("editorFontSize", 18);
    expect(store.getState().editorFontSize).toBe(18);

    // Above max should clamp to 22.
    store.getState().update("editorFontSize", 999);
    expect(store.getState().editorFontSize).toBe(22);

    // Below min should clamp to 10.
    store.getState().update("editorFontSize", 1);
    expect(store.getState().editorFontSize).toBe(10);

    const persisted = JSON.parse(window.localStorage.getItem(SETTINGS_KEY)!);
    expect(persisted.editorFontSize).toBe(10);
  });

  it("update changes editorFontFamily and persists alongside theme", () => {
    const store = createSettingsStore();
    store.getState().setTheme("dark");
    store.getState().update("editorFontFamily", "Foo, monospace");
    const persisted = JSON.parse(window.localStorage.getItem(SETTINGS_KEY)!);
    expect(persisted.theme).toBe("dark");
    expect(persisted.editorFontFamily).toBe("Foo, monospace");
  });
});
