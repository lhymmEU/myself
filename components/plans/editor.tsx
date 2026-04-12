"use client";

import { useRef, useState, useCallback } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import {
  type Block,
  BlockNoteSchema,
  defaultBlockSpecs,
} from "@blocknote/core";
import { SelectionActions } from "@/components/plans/claw/selection-actions";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";

const schema = BlockNoteSchema.create({
  blockSpecs: defaultBlockSpecs,
});

interface EditorProps {
  content: Block[] | null;
  onChange: (content: Block[]) => void;
  clawConnected?: boolean;
  onTranslate?: (text: string) => void;
  onExplain?: (text: string) => void;
}

export function Editor({
  content,
  onChange,
  clawConnected = false,
  onTranslate,
  onExplain,
}: EditorProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedText, setSelectedText] = useState("");

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
    setSelectedText(editor.getSelectedText());
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
      <SelectionActions
        charCount={selectedText.length}
        selectedText={selectedText}
        clawConnected={clawConnected}
        onTranslate={onTranslate ?? (() => {})}
        onExplain={onExplain ?? (() => {})}
      />
    </div>
  );
}
