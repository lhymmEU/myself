interface Props {
  title?: string;
  items: Array<{ key: string; value: string }>;
}

export function KeyValueCard({ title, items }: Props) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      {title && (
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
      )}
      <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-sm">
        {items.map((item, i) => (
          <div key={i} className="contents">
            <dt className="font-medium text-muted-foreground">{item.key}</dt>
            <dd className="break-words">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
