interface Props {
  quote: string;
  source?: { title?: string; url?: string };
}

export function CitationCard({ quote, source }: Props) {
  const label = source?.title || source?.url;
  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <blockquote className="border-l-2 border-primary pl-3 text-sm italic text-foreground">
        {quote}
      </blockquote>
      {label && (
        <p className="text-xs text-muted-foreground">
          {source?.url ? (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {label}
            </a>
          ) : (
            <span className="font-medium">{label}</span>
          )}
        </p>
      )}
    </div>
  );
}
