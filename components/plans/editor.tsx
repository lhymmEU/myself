"use client";

import { useRef, useCallback } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import {
  type Block,
  BlockNoteSchema,
  defaultBlockSpecs,
} from "@blocknote/core";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { numberedListItem: _, ...bulletOnlySpecs } = defaultBlockSpecs;

const schema = BlockNoteSchema.create({
  blockSpecs: bulletOnlySpecs,
});

interface EditorProps {
  content: Block[] | null;
  onChange: (content: Block[]) => void;
}

export function Editor({ content, onChange }: EditorProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  return (
    <BlockNoteView
      editor={editor}
      onChange={handleChange}
      theme="dark"
      className="bn-seamless"
    />
  );
}
