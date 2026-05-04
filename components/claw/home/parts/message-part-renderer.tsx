"use client";

import type { ClawUIMessage } from "@/lib/claw-ai/parts";
import type { AbilityItem, RoutineItem, TodoItem } from "@/lib/claw-ai/parts";
import { TextPart } from "./text-part";
import { StatusPart } from "./status-part";
import { TodosPart } from "./todos-part";
import { RoutinesPart } from "./routines-part";
import { MemoryPart } from "./memory-part";
import { AbilitiesPart } from "./abilities-part";
import { ApprovalPart } from "./approval-part";
import { FormPart } from "./form-part";
import { ErrorPart } from "./error-part";
import { UISpecPart } from "./ui-spec-part";

type ClawPart = ClawUIMessage["parts"][number];

export interface MessagePartHandlers {
  onApproveTool?: (id: string) => void;
  onRejectTool?: (id: string) => void;
  onSubmitForm?: (formId: string, values: Record<string, unknown>) => Promise<void> | void;
  onCancelForm?: (formId: string) => void;
  onToggleTodo?: (todo: TodoItem, next: boolean) => void;
  onToggleRoutine?: (routine: RoutineItem, next: boolean) => void;
  onDeleteRoutine?: (routine: RoutineItem) => void;
  onAddRoutine?: () => void;
  onRunAbility?: (ability: AbilityItem) => void;
  onDismissError?: () => void;
  onRetry?: () => void;
}

interface MessagePartRendererProps {
  part: ClawPart;
  handlers?: MessagePartHandlers;
  /** Hide bubble chrome on text parts (e.g. when used inside a card). */
  noBubble?: boolean;
}

/**
 * Single dispatcher for any AI SDK message part the Claw stream can
 * produce. Delegates to a dedicated renderer so home cards and the
 * inline thread share rendering logic verbatim.
 */
export function MessagePartRenderer({
  part,
  handlers,
  noBubble,
}: MessagePartRendererProps) {
  if (part.type === "text") {
    return <TextPart text={part.text} bubble={!noBubble} />;
  }

  if (part.type === "data-status") {
    return <StatusPart data={part.data} />;
  }
  if (part.type === "data-todos") {
    return (
      <TodosPart
        data={part.data}
        onToggle={handlers?.onToggleTodo}
      />
    );
  }
  if (part.type === "data-routines") {
    return (
      <RoutinesPart
        data={part.data}
        onToggle={handlers?.onToggleRoutine}
        onDelete={handlers?.onDeleteRoutine}
        onAdd={handlers?.onAddRoutine}
      />
    );
  }
  if (part.type === "data-memory") {
    return <MemoryPart data={part.data} />;
  }
  if (part.type === "data-abilities") {
    return <AbilitiesPart data={part.data} onRun={handlers?.onRunAbility} />;
  }
  if (part.type === "data-approval") {
    return (
      <ApprovalPart
        data={part.data}
        onApprove={
          handlers?.onApproveTool
            ? () => handlers.onApproveTool?.(part.data.id)
            : undefined
        }
        onReject={
          handlers?.onRejectTool
            ? () => handlers.onRejectTool?.(part.data.id)
            : undefined
        }
      />
    );
  }
  if (part.type === "data-form") {
    return (
      <FormPart
        data={part.data}
        onSubmit={
          handlers?.onSubmitForm
            ? (values) => handlers.onSubmitForm?.(part.data.id, values)
            : undefined
        }
        onCancel={
          handlers?.onCancelForm
            ? () => handlers.onCancelForm?.(part.data.id)
            : undefined
        }
      />
    );
  }
  if (part.type === "data-error") {
    return (
      <ErrorPart
        data={part.data}
        onRetry={handlers?.onRetry}
        onDismiss={handlers?.onDismissError}
      />
    );
  }
  if (part.type === "data-uiSpec") {
    return <UISpecPart data={part.data} />;
  }

  return null;
}
