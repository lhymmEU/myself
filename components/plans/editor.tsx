"use client";

import { useRef, useCallback } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import type { Block } from "@blocknote/core";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";

interface EditorProps {
  content: Block[] | null;
  onChange: (content: Block[]) => void;
}

export function Editor({ content, onChange }: EditorProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange(editor.document as Block[]);
    }, 1000);
  }, [onChange]);

  const editor = useCreateBlockNote({
    initialContent:
      content && Array.isArray(content) && content.length > 0
        ? content
        : undefined,
  });

  return (
    <div className="flex-1 min-h-0 [&_.bn-container]:h-full [&_.bn-editor]:min-h-full">
      <BlockNoteView
        editor={editor}
        onChange={handleChange}
        theme="light"
      />
    </div>
  );
}
