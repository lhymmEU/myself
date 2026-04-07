"use client";

import { useRef, useState, useCallback } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import {
  type Block,
  BlockNoteSchema,
  defaultBlockSpecs,
} from "@blocknote/core";
import { useT } from "@/lib/i18n/context";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";

const schema = BlockNoteSchema.create({
  blockSpecs: defaultBlockSpecs,
});

interface EditorProps {
  content: Block[] | null;
  onChange: (content: Block[]) => void;
}

export function Editor({ content, onChange }: EditorProps) {
  const t = useT();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedCharCount, setSelectedCharCount] = useState(0);

  const editor = useCreateBlockNote({
    schema,
    initialContent:
      content && Array.isArray(content) && content.length > 0
        ? (content as (typeof schema.Block)[])
        : undefined,
  });

  const handleChange = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange(editor.document as unknown as Block[]);
    }, 1000);
  }, [onChange, editor]);

  const handleSelectionChange = useCallback(() => {
    const text = editor.getSelectedText();
    setSelectedCharCount(text.length);
  }, [editor]);

  return (
    <div className="relative">
      <BlockNoteView
        editor={editor}
        onChange={handleChange}
        onSelectionChange={handleSelectionChange}
        theme="dark"
        className="bn-seamless"
      />
      {selectedCharCount > 0 && (
        <div className="fixed bottom-6 right-6 z-50 px-3 py-1.5 rounded-full bg-muted/90 border border-border/60 shadow-lg backdrop-blur-sm text-xs text-muted-foreground tabular-nums animate-in fade-in slide-in-from-bottom-2 duration-200">
          {selectedCharCount} {t("plans.charsSelected")}
        </div>
      )}
    </div>
  );
}
