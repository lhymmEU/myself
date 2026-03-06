"use client";

import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: "json" | "markdown";
  minHeight?: string;
  readOnly?: boolean;
  className?: string;
}

const baseTheme = EditorView.theme({
  "&": {
    fontSize: "12px",
    borderRadius: "0.375rem",
    border: "1px solid hsl(var(--border))",
    backgroundColor: "hsl(var(--muted) / 0.3)",
  },
  "&.cm-focused": {
    outline: "none",
    borderColor: "hsl(var(--ring))",
  },
  ".cm-scroller": {
    fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    borderRight: "1px solid hsl(var(--border))",
  },
});

export function CodeEditor({
  value,
  onChange,
  language = "json",
  minHeight = "500px",
  readOnly = false,
  className,
}: CodeEditorProps) {
  const extensions = useMemo(() => {
    const ext = [baseTheme];
    if (language === "json") ext.push(json());
    else if (language === "markdown") ext.push(markdown());
    return ext;
  }, [language]);

  return (
    <div className={className}>
      <CodeMirror
        value={value}
        onChange={onChange}
        theme={oneDark}
        extensions={extensions}
        readOnly={readOnly}
        minHeight={minHeight}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: true,
          bracketMatching: true,
          autocompletion: false,
        }}
      />
    </div>
  );
}
