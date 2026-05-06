"use client";

import {
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import {
  type Block,
  type BlockNoteEditor,
  BlockNoteSchema,
  defaultBlockSpecs,
} from "@blocknote/core";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";

const schema = BlockNoteSchema.create({
  blockSpecs: defaultBlockSpecs,
});

export interface EditorHandle {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getEditor: () => BlockNoteEditor<any, any, any>;
}

interface EditorProps {
  content: Block[] | null;
  onChange: (content: Block[]) => void;
}

export const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  { content, onChange },
  ref
) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useCreateBlockNote({
    schema,
    initialContent:
      content && Array.isArray(content) && content.length > 0
        ? (content as (typeof schema.Block)[])
        : undefined,
  });

  useImperativeHandle(ref, () => ({ getEditor: () => editor }), [editor]);

  const handleChange = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange(editor.document as unknown as Block[]);
    }, 1000);
  }, [onChange, editor]);

  return (
    <div className="relative">
      <BlockNoteView
        editor={editor}
        onChange={handleChange}
        theme="dark"
        className="bn-seamless"
      />
    </div>
  );
});
