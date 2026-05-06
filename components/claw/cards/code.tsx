interface Props {
  language?: string;
  code: string;
}

export function CodeCard({ language, code }: Props) {
  return (
    <div className="rounded-lg border bg-muted/40 overflow-hidden">
      {language && (
        <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground border-b">
          {language}
        </div>
      )}
      <pre className="overflow-x-auto p-3 text-xs font-mono leading-relaxed whitespace-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}
