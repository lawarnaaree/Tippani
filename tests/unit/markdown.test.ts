import { describe, it, expect } from "vitest";
import {
  splitMarkdown,
  renderMarkdownHtml,
  noteStem,
  hasMermaid,
} from "../../src/lib/markdown";

describe("splitMarkdown", () => {
  it("returns a single md segment for plain markdown", () => {
    const segments = splitMarkdown("# Hello\n\nA paragraph.");
    expect(segments).toHaveLength(1);
    expect(segments[0]).toEqual({ kind: "md", text: "# Hello\n\nA paragraph." });
  });

  it("returns an md segment even for empty input", () => {
    expect(splitMarkdown("")).toEqual([{ kind: "md", text: "" }]);
  });

  it("splits a single mermaid fence into md / mermaid / md", () => {
    const src = "Intro\n\n```mermaid\ngraph TD; A-->B\n```\n\nOutro";
    const segs = splitMarkdown(src);
    expect(segs).toHaveLength(3);
    expect(segs[0]).toMatchObject({ kind: "md" });
    expect(segs[1]).toMatchObject({
      kind: "mermaid",
      code: "graph TD; A-->B",
      key: "mermaid-0",
    });
    expect(segs[2]).toMatchObject({ kind: "md" });
  });

  it("captures multiple mermaid blocks with stable keys", () => {
    const src =
      "```mermaid\ngraph TD; A-->B\n```\n\n```mermaid\nsequenceDiagram\nA->>B: hi\n```\n";
    const segs = splitMarkdown(src);
    const mermaidSegs = segs.filter((s) => s.kind === "mermaid");
    expect(mermaidSegs).toHaveLength(2);
    expect(mermaidSegs[0]).toMatchObject({ key: "mermaid-0" });
    expect(mermaidSegs[1]).toMatchObject({ key: "mermaid-1" });
  });

  it("handles a fence at the very start of the file", () => {
    const src = "```mermaid\ngraph TD; A-->B\n```\nafter";
    const segs = splitMarkdown(src);
    expect(segs[0]).toMatchObject({ kind: "mermaid" });
    expect(segs.at(-1)).toMatchObject({ kind: "md" });
  });

  it("is case-insensitive on the language tag", () => {
    const src = "```Mermaid\ngraph TD; A-->B\n```";
    const segs = splitMarkdown(src);
    const mermaid = segs.find((s) => s.kind === "mermaid");
    expect(mermaid).toBeDefined();
  });

  it("does not match non-mermaid fenced blocks", () => {
    const src = "```ts\nconst x = 1;\n```";
    const segs = splitMarkdown(src);
    expect(segs.filter((s) => s.kind === "mermaid")).toHaveLength(0);
  });
});

describe("renderMarkdownHtml", () => {
  it("renders a heading", () => {
    const html = renderMarkdownHtml("# Hello");
    expect(html).toMatch(/<h1[^>]*>Hello<\/h1>/);
  });

  it("strips <script> tags via DOMPurify", () => {
    const html = renderMarkdownHtml("Hello <script>alert('xss')</script> world");
    expect(html).not.toMatch(/<script/i);
    expect(html).toMatch(/Hello/);
    expect(html).toMatch(/world/);
  });

  it("strips javascript: URLs", () => {
    const html = renderMarkdownHtml("[click](javascript:alert(1))");
    expect(html.toLowerCase()).not.toContain("javascript:");
  });
});

describe("noteStem", () => {
  it("strips path and .md extension", () => {
    expect(noteStem("/vault/folder/hello.md")).toBe("hello");
    expect(noteStem("C:\\notes\\diary.md")).toBe("diary");
  });
  it("falls back to 'diagram' for null", () => {
    expect(noteStem(null)).toBe("diagram");
  });
});

describe("hasMermaid", () => {
  it("returns true when a mermaid block is present", () => {
    expect(hasMermaid("Intro\n```mermaid\ngraph TD;A-->B\n```")).toBe(true);
  });
  it("returns false otherwise", () => {
    expect(hasMermaid("Just prose")).toBe(false);
    expect(hasMermaid("")).toBe(false);
  });
});
