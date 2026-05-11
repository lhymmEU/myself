import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title?: string;
  items: Array<{ label: string; done?: boolean }>;
  /** When set, step checkboxes toggle completion (e.g. wishlist plan). */
  onToggleStep?: (index: number, nextDone: boolean) => void;
}

export function StepsCard({ title, items, onToggleStep }: Props) {
  const interactive = typeof onToggleStep === "function";
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
                <button
                  type="button"
                  disabled={!interactive}
                  onClick={() =>
                    interactive && onToggleStep(i, !item.done)
                  }
                  className={cn(
                    "mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                    item.done
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/40",
                    interactive &&
                      "cursor-pointer hover:border-primary/60 hover:bg-primary/10",
                    !interactive && "cursor-default",
                  )}
                  aria-pressed={item.done}
                  aria-label={item.done ? "Mark step not done" : "Mark step done"}
                >
                  {item.done ? (
                    <Check className="h-3 w-3" />
                  ) : null}
                </button>
              )}
              <span>{item.label}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
