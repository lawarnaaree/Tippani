import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { githubLight } from "@uiw/codemirror-theme-github";
import { useMemo } from "react";
import { useResolvedTheme } from "../../hooks/useResolvedTheme";
import { warmDark } from "./warmDarkTheme";

type Props = {
  value: string;
  onChange: (next: string) => void;
};

export function MarkdownEditor({ value, onChange }: Props) {
  const resolved = useResolvedTheme();
  const isDark = resolved === "dark";
  const extensions = useMemo(
    () => [markdown({ codeLanguages: languages })],
    [],
  );

  return (
    <div className="h-full w-full overflow-hidden">
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={extensions}
        theme={isDark ? warmDark : githubLight}
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
