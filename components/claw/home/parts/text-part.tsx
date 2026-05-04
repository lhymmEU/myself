"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface TextPartProps {
  text: string;
  /** When true, renders into the assistant's bubble. Defaults true. */
  bubble?: boolean;
}

const MARKDOWN_HINTS = [
  /\|.+\|.+\|/,
  /^#{1,4}\s+/m,
  /^```/m,
  /^[-*]\s+/m,
  /^\d+\.\s+/m,
  /\*\*.+\*\*/,
  /\[.+\]\(.+\)/,
  /^>\s+/m,
];

function looksLikeMarkdown(text: string): boolean {
  return MARKDOWN_HINTS.some((p) => p.test(text));
}

/**
 * Renders an assistant text part. Falls back to a `<p>` for plain
 * snippets so we don't pay the markdown parser cost on every chunk;
 * structured replies pass through `react-markdown` (already a project
 * dependency) for tables, lists, and code formatting.
 */
export function TextPart({ text, bubble = true }: TextPartProps) {
  const isMd = looksLikeMarkdown(text);
  const inner = isMd ? (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: (props) => (
          <a
            {...props}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          />
        ),
        code: ({ children, ...rest }) => (
          <code
            {...rest}
            className="rounded bg-muted px-1 py-0.5 text-[0.85em] font-mono"
          >
            {children}
          </code>
        ),
        pre: ({ children, ...rest }) => (
          <pre
            {...rest}
            className="overflow-x-auto rounded-md bg-muted p-3 text-[0.85em]"
          >
            {children}
          </pre>
        ),
        table: ({ children, ...rest }) => (
          <div className="overflow-x-auto">
            <table
              {...rest}
              className="my-2 w-full border-collapse text-left text-[0.9em]"
            >
              {children}
            </table>
          </div>
        ),
        th: (props) => (
          <th {...props} className="border-b px-2 py-1 font-semibold" />
        ),
        td: (props) => <td {...props} className="border-b px-2 py-1" />,
      }}
    >
      {text}
    </ReactMarkdown>
  ) : (
    <p className="whitespace-pre-wrap break-words">{text}</p>
  );

  if (!bubble) return <div className="text-sm leading-relaxed">{inner}</div>;
  return (
    <div className="rounded-2xl rounded-tl-md bg-muted px-4 py-2.5 text-sm leading-relaxed text-foreground">
      {inner}
    </div>
  );
}
