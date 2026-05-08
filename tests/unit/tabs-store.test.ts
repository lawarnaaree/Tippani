import { describe, it, expect, beforeEach } from "vitest";
import { createTabsStore, deriveTitle } from "../../src/stores/tabs";

type Store = ReturnType<typeof createTabsStore>;
let store: Store;

beforeEach(() => {
  store = createTabsStore();
});

describe("openTab", () => {
  it("creates a new tab and makes it active", () => {
    const id = store.getState().openTab("/v/a.md");
    expect(id).toBe("/v/a.md");
    expect(store.getState().tabs).toHaveLength(1);
    expect(store.getState().activeTabId).toBe(id);
  });

  it("focuses the existing tab when opening the same path again", () => {
    const a = store.getState().openTab("/v/a.md");
    const b = store.getState().openTab("/v/b.md");
    expect(store.getState().activeTabId).toBe(b);

    const a2 = store.getState().openTab("/v/a.md");
    expect(a2).toBe(a);
    expect(store.getState().tabs).toHaveLength(2);
    expect(store.getState().activeTabId).toBe(a);
  });

  it("derives a clean title from the path", () => {
    store.getState().openTab("/v/notes/meeting.md");
    expect(store.getState().tabs[0].title).toBe("meeting");
  });
});

describe("closeTab", () => {
  it("ignores unknown ids", () => {
    store.getState().openTab("/v/a.md");
    store.getState().closeTab("does-not-exist");
    expect(store.getState().tabs).toHaveLength(1);
  });

  it("removes the tab and keeps active when a non-active tab is closed", () => {
    const a = store.getState().openTab("/v/a.md");
    const b = store.getState().openTab("/v/b.md");
    store.getState().setActive(a);

    store.getState().closeTab(b);

    expect(store.getState().tabs).toHaveLength(1);
    expect(store.getState().activeTabId).toBe(a);
  });

  it("picks the right neighbor when closing the active tab", () => {
    const a = store.getState().openTab("/v/a.md");
    const b = store.getState().openTab("/v/b.md");
    const c = store.getState().openTab("/v/c.md");
    store.getState().setActive(b);

    store.getState().closeTab(b);

    expect(store.getState().tabs.map((t) => t.id)).toEqual([a, c]);
    expect(store.getState().activeTabId).toBe(c);
  });

  it("falls back to left neighbor when closing the rightmost active tab", () => {
    const a = store.getState().openTab("/v/a.md");
    const b = store.getState().openTab("/v/b.md");

    store.getState().closeTab(b);

    expect(store.getState().activeTabId).toBe(a);
  });

  it("clears active when the last tab is closed", () => {
    const a = store.getState().openTab("/v/a.md");
    store.getState().closeTab(a);

    expect(store.getState().tabs).toHaveLength(0);
    expect(store.getState().activeTabId).toBeNull();
  });
});

describe("setActive", () => {
  it("activates a known tab id", () => {
    const a = store.getState().openTab("/v/a.md");
    const b = store.getState().openTab("/v/b.md");
    store.getState().setActive(a);
    expect(store.getState().activeTabId).toBe(a);
    store.getState().setActive(b);
    expect(store.getState().activeTabId).toBe(b);
  });

  it("ignores unknown ids", () => {
    const a = store.getState().openTab("/v/a.md");
    store.getState().setActive("nope");
    expect(store.getState().activeTabId).toBe(a);
  });
});

describe("closeAll", () => {
  it("clears tabs and active", () => {
    store.getState().openTab("/v/a.md");
    store.getState().openTab("/v/b.md");
    store.getState().closeAll();
    expect(store.getState().tabs).toHaveLength(0);
    expect(store.getState().activeTabId).toBeNull();
  });
});

describe("deriveTitle", () => {
  it("strips .md and forward slashes", () => {
    expect(deriveTitle("/v/notes/foo.md")).toBe("foo");
  });
  it("strips .md and back slashes", () => {
    expect(deriveTitle("C:\\\\v\\\\notes\\\\bar.md")).toBe("bar");
  });
  it("leaves bare names untouched", () => {
    expect(deriveTitle("scratch")).toBe("scratch");
  });
});
