"use client";

import type { ClawCard } from "@/lib/claw/messages";
import { KeyValueCard } from "./cards/key-value";
import { ListCard } from "./cards/list";
import { CodeCard } from "./cards/code";
import { AlertCard } from "./cards/alert";
import { SuggestionsCard } from "./cards/suggestions";

interface Props {
  card: ClawCard;
  onSuggestion?: (prompt: string) => void;
}

export function CardRenderer({ card, onSuggestion }: Props) {
  switch (card.kind) {
    case "key-value":
      return <KeyValueCard title={card.title} items={card.items} />;
    case "list":
      return <ListCard title={card.title} items={card.items} />;
    case "code":
      return <CodeCard language={card.language} code={card.code} />;
    case "alert":
      return <AlertCard level={card.level} message={card.message} />;
    case "suggestions":
      return (
        <SuggestionsCard prompts={card.prompts} onSelect={onSuggestion} />
      );
    default: {
      // exhaustiveness check
      const _never: never = card;
      void _never;
      return null;
    }
  }
}
