"use client";

import type { ClawCard } from "@/lib/claw/messages";
import { KeyValueCard } from "./cards/key-value";
import { ListCard } from "./cards/list";
import { TableCard } from "./cards/table";
import { StepsCard } from "./cards/steps";
import { CitationCard } from "./cards/citation";
import { ChoicesCard } from "./cards/choices";
import { CodeCard } from "./cards/code";
import { AlertCard } from "./cards/alert";
import { SuggestionsCard } from "./cards/suggestions";

interface Props {
  card: ClawCard;
  onChoose?: (text: string) => void;
  onToggleStep?: (index: number, nextDone: boolean) => void;
}

export function CardRenderer({ card, onChoose, onToggleStep }: Props) {
  switch (card.kind) {
    case "key-value":
      return <KeyValueCard title={card.title} items={card.items} />;
    case "list":
      return <ListCard title={card.title} items={card.items} />;
    case "table":
      return (
        <TableCard title={card.title} columns={card.columns} rows={card.rows} />
      );
    case "steps":
      return (
        <StepsCard
          title={card.title}
          items={card.items}
          onToggleStep={onToggleStep}
        />
      );
    case "citation":
      return (
        <CitationCard quote={card.quote} source={card.source} />
      );
    case "choices":
      return (
        <ChoicesCard
          question={card.question}
          options={card.options}
          allowCustom={card.allowCustom}
          onChoose={onChoose}
        />
      );
    case "code":
      return <CodeCard language={card.language} code={card.code} />;
    case "alert":
      return <AlertCard level={card.level} message={card.message} />;
    case "suggestions":
      return (
        <SuggestionsCard prompts={card.prompts} onSelect={onChoose} />
      );
    default: {
      // exhaustiveness check
      const _never: never = card;
      void _never;
      return null;
    }
  }
}
