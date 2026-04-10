"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot } from "lucide-react";
import type { Message } from "./types";

interface MarkdownResponseProps {
  message: Message;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const CARD_BORDER: Record<string, string> = {
  status: "border-emerald-500/30",
  task: "border-blue-500/30",
  memory: "border-purple-500/30",
  skills: "border-cyan-500/30",
  error: "border-amber-500/30",
};

const MemoizedMarkdown = memo(function MemoizedMarkdown({
  content,
}: {
  content: string;
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        table: ({ children }) => (
          <div className="my-2 overflow-x-auto rounded-md border">
            <table className="w-full text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="border-b bg-muted/50">{children}</thead>
        ),
        tbody: ({ children }) => (
          <tbody className="divide-y">{children}</tbody>
        ),
        tr: ({ children }) => (
          <tr className="transition-colors hover:bg-muted/30">{children}</tr>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2 text-left font-medium text-muted-foreground">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2">{children}</td>
        ),
        h1: ({ children }) => (
          <h1 className="text-lg font-semibold mt-3 mb-1.5">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-semibold mt-3 mb-1.5">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-sm font-medium mt-2 mb-1">{children}</h4>
        ),
        p: ({ children }) => (
          <p className="my-1.5 leading-relaxed">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="my-1.5 ml-4 list-disc space-y-0.5">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-1.5 ml-4 list-decimal space-y-0.5">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        code: ({ className, children, ...props }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                {children}
              </code>
            );
          }
          return (
            <code
              className="block my-2 rounded-md bg-muted p-3 text-xs font-mono overflow-x-auto whitespace-pre"
              {...props}
            >
              {children}
            </code>
          );
        },
        pre: ({ children }) => <>{children}</>,
        blockquote: ({ children }) => (
          <blockquote className="my-2 border-l-2 border-muted-foreground/30 pl-3 text-muted-foreground italic">
            {children}
          </blockquote>
        ),
        hr: () => <hr className="my-3 border-border" />,
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:text-primary/80"
          >
            {children}
          </a>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold">{children}</strong>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
});

export function MarkdownResponse({ message }: MarkdownResponseProps) {
  const borderClass =
    CARD_BORDER[message.responseType ?? ""] ?? "border-border";

  return (
    <div className="flex gap-2.5 min-w-0">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div
        className={`max-w-[80%] rounded-2xl rounded-tl-md border ${borderClass} bg-muted/50 px-4 py-2.5 text-sm min-w-0 max-h-[60vh] overflow-y-auto overflow-x-hidden`}
      >
        <MemoizedMarkdown content={message.content} />
        <p className="mt-2 text-[10px] text-muted-foreground">
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}
