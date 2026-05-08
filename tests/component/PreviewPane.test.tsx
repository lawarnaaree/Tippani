import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { PreviewPane } from "../../src/components/Editor/PreviewPane";

// Mock mermaid: we don't need real rendering for component tests, just a
// predictable SVG response and a way to assert init/render were called.
const mermaidInit = vi.fn();
const mermaidRender = vi.fn();

vi.mock("mermaid", () => ({
  default: {
    initialize: (...args: unknown[]) => mermaidInit(...args),
    render: (...args: unknown[]) => mermaidRender(...args),
  },
}));

beforeEach(() => {
  mermaidInit.mockClear();
  mermaidRender.mockClear();
  mermaidRender.mockImplementation(async (id: string, code: string) => ({
    svg: `<svg data-test-id="${id}" data-code="${code}"><g/></svg>`,
  }));
});

describe("PreviewPane", () => {
  it("renders headings and paragraphs from markdown", () => {
    render(<PreviewPane path="/v/a.md" content={"# Hello\n\nworld"} />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("world")).toBeInTheDocument();
  });

  it("renders a mermaid block as inline SVG after the debounce window", async () => {
    const content = "intro\n\n```mermaid\ngraph TD; A-->B\n```\n\noutro";
    const { container } = render(
      <PreviewPane path="/v/note.md" content={content} />,
    );

    expect(screen.getByText("Rendering diagram…")).toBeInTheDocument();

    await waitFor(
      () => {
        expect(container.querySelector(".tippani-mermaid svg")).not.toBeNull();
      },
      { timeout: 1500 },
    );

    expect(mermaidRender).toHaveBeenCalledTimes(1);
    expect(mermaidInit).toHaveBeenCalled();
    const callArgs = mermaidRender.mock.calls[0];
    expect(callArgs[1]).toBe("graph TD; A-->B");
  });

  it("shows an inline error box when mermaid throws", async () => {
    mermaidRender.mockRejectedValueOnce(new Error("Parse error: bad syntax"));
    const content = "```mermaid\nnot-a-real-syntax\n```";
    const { container } = render(
      <PreviewPane path="/v/note.md" content={content} />,
    );

    await waitFor(
      () => {
        expect(container.querySelector(".tippani-mermaid-error")).not.toBeNull();
      },
      { timeout: 1500 },
    );
    expect(screen.getByText("Mermaid parse error")).toBeInTheDocument();
    expect(screen.getByText(/Parse error: bad syntax/)).toBeInTheDocument();
  });

  it("renders multiple mermaid blocks independently", async () => {
    const content = [
      "```mermaid",
      "graph TD; A-->B",
      "```",
      "",
      "between",
      "",
      "```mermaid",
      "graph LR; X-->Y",
      "```",
    ].join("\n");
    const { container } = render(
      <PreviewPane path="/v/note.md" content={content} />,
    );

    await waitFor(
      () => {
        expect(container.querySelectorAll(".tippani-mermaid svg")).toHaveLength(2);
      },
      { timeout: 1500 },
    );
    expect(mermaidRender).toHaveBeenCalledTimes(2);
  });
});
