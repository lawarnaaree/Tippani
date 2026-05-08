import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileTree } from "../../src/components/Sidebar/FileTree";
import { type VaultEntry } from "../../src/lib/tauri";

const fixture: VaultEntry[] = [
  {
    path: "/v/notes",
    name: "notes",
    kind: "folder",
    children: [
      { path: "/v/notes/alpha.md", name: "alpha.md", kind: "file" },
      { path: "/v/notes/beta.md", name: "beta.md", kind: "file" },
    ],
  },
  { path: "/v/root.md", name: "root.md", kind: "file" },
];

describe("FileTree", () => {
  it("renders folders and the file names without .md extensions", () => {
    render(<FileTree entries={fixture} activePath={null} onSelect={() => {}} />);
    expect(screen.getByText("notes")).toBeInTheDocument();
    expect(screen.getByText("alpha")).toBeInTheDocument();
    expect(screen.getByText("beta")).toBeInTheDocument();
    expect(screen.getByText("root")).toBeInTheDocument();
  });

  it("calls onSelect with the absolute path when a file is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <FileTree entries={fixture} activePath={null} onSelect={onSelect} />,
    );
    await user.click(screen.getByText("alpha"));
    expect(onSelect).toHaveBeenCalledWith("/v/notes/alpha.md");
  });

  it("collapses a folder when its header is clicked", async () => {
    const user = userEvent.setup();
    render(<FileTree entries={fixture} activePath={null} onSelect={() => {}} />);
    expect(screen.getByText("alpha")).toBeInTheDocument();

    await user.click(screen.getByText("notes"));

    expect(screen.queryByText("alpha")).not.toBeInTheDocument();
  });

  it("marks the active file as selected", () => {
    render(
      <FileTree
        entries={fixture}
        activePath="/v/notes/alpha.md"
        onSelect={() => {}}
      />,
    );
    const alphaItem = screen.getByText("alpha").closest("li");
    expect(alphaItem).toHaveAttribute("aria-selected", "true");
  });

  it("shows an empty state when there are no entries", () => {
    render(<FileTree entries={[]} activePath={null} onSelect={() => {}} />);
    expect(screen.getByText(/empty vault/i)).toBeInTheDocument();
  });
});
