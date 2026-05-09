import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { githubLight } from "@uiw/codemirror-theme-github";
import { Compartment } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useResolvedTheme } from "../../hooks/useResolvedTheme";
import { useSettings } from "../../stores/settings";
import { warmDark } from "./warmDarkTheme";
import { tryAutoreplace } from "../../lib/symbols";
import { useActiveEditor } from "../../stores/activeEditor";

type Props = {
  value: string;
  onChange: (next: string) => void;
};

function fontTheme(family: string, size: number) {
  return EditorView.theme({
    "&": { fontSize: `${size}px` },
    ".cm-content": { fontFamily: family },
    ".cm-gutters": { fontFamily: family },
  });
}

// LaTeX-style symbol autoreplace.
//
// When the user types a terminator (space, tab, `\`, or any non-word char) right
// after a `\<name>` token, replace the `\<name>` with the corresponding Unicode
// glyph. The terminator stays in the document. Skipped inside fenced code blocks
// and inline `code` so prose code samples aren't mangled.

function isInsideCodeBlock(view: EditorView, pos: number): boolean {
  // Heuristic: count fence markers from document start; odd → inside a fenced
  // block. Inline code: count backticks on the current line up to pos. Cheap
  // and correct for prose-with-code; no syntax tree dependency.
  const text = view.state.doc.toString().slice(0, pos);
  let inFence = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^```/.test(line)) inFence = !inFence;
  }
  if (inFence) return true;
  const line = view.state.doc.lineAt(pos);
  const prefix = view.state.doc.sliceString(line.from, pos);
  const ticks = (prefix.match(/`/g) ?? []).length;
  return ticks % 2 === 1;
}

const latexAutoreplace = EditorView.updateListener.of((update) => {
  if (!update.docChanged) return;
  let replacement: { from: number; to: number; insert: string } | null = null;

  update.changes.iterChanges((_fromA, _toA, fromB, _toB, inserted) => {
    if (replacement) return; // only process the first matching change
    const trigger = inserted.toString();
    if (!trigger || trigger.length > 2) return;
    const lookback = update.state.doc.sliceString(
      Math.max(0, fromB - 32),
      fromB,
    );
    const match = tryAutoreplace(lookback, trigger);
    if (!match) return;
    const tokenStart = fromB - match.tokenLength;
    if (isInsideCodeBlock(update.view, tokenStart)) return;
    replacement = {
      from: tokenStart,
      to: fromB,
      insert: match.glyph,
    };
  });

  if (replacement) {
    // Defer to avoid mutating state inside the update listener directly.
    queueMicrotask(() => {
      update.view.dispatch({
        changes: replacement!,
      });
    });
  }
});

export function MarkdownEditor({ value, onChange }: Props) {
  const resolved = useResolvedTheme();
  const isDark = resolved === "dark";
  const fontFamily = useSettings((s) => s.editorFontFamily);
  const fontSize = useSettings((s) => s.editorFontSize);

  // Stable Compartment instance — survives across re-renders so we can
  // reconfigure the font extension without remounting the editor (which
  // would lose the cursor position).
  const fontCompartment = useMemo(() => new Compartment(), []);
  const editorRef = useRef<EditorView | null>(null);

  const extensions = useMemo(
    () => [
      markdown({ codeLanguages: languages }),
      EditorView.lineWrapping,
      latexAutoreplace,
      fontCompartment.of(fontTheme(fontFamily, fontSize)),
    ],
    // Initial extensions only — subsequent font changes go through dispatch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fontCompartment],
  );

  useEffect(() => {
    const view = editorRef.current;
    if (!view) return;
    view.dispatch({
      effects: fontCompartment.reconfigure(fontTheme(fontFamily, fontSize)),
    });
  }, [fontFamily, fontSize, fontCompartment]);

  const handleCreateEditor = useCallback((view: EditorView) => {
    editorRef.current = view;
    useActiveEditor.getState().setView(view);
  }, []);

  useEffect(() => {
    return () => {
      // Clear the global ref if it still points to this view.
      const current = useActiveEditor.getState().view;
      if (current === editorRef.current) {
        useActiveEditor.getState().setView(null);
      }
    };
  }, []);

  return (
    <div className="h-full w-full overflow-hidden">
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={extensions}
        theme={isDark ? warmDark : githubLight}
        onCreateEditor={handleCreateEditor}
        height="100%"
        style={{ height: "100%" }}
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
          highlightActiveLine: false,
          highlightSelectionMatches: false,
        }}
      />
    </div>
  );
}
