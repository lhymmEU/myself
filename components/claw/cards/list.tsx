interface Props {
  title?: string;
  items: string[];
}

export function ListCard({ title, items }: Props) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      {title && (
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
      )}
      <ul className="list-disc pl-5 space-y-1 text-sm">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
