import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Palette } from "../../src/components/CommandPalette/Palette";
import type { Command } from "../../src/lib/commands";
import { flattenEntries } from "../../src/lib/commands";
import type { VaultEntry } from "../../src/lib/tauri";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCommands(overrides: Partial<Command>[] = []): Command[] {
  const defaults: Command[] = [
    {
      id: "note:/vault/hello.md",
      label: "hello",
      keywords: ["hello.md", "/vault/hello.md"],
      section: "notes",
      run: vi.fn(),
    },
    {
      id: "note:/vault/world.md",
      label: "world",
      keywords: ["world.md", "/vault/world.md"],
      section: "notes",
      run: vi.fn(),
    },
    {
      id: "action:cycle-theme",
      label: "Cycle theme",
      keywords: ["dark", "light", "system"],
      shortcut: "Ctrl+Shift+L",
      section: "actions",
      run: vi.fn(),
    },
    {
      id: "action:change-vault",
      label: "Change vault",
      keywords: ["open", "folder"],
      section: "actions",
      run: vi.fn(),
    },
  ];
  return overrides.length
    ? defaults.map((d, i) => ({ ...d, ...overrides[i] }))
    : defaults;
}

// ---------------------------------------------------------------------------
// flattenEntries unit tests
// ---------------------------------------------------------------------------

describe("flattenEntries", () => {
  it("flattens nested vault entries to files only", () => {
    const entries: VaultEntry[] = [
      { path: "/a.md", name: "a.md", kind: "file" },
      {
        path: "/sub",
        name: "sub",
        kind: "folder",
        children: [
          { path: "/sub/b.md", name: "b.md", kind: "file" },
          {
            path: "/sub/deep",
            name: "deep",
            kind: "folder",
            children: [
              { path: "/sub/deep/c.md", name: "c.md", kind: "file" },
            ],
          },
        ],
      },
    ];
    const flat = flattenEntries(entries);
    expect(flat).toHaveLength(3);
    expect(flat.map((e) => e.path)).toEqual([
      "/a.md",
      "/sub/b.md",
      "/sub/deep/c.md",
    ]);
  });

  it("returns empty array for empty entries", () => {
    expect(flattenEntries([])).toEqual([]);
  });

  it("skips folders without children", () => {
    const entries: VaultEntry[] = [
      { path: "/empty", name: "empty", kind: "folder" },
    ];
    expect(flattenEntries(entries)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Palette component tests
// ---------------------------------------------------------------------------

describe("Palette", () => {
  let commands: Command[];
  let onOpenChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    commands = makeCommands();
    onOpenChange = vi.fn();
  });

  it("renders nothing when closed", () => {
    const { container } = render(
      <Palette open={false} onOpenChange={onOpenChange} commands={commands} />,
    );
    // cmdk Dialog doesn't render content when closed
    expect(container.querySelector(".tippani-palette")).toBeNull();
  });

  it("renders dialog when open", () => {
    render(
      <Palette open={true} onOpenChange={onOpenChange} commands={commands} />,
    );
    // The input should be visible
    expect(
      screen.getByPlaceholderText(/search notes/i),
    ).toBeInTheDocument();
  });

  it("shows note items", () => {
    render(
      <Palette open={true} onOpenChange={onOpenChange} commands={commands} />,
    );
    expect(screen.getByText("hello")).toBeInTheDocument();
    expect(screen.getByText("world")).toBeInTheDocument();
  });

  it("shows action items", () => {
    render(
      <Palette open={true} onOpenChange={onOpenChange} commands={commands} />,
    );
    expect(screen.getByText("Cycle theme")).toBeInTheDocument();
    expect(screen.getByText("Change vault")).toBeInTheDocument();
  });

  it("shows shortcut badges on actions that have them", () => {
    render(
      <Palette open={true} onOpenChange={onOpenChange} commands={commands} />,
    );
    expect(screen.getByText("Ctrl+Shift+L")).toBeInTheDocument();
  });

  it("calls run() and closes on item select", async () => {
    const user = userEvent.setup();
    render(
      <Palette open={true} onOpenChange={onOpenChange} commands={commands} />,
    );
    // Click on the "hello" note item
    const item = screen.getByText("hello");
    await user.click(item);
    expect(commands[0].run).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows empty state when no items match", async () => {
    const user = userEvent.setup();
    render(
      <Palette open={true} onOpenChange={onOpenChange} commands={commands} />,
    );
    const input = screen.getByPlaceholderText(/search notes/i);
    await user.type(input, "zzzzzzzznotfound");
    expect(screen.getByText("No results found.")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// useGlobalShortcuts tests
// ---------------------------------------------------------------------------

describe("useGlobalShortcuts", () => {
  it("fires onTogglePalette on Ctrl+K", async () => {
    const onTogglePalette = vi.fn();
    const onCycleTheme = vi.fn();
    const onNewNote = vi.fn();

    // We import and render a tiny wrapper to test the hook
    const { useGlobalShortcuts } = await import(
      "../../src/hooks/useGlobalShortcuts"
    );

    function Wrapper() {
      useGlobalShortcuts({
        onTogglePalette,
        onCycleTheme,
        onNewNote,
      });
      return <div data-testid="wrapper" />;
    }

    render(<Wrapper />);

    // Simulate Ctrl+K
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        ctrlKey: true,
        bubbles: true,
      }),
    );

    expect(onTogglePalette).toHaveBeenCalledTimes(1);
    expect(onCycleTheme).not.toHaveBeenCalled();
    expect(onNewNote).not.toHaveBeenCalled();
  });

  it("fires onCycleTheme on Ctrl+Shift+L", async () => {
    const onTogglePalette = vi.fn();
    const onCycleTheme = vi.fn();
    const onNewNote = vi.fn();

    const { useGlobalShortcuts } = await import(
      "../../src/hooks/useGlobalShortcuts"
    );

    function Wrapper() {
      useGlobalShortcuts({
        onTogglePalette,
        onCycleTheme,
        onNewNote,
      });
      return <div data-testid="wrapper" />;
    }

    render(<Wrapper />);

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "l",
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      }),
    );

    expect(onCycleTheme).toHaveBeenCalledTimes(1);
    expect(onTogglePalette).not.toHaveBeenCalled();
  });

  it("fires onNewNote on Ctrl+N", async () => {
    const onTogglePalette = vi.fn();
    const onCycleTheme = vi.fn();
    const onNewNote = vi.fn();

    const { useGlobalShortcuts } = await import(
      "../../src/hooks/useGlobalShortcuts"
    );

    function Wrapper() {
      useGlobalShortcuts({
        onTogglePalette,
        onCycleTheme,
        onNewNote,
      });
      return <div data-testid="wrapper" />;
    }

    render(<Wrapper />);

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "n",
        ctrlKey: true,
        bubbles: true,
      }),
    );

    expect(onNewNote).toHaveBeenCalledTimes(1);
  });

  it("fires onTogglePalette on Ctrl+P (alias)", async () => {
    const onTogglePalette = vi.fn();
    const onCycleTheme = vi.fn();
    const onNewNote = vi.fn();

    const { useGlobalShortcuts } = await import(
      "../../src/hooks/useGlobalShortcuts"
    );

    function Wrapper() {
      useGlobalShortcuts({
        onTogglePalette,
        onCycleTheme,
        onNewNote,
      });
      return <div data-testid="wrapper" />;
    }

    render(<Wrapper />);

    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "p",
        ctrlKey: true,
        bubbles: true,
      }),
    );

    expect(onTogglePalette).toHaveBeenCalledTimes(1);
  });
});
