import { useEffect, useId, useRef, useState } from "react";
import mermaid from "mermaid";
import { useResolvedTheme } from "../../hooks/useResolvedTheme";
import { noteWriteBytes, noteWrite, pickSavePath } from "../../lib/tauri";

type Props = {
  code: string;
  noteStem: string;
  blockIndex: number;
};

let mermaidInited = false;
function initMermaid(isDark: boolean) {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    theme: isDark ? "base" : "default",
    themeVariables: isDark
      ? {
          darkMode: true,
          background: "#000000",
          primaryColor: "#0d0a05",
          primaryTextColor: "#d4b88a",
          primaryBorderColor: "#a08660",
          secondaryColor: "#080604",
          secondaryTextColor: "#d4b88a",
          secondaryBorderColor: "#a08660",
          tertiaryColor: "#000000",
          tertiaryTextColor: "#d4b88a",
          tertiaryBorderColor: "#a08660",
          lineColor: "#a08660",
          textColor: "#d4b88a",
          mainBkg: "#0a0805",
          nodeBorder: "#a08660",
          nodeTextColor: "#d4b88a",
          clusterBkg: "#080604",
          clusterBorder: "#1a1408",
          edgeLabelBackground: "#000000",
          titleColor: "#e8c184",
          labelTextColor: "#d4b88a",
        }
      : undefined,
  });
  mermaidInited = true;
}

const RENDER_DEBOUNCE_MS = 250;

export function MermaidBlock({ code, noteStem, blockIndex }: Props) {
  const reactId = useId();
  const renderId = `mermaid-${reactId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const theme = useResolvedTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        if (!mermaidInited) initMermaid(isDark);
        else initMermaid(isDark); // re-init each pass to honour theme switches
        const trimmed = code.trim();
        if (!trimmed) {
          if (!cancelled) {
            setSvg(null);
            setError(null);
          }
          return;
        }
        const result = await mermaid.render(renderId, trimmed);
        if (!cancelled) {
          setSvg(result.svg);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setSvg(null);
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    }, RENDER_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [code, isDark, renderId]);

  const exportSvg = async () => {
    const svgEl = containerRef.current?.querySelector("svg");
    if (!svgEl) return;
    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgEl.outerHTML;
    const targetPath = await pickSavePath({
      defaultPath: `${noteStem}-diagram-${blockIndex + 1}.svg`,
      filters: [{ name: "SVG", extensions: ["svg"] }],
    });
    if (!targetPath) return;
    try {
      await noteWrite(targetPath, xml);
    } catch (e) {
      console.error("SVG export failed", e);
    }
  };

  const exportPng = async () => {
    const svgEl = containerRef.current?.querySelector("svg");
    if (!svgEl) return;

    const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgEl.outerHTML;
    const blob = new Blob([xml], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    const bbox = svgEl.getBoundingClientRect();
    const dpr =
      typeof window !== "undefined" && window.devicePixelRatio
        ? window.devicePixelRatio
        : 1;
    const scale = Math.max(1, dpr * 2);
    const width = Math.max(64, Math.round(bbox.width * scale));
    const height = Math.max(64, Math.round(bbox.height * scale));

    const img = new Image();
    img.crossOrigin = "anonymous";
    const loaded = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load SVG image for raster export"));
    });
    img.src = url;
    try {
      await loaded;
    } catch (e) {
      URL.revokeObjectURL(url);
      console.error(e);
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      URL.revokeObjectURL(url);
      return;
    }
    ctx.fillStyle = isDark ? "#000000" : "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    URL.revokeObjectURL(url);

    const dataUrl = canvas.toDataURL("image/png");
    const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
    const targetPath = await pickSavePath({
      defaultPath: `${noteStem}-diagram-${blockIndex + 1}.png`,
      filters: [{ name: "PNG", extensions: ["png"] }],
    });
    if (!targetPath) return;
    try {
      await noteWriteBytes(targetPath, base64);
    } catch (e) {
      console.error("PNG export failed", e);
    }
  };

  if (error) {
    return (
      <div className="tippani-mermaid tippani-mermaid-error" role="alert">
        <div className="tippani-mermaid-error-title">Mermaid parse error</div>
        <pre className="tippani-mermaid-error-message">{error}</pre>
      </div>
    );
  }

  return (
    <div className="tippani-mermaid" ref={containerRef}>
      <div className="tippani-mermaid-actions" aria-hidden={!svg}>
        <button
          type="button"
          onClick={exportSvg}
          disabled={!svg}
          title="Export as SVG"
        >
          SVG
        </button>
        <button
          type="button"
          onClick={exportPng}
          disabled={!svg}
          title="Export as PNG"
        >
          PNG
        </button>
      </div>
      {svg ? (
        <div
          className="tippani-mermaid-svg"
          // mermaid output is sanitised by mermaid itself (securityLevel: 'strict')
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="tippani-mermaid-loading">Rendering diagram…</div>
      )}
    </div>
  );
}

export default MermaidBlock;
