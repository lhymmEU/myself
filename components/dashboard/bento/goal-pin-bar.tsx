"use client";

import { useWishlist } from "@/lib/swr/hooks";
import { cn } from "@/lib/utils";
import { Pin, PinOff } from "lucide-react";
import { hueForGoal } from "./visual";

interface Wish {
  id: string;
  name: string;
  targetLevel: string;
  priority: string;
}

interface Props {
  activeGoalId: string | null;
  onPin: (goalId: string | null) => void;
}

export function GoalPinBar({ activeGoalId, onPin }: Props) {
  const { data } = useWishlist();
  const wishes: Wish[] = data?.wishes ?? [];

  if (wishes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        Set goals in <span className="font-medium text-foreground">Plans</span>{" "}
        or your wishlist to organise the bento around them.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs uppercase tracking-wider text-muted-foreground mr-1">
        Goals
      </span>
      {wishes.map((wish) => {
        const isActive = activeGoalId === wish.id;
        const hue = hueForGoal(wish.id);
        return (
          <button
            key={wish.id}
            type="button"
            onClick={() => onPin(isActive ? null : wish.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
              isActive
                ? "border-foreground/40 bg-foreground/5"
                : "border-border bg-background hover:bg-muted/40",
            )}
            style={
              {
                ["--card-hue" as string]: `${hue}`,
              } as React.CSSProperties
            }
          >
            <span
              aria-hidden
              className="h-2 w-2 rounded-full"
              style={{
                background: `oklch(0.65 0.16 var(--card-hue))`,
              }}
            />
            <span className="truncate max-w-[14ch]">{wish.name}</span>
            {isActive ? (
              <PinOff className="h-3 w-3 text-muted-foreground" />
            ) : (
              <Pin className="h-3 w-3 text-muted-foreground/60" />
            )}
          </button>
        );
      })}
      {activeGoalId && (
        <button
          type="button"
          onClick={() => onPin(null)}
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          Clear pin
        </button>
      )}
    </div>
  );
}
