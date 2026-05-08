import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// cmdk (via radix) requires ResizeObserver, which jsdom does not implement.
if (typeof window !== "undefined" && !window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof window.ResizeObserver;
}

// cmdk calls Element.scrollIntoView which jsdom does not implement.
if (typeof window !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function () {};
}

// Radix Dialog logs warnings about missing DialogTitle / aria-describedby in
// test environments. Suppress those console.error/warn calls so test output
// stays clean. We keep real messages by only filtering known Radix messages.
const _origConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const msg = typeof args[0] === "string" ? args[0] : "";
  if (
    msg.includes("DialogContent") ||
    msg.includes("Missing `Description`")
  ) {
    return;
  }
  _origConsoleError.call(console, ...args);
};

const _origConsoleWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const msg = typeof args[0] === "string" ? args[0] : "";
  if (msg.includes("Missing `Description`")) {
    return;
  }
  _origConsoleWarn.call(console, ...args);
};

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
