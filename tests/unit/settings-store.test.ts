import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  createSettingsStore,
  applyTheme,
  resolveDark,
  loadTheme,
  persistTheme,
} from "../../src/stores/settings";

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

describe("loadTheme / persistTheme", () => {
  it("defaults to 'system' when nothing is stored", () => {
    expect(loadTheme()).toBe("system");
  });

  it("reads back what was persisted", () => {
    persistTheme("dark");
    expect(loadTheme()).toBe("dark");
    persistTheme("light");
    expect(loadTheme()).toBe("light");
    persistTheme("system");
    expect(loadTheme()).toBe("system");
  });

  it("falls back to 'system' for invalid stored values", () => {
    window.localStorage.setItem("tippani.theme", "rainbow");
    expect(loadTheme()).toBe("system");
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
    expect(window.localStorage.getItem("tippani.theme")).toBe("dark");
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
});
