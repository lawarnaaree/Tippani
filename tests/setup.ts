import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom 26 sometimes ships without a working Storage implementation; install
// a minimal in-memory polyfill so tests have a deterministic localStorage.
if (typeof window !== "undefined") {
  const ls = window.localStorage as unknown;
  const ok =
    !!ls &&
    typeof (ls as Storage).getItem === "function" &&
    typeof (ls as Storage).setItem === "function" &&
    typeof (ls as Storage).clear === "function";
  if (!ok) {
    const store = new Map<string, string>();
    const stub: Storage = {
      get length() {
        return store.size;
      },
      clear: () => store.clear(),
      getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
      setItem: (k: string, v: string) => {
        store.set(k, String(v));
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      key: (i: number) => Array.from(store.keys())[i] ?? null,
    };
    Object.defineProperty(window, "localStorage", {
      value: stub,
      configurable: true,
      writable: true,
    });
  }
}

afterEach(() => {
  cleanup();
  if (typeof window !== "undefined" && window.localStorage?.clear) {
    window.localStorage.clear();
  }
});
