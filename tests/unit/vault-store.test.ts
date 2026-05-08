import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../src/lib/tauri", () => ({
  vaultList: vi.fn(),
  configGetLastVault: vi.fn(),
  configSetLastVault: vi.fn(),
  pickVault: vi.fn(),
  noteRead: vi.fn(),
  noteWrite: vi.fn(),
  noteCreate: vi.fn(),
  noteRename: vi.fn(),
  noteDelete: vi.fn(),
}));

import * as tauri from "../../src/lib/tauri";
import { createVaultStore, SAVE_DEBOUNCE_MS } from "../../src/stores/vault";

type Store = ReturnType<typeof createVaultStore>;

let store: Store;

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  store = createVaultStore();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("bootstrap", () => {
  it("loads last vault when present and refreshes entries", async () => {
    vi.mocked(tauri.configGetLastVault).mockResolvedValue("/vault");
    vi.mocked(tauri.vaultList).mockResolvedValue([]);

    await store.getState().bootstrap();

    expect(store.getState().vaultPath).toBe("/vault");
    expect(tauri.vaultList).toHaveBeenCalledWith("/vault");
  });

  it("is a no-op when no last vault saved", async () => {
    vi.mocked(tauri.configGetLastVault).mockResolvedValue(null);

    await store.getState().bootstrap();

    expect(store.getState().vaultPath).toBeNull();
    expect(tauri.vaultList).not.toHaveBeenCalled();
  });

  it("captures errors into store error field", async () => {
    vi.mocked(tauri.configGetLastVault).mockRejectedValue(new Error("boom"));

    await store.getState().bootstrap();

    expect(store.getState().error).toContain("boom");
  });
});

describe("pickAndOpen", () => {
  it("persists the picked vault and refreshes", async () => {
    vi.mocked(tauri.pickVault).mockResolvedValue("/v");
    vi.mocked(tauri.configSetLastVault).mockResolvedValue();
    vi.mocked(tauri.vaultList).mockResolvedValue([
      { path: "/v/a.md", name: "a.md", kind: "file" },
    ]);

    await store.getState().pickAndOpen();

    expect(tauri.configSetLastVault).toHaveBeenCalledWith("/v");
    expect(store.getState().vaultPath).toBe("/v");
    expect(store.getState().entries).toHaveLength(1);
  });

  it("does nothing when picker is cancelled", async () => {
    vi.mocked(tauri.pickVault).mockResolvedValue(null);

    await store.getState().pickAndOpen();

    expect(tauri.configSetLastVault).not.toHaveBeenCalled();
    expect(store.getState().vaultPath).toBeNull();
  });
});

describe("openNote", () => {
  it("reads file content and sets active path", async () => {
    vi.mocked(tauri.noteRead).mockResolvedValue("hello");

    await store.getState().openNote("/v/a.md");

    expect(store.getState().activeNotePath).toBe("/v/a.md");
    expect(store.getState().noteContent).toBe("hello");
  });

  it("captures read errors", async () => {
    vi.mocked(tauri.noteRead).mockRejectedValue(new Error("nope"));

    await store.getState().openNote("/v/a.md");

    expect(store.getState().error).toContain("nope");
  });
});

describe("debounced save", () => {
  it("does not save before the debounce window", async () => {
    vi.mocked(tauri.noteRead).mockResolvedValue("");
    vi.mocked(tauri.noteWrite).mockResolvedValue();

    await store.getState().openNote("/v/a.md");
    store.getState().updateNoteContent("hi");

    expect(store.getState().saveState).toBe("pending");
    expect(tauri.noteWrite).not.toHaveBeenCalled();
  });

  it("writes once the debounce timer elapses", async () => {
    vi.mocked(tauri.noteRead).mockResolvedValue("");
    vi.mocked(tauri.noteWrite).mockResolvedValue();

    await store.getState().openNote("/v/a.md");
    store.getState().updateNoteContent("hi");

    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS + 5);

    expect(tauri.noteWrite).toHaveBeenCalledWith("/v/a.md", "hi");
  });

  it("coalesces rapid edits into a single write", async () => {
    vi.mocked(tauri.noteRead).mockResolvedValue("");
    vi.mocked(tauri.noteWrite).mockResolvedValue();

    await store.getState().openNote("/v/a.md");
    store.getState().updateNoteContent("a");
    store.getState().updateNoteContent("ab");
    store.getState().updateNoteContent("abc");

    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS + 5);

    expect(tauri.noteWrite).toHaveBeenCalledTimes(1);
    expect(tauri.noteWrite).toHaveBeenCalledWith("/v/a.md", "abc");
  });

  it("flushPendingSave writes immediately", async () => {
    vi.mocked(tauri.noteRead).mockResolvedValue("");
    vi.mocked(tauri.noteWrite).mockResolvedValue();

    await store.getState().openNote("/v/a.md");
    store.getState().updateNoteContent("urgent");

    expect(tauri.noteWrite).not.toHaveBeenCalled();

    await store.getState().flushPendingSave();

    expect(tauri.noteWrite).toHaveBeenCalledWith("/v/a.md", "urgent");
  });

  it("openNote flushes a pending save from the previous note", async () => {
    vi.mocked(tauri.noteRead).mockResolvedValue("");
    vi.mocked(tauri.noteWrite).mockResolvedValue();

    await store.getState().openNote("/v/a.md");
    store.getState().updateNoteContent("from-a");

    await store.getState().openNote("/v/b.md");

    expect(tauri.noteWrite).toHaveBeenCalledWith("/v/a.md", "from-a");
  });

  it("updateNoteContent is a no-op without an active note", () => {
    store.getState().updateNoteContent("orphan");
    expect(store.getState().noteContent).toBe("");
    expect(store.getState().saveState).toBe("idle");
  });
});
