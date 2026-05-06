import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title?: string;
  items: Array<{ label: string; done?: boolean }>;
}

export function StepsCard({ title, items }: Props) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      {title && (
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
      )}
      <ol className="list-decimal space-y-2 pl-5 text-sm">
        {items.map((item, i) => (
          <li
            key={i}
            className={cn(
              "pl-1",
              item.done === true && "text-muted-foreground",
            )}
          >
            <span className="inline-flex items-start gap-2">
              {typeof item.done === "boolean" && (
                <span
                  className={cn(
                    "mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                    item.done
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/40",
                  )}
                  aria-hidden
                >
                  {item.done ? (
                    <Check className="h-3 w-3" />
                  ) : null}
                </span>
              )}
              <span>{item.label}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
