import { useCallback, useEffect, useRef, useState } from "react";
import { Excalidraw, Footer, useDevice } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useResolvedTheme } from "../../hooks/useResolvedTheme";
import { noteRead, noteWrite } from "../../lib/tauri";
import { tryAutoreplace } from "../../lib/symbols";
import { StrokePanel } from "./StrokePanel";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css";
import "highlight.js/styles/github.css";

type Props = {
  path: string;
  onOpenMenu?: () => void;
  onOpenSymbols?: () => void;
};

type CodeBlock = {
  id: string;
  language: string;
  code: string;
  highlighted: string;
};

export default function CanvasEditor({ path, onOpenMenu, onOpenSymbols }: Props) {
  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [api, setApi] = useState<any>(null);
  const [hasSelection, setHasSelection] = useState(false);
  const [selectedCodeBlock, setSelectedCodeBlock] = useState<CodeBlock | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = useResolvedTheme();
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const prevSelectedIdRef = useRef<string | null>(null);
  const isDark = theme === "dark";

  const canvasPath = path.replace(/\.md$/i, ".canvas.json");

  useEffect(() => {
    setLoading(true);
    setInitialData(null);
    let active = true;
    noteRead(canvasPath)
      .then((content) => {
        if (!active) return;
        if (content.trim()) {
          try {
            const parsed = JSON.parse(content);
            if (parsed && typeof parsed === "object") {
              delete parsed.appState;
              setInitialData(parsed);
            } else {
              setInitialData(null);
            }
          } catch (err) {
            console.error("Failed to parse canvas JSON", err);
            setInitialData(null);
          }
        } else {
          setInitialData(null);
        }
      })
      .catch((err) => {
        console.warn("Could not read canvas, assuming empty:", err);
        if (active) setInitialData(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [canvasPath]);

  // LaTeX-style autoreplace inside Excalidraw's text-edit overlay.
  //
  // Excalidraw mounts a single <textarea data-type="wysiwyg"> when the user
  // enters text-edit mode and reads `.value` directly in its own oninput
  // handler — so a capture-phase document listener can mutate the textarea's
  // value before Excalidraw reads it, with no React-control gymnastics. This
  // mirrors the CodeMirror plugin in MarkdownEditor.tsx via the shared
  // tryAutoreplace helper in src/lib/symbols.ts.
  useEffect(() => {
    function onInput(e: Event) {
      if (!(e instanceof InputEvent)) return;
      if (!e.isTrusted || e.isComposing) return;
      const target = e.target;
      if (!(target instanceof HTMLTextAreaElement)) return;
      if (target.dataset.type !== "wysiwyg") return;

      const trigger = e.data;
      if (!trigger || trigger.length > 2) return;

      const cursor = target.selectionStart ?? target.value.length;
      const triggerStart = cursor - trigger.length;
      if (triggerStart < 1) return;

      const prefix = target.value.slice(
        Math.max(0, triggerStart - 32),
        triggerStart,
      );
      const match = tryAutoreplace(prefix, trigger);
      if (!match) return;

      const tokenStart = triggerStart - match.tokenLength;
      const newValue =
        target.value.slice(0, tokenStart) +
        match.glyph +
        target.value.slice(triggerStart);
      target.value = newValue;
      const newCursor = tokenStart + match.glyph.length + trigger.length;
      target.setSelectionRange(newCursor, newCursor);
    }

    document.addEventListener("input", onInput, true);
    return () => document.removeEventListener("input", onInput, true);
  }, []);

  const handleChange = useCallback(
    (elements: readonly any[], appState: any, files: any) => {
      const selectedIds = appState?.selectedElementIds ?? {};
      const hasAnySelection = Object.values(selectedIds).some(Boolean);
      setHasSelection(hasAnySelection);

      // Only process code blocks when selection changes to avoid infinite loops
      const selectedElementIds = Object.keys(selectedIds).filter((id) => selectedIds[id]);
      const currentSelectedId = selectedElementIds[0] || null;
      
      if (currentSelectedId !== prevSelectedIdRef.current) {
        prevSelectedIdRef.current = currentSelectedId;
        
        // Check if a text element with code is selected
        if (hasAnySelection && api) {
          const selectedElements = elements.filter((el: any) => selectedIds[el.id]);
          const selectedTextElement = selectedElements.find((el: any) => el.type === "text");
          if (selectedTextElement?.text) {
            const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/;
            const match = selectedTextElement.text.match(codeBlockRegex);
            if (match) {
              const language = match[1] || "plaintext";
              const code = match[2].trim();
              try {
                const highlighted = hljs.highlight(code, { language }).value;
                setSelectedCodeBlock({
                  id: selectedTextElement.id,
                  language,
                  code,
                  highlighted,
                });
              } catch {
                setSelectedCodeBlock({
                  id: selectedTextElement.id,
                  language: "plaintext",
                  code,
                  highlighted: hljs.highlight(code, { language: "plaintext" }).value,
                });
              }
            } else {
              setSelectedCodeBlock(null);
            }
          } else {
            setSelectedCodeBlock(null);
          }
        } else if (!hasAnySelection) {
          setSelectedCodeBlock(null);
        }
      }

      clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        const data = JSON.stringify({ elements, files });
        noteWrite(canvasPath, data).catch(console.error);
      }, 1000);
    },
    [canvasPath, api],
  );

  const handleDelete = useCallback(() => {
    if (!api) return;
    const elements = api.getSceneElements();
    const appState = api.getAppState();
    const selected = appState.selectedElementIds || {};
    const filtered = elements.filter((el: any) => !selected[el.id]);
    api.updateScene({
      elements: filtered,
      appState: { ...appState, selectedElementIds: {} },
    });
  }, [api]);

  const handleDuplicate = useCallback(() => {
    if (!api) return;
    const elements = api.getSceneElements();
    const appState = api.getAppState();
    const selected = appState.selectedElementIds || {};
    const newId = () =>
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
    const duplicates = elements
      .filter((el: any) => selected[el.id])
      .map((el: any) => ({
        ...el,
        id: newId(),
        x: el.x + 20,
        y: el.y + 20,
        seed: Math.floor(Math.random() * 2_000_000_000),
        versionNonce: Math.floor(Math.random() * 2_000_000_000),
      }));
    if (duplicates.length === 0) return;
    const newSelected: Record<string, boolean> = {};
    duplicates.forEach((el: any) => {
      newSelected[el.id] = true;
    });
    api.updateScene({
      elements: [...elements, ...duplicates],
      appState: { ...appState, selectedElementIds: newSelected },
    });
  }, [api]);

  const dispatchHistoryKey = useCallback((shift: boolean) => {
    const target =
      containerRef.current?.querySelector(".excalidraw") ?? document;
    const isMac =
      typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const ev = new KeyboardEvent("keydown", {
      key: "z",
      code: "KeyZ",
      ctrlKey: !isMac,
      metaKey: isMac,
      shiftKey: shift,
      bubbles: true,
      cancelable: true,
    });
    (target as EventTarget).dispatchEvent(ev);
  }, []);

  const handleUndo = useCallback(() => dispatchHistoryKey(false), [dispatchHistoryKey]);
  const handleRedo = useCallback(() => dispatchHistoryKey(true), [dispatchHistoryKey]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center text-[var(--tippani-muted)]">
        Loading canvas...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-hidden min-h-0 min-w-0 h-full w-full excalidraw-eraser-theme"
    >
      <StrokePanel api={api} />
      <Excalidraw
        excalidrawAPI={(apiRef: any) => setApi(apiRef)}
        theme={theme}
        initialData={initialData}
        onChange={handleChange}
        UIOptions={{
          canvasActions: {
            toggleTheme: false,
            loadScene: false,
            saveToActiveFile: false,
            export: false,
            saveAsImage: false,
            changeViewBackgroundColor: false,
            clearCanvas: false,
          },
          tools: {
            image: false,
          },
        }}
      >
        <DesktopActionsFooter
          api={api}
          visible={hasSelection}
          onMenu={onOpenMenu}
          onSymbols={onOpenSymbols}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onUndo={handleUndo}
          onRedo={handleRedo}
        />
      </Excalidraw>
      {selectedCodeBlock && (
        <CodePreview
          codeBlock={selectedCodeBlock}
          isDark={isDark}
          onClose={() => setSelectedCodeBlock(null)}
        />
      )}
    </div>
  );
}

function DesktopActionsFooter({
  api,
  visible,
  onMenu,
  onSymbols,
  onDuplicate,
  onDelete,
  onUndo,
  onRedo,
}: {
  api: any;
  visible: boolean;
  onMenu?: () => void;
  onSymbols?: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onUndo: () => void;
  onRedo: () => void;
}) {
  const device = useDevice();
  if (device.viewport.isMobile) return null;
  if (!visible) return null;

  const setTool = (type: string) => {
    if (api) {
      api.setActiveTool({ type });
    }
  };

  return (
    <Footer>
      <div className="tippani-canvas-actions" data-tippani-footer="canvas">
        <button
          type="button"
          onClick={() => onMenu?.()}
          aria-label="Menu"
          title="Open command palette (⌘K)"
        >
          <MenuIcon />
        </button>

        {onSymbols && (
          <button
            type="button"
            onClick={() => onSymbols()}
            aria-label="Symbols"
            title="Insert symbol (Ctrl+Shift+S)"
          >
            <SymbolIcon />
          </button>
        )}

        <div className="tippani-canvas-actions-divider" />
        <button
          type="button"
          onClick={() => setTool("selection")}
          aria-label="Selection"
          title="Selection (V)"
        >
          <SelectionIcon />
        </button>

        <div className="tippani-canvas-actions-divider" />
        <button
          type="button"
          onClick={onDuplicate}
          aria-label="Duplicate"
          title="Duplicate"
        >
          <DuplicateIcon />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete"
          title="Delete"
        >
          <DeleteIcon />
        </button>
        <div className="tippani-canvas-actions-history">
          <button
            type="button"
            onClick={onUndo}
            aria-label="Undo"
            title="Undo (Ctrl+Z)"
          >
            <UndoIcon />
          </button>
          <button
            type="button"
            onClick={onRedo}
            aria-label="Redo"
            title="Redo (Ctrl+Shift+Z)"
          >
            <RedoIcon />
          </button>
        </div>
      </div>
    </Footer>
  );
}

function MenuIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

function DuplicateIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g strokeWidth="1.25">
        <path d="M14.375 6.458H8.958a2.5 2.5 0 0 0-2.5 2.5v5.417a2.5 2.5 0 0 0 2.5 2.5h5.417a2.5 2.5 0 0 0 2.5-2.5V8.958a2.5 2.5 0 0 0-2.5-2.5Z" />
        <path
          clipRule="evenodd"
          d="M11.667 3.125c.517 0 .986.21 1.325.55.34.338.55.807.55 1.325v1.458H8.333c-.485 0-.927.185-1.26.487-.343.312-.57.75-.609 1.24l-.005 5.357H5a1.87 1.87 0 0 1-1.326-.55 1.87 1.87 0 0 1-.549-1.325V5c0-.518.21-.987.55-1.326.338-.34.807-.549 1.325-.549h6.667Z"
        />
      </g>
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        strokeWidth="1.25"
        d="M3.333 5.833h13.334M8.333 9.167v5M11.667 9.167v5M4.167 5.833l.833 10c0 .92.746 1.667 1.667 1.667h6.666c.92 0 1.667-.746 1.667-1.667l.833-10M7.5 5.833v-2.5c0-.46.373-.833.833-.833h3.334c.46 0 .833.373.833.833v2.5"
      />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d="M7.5 10.833 4.167 7.5 7.5 4.167M4.167 7.5h9.166a3.333 3.333 0 0 1 0 6.667H12.5"
        strokeWidth="1.25"
      />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d="M12.5 10.833 15.833 7.5 12.5 4.167M15.833 7.5H6.667a3.333 3.333 0 1 0 0 6.667H7.5"
        strokeWidth="1.25"
      />
    </svg>
  );
}

function SelectionIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function SymbolIcon() {
  // Greek lowercase pi — small enough to render as a button glyph.
  return (
    <span
      aria-hidden
      style={{
        fontSize: 18,
        lineHeight: 1,
        fontStyle: "italic",
        fontFamily: "serif",
      }}
    >
      π
    </span>
  );
}

function CodePreview({
  codeBlock,
  isDark,
  onClose,
}: {
  codeBlock: CodeBlock;
  isDark: boolean;
  onClose: () => void;
}) {
  return (
    <div className="absolute top-4 right-4 z-50 max-w-md w-[400px]">
      <div
        className={`rounded-lg border shadow-lg overflow-hidden ${
          isDark ? "border-[var(--tippani-border)] bg-[#0d1117]" : "border-[var(--tippani-border)] bg-white"
        }`}
      >
        <div
          className={`flex items-center justify-between px-3 py-2 border-b ${
            isDark ? "border-[var(--tippani-border)] bg-[#161b22]" : "border-[var(--tippani-border)] bg-[#f6f8fa]"
          }`}
        >
          <span className={`text-xs font-medium ${isDark ? "text-[#c9d1d9]" : "text-[#24292f]"}`}>
            {codeBlock.language}
          </span>
          <button
            type="button"
            onClick={onClose}
            className={`text-xs px-2 py-1 rounded hover:opacity-80 ${
              isDark ? "text-[#c9d1d9] hover:bg-[#21262d]" : "text-[#24292f] hover:bg-[#eaeef2]"
            }`}
          >
            Close
          </button>
        </div>
        <div className="max-h-[300px] overflow-auto">
          <pre className="p-3 text-xs leading-relaxed">
            <code
              className={`hljs ${isDark ? "github-dark" : "github"}`}
              dangerouslySetInnerHTML={{ __html: codeBlock.highlighted }}
            />
          </pre>
        </div>
      </div>
    </div>
  );
}
