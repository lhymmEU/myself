"use client";

import { useT } from "@/lib/i18n/context";
import type { ConversationState } from "./types";

interface SpotlightPillsProps {
  conversationState: ConversationState;
  onInsert: (text: string) => void;
  disabled: boolean;
}

const PILL_STYLE =
  "rounded-full border border-border bg-background px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

interface PillDef {
  labelKey: string;
  text: string;
}

const PILLS_BY_STATE: Record<string, PillDef[]> = {
  idle: [
    { labelKey: "claw.dm.shelf.giveTask", text: "Give my agent a task" },
    { labelKey: "claw.dm.shelf.whatCanYouDo", text: "What can you do?" },
    { labelKey: "claw.dm.shelf.howAreYou", text: "How are you doing?" },
  ],
  "task-running": [
    { labelKey: "claw.dm.shelf.checkProgress", text: "Check progress on the current task" },
    { labelKey: "claw.dm.shelf.stopTask", text: "Stop the current task" },
  ],
  error: [
    { labelKey: "claw.dm.shelf.whatWentWrong", text: "What went wrong?" },
    { labelKey: "claw.dm.shelf.tryAgain", text: "Try again" },
  ],
};

export function SpotlightPills({
  conversationState,
  onInsert,
  disabled,
}: SpotlightPillsProps) {
  const t = useT();
  const pills = PILLS_BY_STATE[conversationState];

  if (!pills || conversationState === "agent-typing" || conversationState === "sending") {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {pills.map((pill) => (
        <button
          key={pill.labelKey}
          type="button"
          className={PILL_STYLE}
          onClick={() => onInsert(pill.text)}
          disabled={disabled}
        >
          {t(pill.labelKey as Parameters<typeof t>[0])}
        </button>
      ))}
    </div>
  );
}
