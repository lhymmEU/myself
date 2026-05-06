import { Card } from "@/components/ui/card";

const MAX_CELL = 200;

function truncateCell(value: string): string {
  if (value.length <= MAX_CELL) return value;
  return `${value.slice(0, MAX_CELL)}…`;
}

interface Props {
  title?: string;
  columns: string[];
  rows: string[][];
}

export function TableCard({ title, columns, rows }: Props) {
  const cols = columns.length > 0 ? columns : [];
  if (cols.length === 0) {
    return (
      <Card className="p-3 text-sm text-muted-foreground">
        {title ? `${title} — ` : ""}No columns
      </Card>
    );
  }
  return (
    <Card className="overflow-hidden p-0">
      {title && (
        <div className="border-b bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[12rem] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              {cols.map((col, i) => (
                <th
                  key={i}
                  className="px-3 py-2 text-left font-medium text-muted-foreground"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-border last:border-0">
                {cols.map((_, ci) => (
                  <td key={ci} className="px-3 py-2 align-top break-words">
                    {truncateCell(String(row[ci] ?? ""))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
