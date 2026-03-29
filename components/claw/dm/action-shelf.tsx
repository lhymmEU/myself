"use client";

import { useState } from "react";
import type { ConversationState } from "./types";
import { SpotlightPills } from "./spotlight-pills";
import { CategoryChips } from "./category-chips";
import { PillGroup } from "./pill-group";

interface ActionShelfProps {
  conversationState: ConversationState;
  onInsert: (text: string) => void;
  disabled: boolean;
}

export function ActionShelf({
  conversationState,
  onInsert,
  disabled,
}: ActionShelfProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const showCategories =
    conversationState === "idle" || conversationState === "error";

  return (
    <div className="space-y-2">
      <SpotlightPills
        conversationState={conversationState}
        onInsert={onInsert}
        disabled={disabled}
      />

      {showCategories && (
        <>
          <CategoryChips
            activeCategory={activeCategory}
            onSelect={setActiveCategory}
            disabled={disabled}
          />

          {activeCategory && (
            <PillGroup
              categoryId={activeCategory}
              onInsert={onInsert}
              disabled={disabled}
            />
          )}
        </>
      )}
    </div>
  );
}
