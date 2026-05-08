import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TabBar } from "../../src/components/Layout/TabBar";
import type { Tab } from "../../src/stores/tabs";

const tabs: Tab[] = [
  { id: "markdown:/v/a.md", path: "/v/a.md", kind: "markdown", title: "a" },
  { id: "markdown:/v/b.md", path: "/v/b.md", kind: "markdown", title: "b" },
  { id: "markdown:/v/c.md", path: "/v/c.md", kind: "markdown", title: "c" },
];

describe("TabBar", () => {
  it("renders nothing when there are no tabs", () => {
    const { container } = render(
      <TabBar
        tabs={[]}
        activeId={null}
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders one tab per entry with derived titles", () => {
    render(
      <TabBar
        tabs={tabs}
        activeId={tabs[0].id}
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByRole("tab", { name: /a/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /b/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /c/ })).toBeInTheDocument();
  });

  it("marks the active tab with aria-selected=true", () => {
    render(
      <TabBar
        tabs={tabs}
        activeId={tabs[1].id}
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    const allTabs = screen.getAllByRole("tab");
    expect(allTabs[0]).toHaveAttribute("aria-selected", "false");
    expect(allTabs[1]).toHaveAttribute("aria-selected", "true");
    expect(allTabs[2]).toHaveAttribute("aria-selected", "false");
  });

  it("calls onSelect when a tab body is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <TabBar
        tabs={tabs}
        activeId={tabs[0].id}
        onSelect={onSelect}
        onClose={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: "b" }));
    expect(onSelect).toHaveBeenCalledWith(tabs[1].id);
  });

  it("calls onClose when the X button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <TabBar
        tabs={tabs}
        activeId={tabs[0].id}
        onSelect={() => {}}
        onClose={onClose}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Close b" }));
    expect(onClose).toHaveBeenCalledWith(tabs[1].id);
  });

  it("calls onClose on middle-click", () => {
    const onClose = vi.fn();
    render(
      <TabBar
        tabs={tabs}
        activeId={tabs[0].id}
        onSelect={() => {}}
        onClose={onClose}
      />,
    );
    const tab = screen.getByRole("tab", { name: /^b/ });
    fireEvent.mouseDown(tab, { button: 1 });
    expect(onClose).toHaveBeenCalledWith(tabs[1].id);
  });
});
