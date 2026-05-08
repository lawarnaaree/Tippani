import { describe, it, expect, vi, beforeEach } from "vitest";

const invokeMock = vi.fn();
const openMock = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: (...args: unknown[]) => openMock(...args),
}));

import {
  pickVault,
  vaultList,
  noteRead,
  noteWrite,
  noteCreate,
  noteRename,
  noteDelete,
  configGetLastVault,
  configSetLastVault,
} from "../../src/lib/tauri";

beforeEach(() => {
  invokeMock.mockReset();
  openMock.mockReset();
});

describe("pickVault", () => {
  it("calls dialog open as a directory picker", async () => {
    openMock.mockResolvedValueOnce("/some/path");
    const out = await pickVault();
    expect(openMock).toHaveBeenCalledWith({
      directory: true,
      multiple: false,
    });
    expect(out).toBe("/some/path");
  });

  it("returns null when picker is cancelled", async () => {
    openMock.mockResolvedValueOnce(null);
    const out = await pickVault();
    expect(out).toBeNull();
  });

  it("returns null when an array is somehow returned", async () => {
    openMock.mockResolvedValueOnce(["/a", "/b"]);
    const out = await pickVault();
    expect(out).toBeNull();
  });
});

describe("vault commands", () => {
  it("vaultList invokes vault_list with path", async () => {
    invokeMock.mockResolvedValueOnce([]);
    await vaultList("/v");
    expect(invokeMock).toHaveBeenCalledWith("vault_list", { path: "/v" });
  });

  it("noteRead invokes note_read", async () => {
    invokeMock.mockResolvedValueOnce("body");
    const out = await noteRead("/v/a.md");
    expect(invokeMock).toHaveBeenCalledWith("note_read", { path: "/v/a.md" });
    expect(out).toBe("body");
  });

  it("noteWrite invokes note_write with path and content", async () => {
    invokeMock.mockResolvedValueOnce(undefined);
    await noteWrite("/v/a.md", "hi");
    expect(invokeMock).toHaveBeenCalledWith("note_write", {
      path: "/v/a.md",
      content: "hi",
    });
  });

  it("noteCreate invokes note_create", async () => {
    invokeMock.mockResolvedValueOnce(undefined);
    await noteCreate("/v/x.md");
    expect(invokeMock).toHaveBeenCalledWith("note_create", { path: "/v/x.md" });
  });

  it("noteRename invokes note_rename with from/to", async () => {
    invokeMock.mockResolvedValueOnce(undefined);
    await noteRename("/v/a.md", "/v/b.md");
    expect(invokeMock).toHaveBeenCalledWith("note_rename", {
      from: "/v/a.md",
      to: "/v/b.md",
    });
  });

  it("noteDelete invokes note_delete", async () => {
    invokeMock.mockResolvedValueOnce(undefined);
    await noteDelete("/v/a.md");
    expect(invokeMock).toHaveBeenCalledWith("note_delete", { path: "/v/a.md" });
  });

  it("configGetLastVault invokes config_get_last_vault with no args", async () => {
    invokeMock.mockResolvedValueOnce(null);
    await configGetLastVault();
    expect(invokeMock).toHaveBeenCalledWith("config_get_last_vault");
  });

  it("configSetLastVault invokes config_set_last_vault with path", async () => {
    invokeMock.mockResolvedValueOnce(undefined);
    await configSetLastVault("/v");
    expect(invokeMock).toHaveBeenCalledWith("config_set_last_vault", {
      path: "/v",
    });
  });
});
