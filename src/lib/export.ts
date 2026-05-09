import { renderMarkdownHtml } from "./markdown";
import { saveTextToUserFile } from "./tauri";

const BASE_CSS = `
  body {
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    line-height: 1.6;
    max-width: 720px;
    margin: 2rem auto;
    padding: 0 1rem;
    color: #1a1a1a;
    background: #fff;
  }
  pre, code { font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; }
  pre { background: #f6f8fa; padding: 1rem; border-radius: 6px; overflow-x: auto; }
  :not(pre) > code { background: #f6f8fa; padding: 0.1rem 0.3rem; border-radius: 4px; font-size: 0.9em; }
  blockquote { border-left: 3px solid #d0d7de; padding-left: 1rem; color: #57606a; margin-left: 0; }
  table { border-collapse: collapse; }
  th, td { border: 1px solid #d0d7de; padding: 0.4rem 0.6rem; }
  h1, h2, h3 { line-height: 1.25; }
  hr { border: 0; border-top: 1px solid #d0d7de; }
  img { max-width: 100%; height: auto; }
`;

const PRINT_CSS = `
  @media print {
    body { margin: 0; max-width: none; padding: 0.5in; }
    pre { white-space: pre-wrap; word-wrap: break-word; page-break-inside: avoid; }
    img, svg, table { page-break-inside: avoid; }
    h1, h2, h3 { page-break-after: avoid; }
  }
`;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#39;";
      default: return c;
    }
  });
}

function makeShell(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>${BASE_CSS}${PRINT_CSS}</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

export async function exportHtml(title: string, markdown: string): Promise<void> {
  const body = renderMarkdownHtml(markdown);
  const shell = makeShell(title, body);
  await saveTextToUserFile(
    {
      defaultPath: `${title}.html`,
      filters: [{ name: "HTML", extensions: ["html"] }],
    },
    shell,
  );
}

export function exportPdf(title: string, markdown: string): void {
  const body = renderMarkdownHtml(markdown);
  const shell = makeShell(title, body);

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "absolute";
  iframe.style.top = "-9999px";
  iframe.style.left = "-9999px";
  iframe.style.width = "8.5in";
  iframe.style.height = "11in";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    try {
      iframe.contentWindow?.removeEventListener("afterprint", cleanup);
    } catch {
      // ignore
    }
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  };

  iframe.onload = () => {
    // One rAF lets the iframe's layout settle before opening the print dialog.
    requestAnimationFrame(() => {
      const win = iframe.contentWindow;
      if (!win) {
        cleanup();
        return;
      }
      win.addEventListener("afterprint", cleanup);
      win.focus();
      win.print();
      // Fallback: some platforms don't fire afterprint reliably.
      setTimeout(cleanup, 60_000);
    });
  };

  iframe.srcdoc = shell;
}
