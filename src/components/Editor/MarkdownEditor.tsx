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
