"use client";

import { Code } from "lucide-react";
import type { UISpecData } from "@/lib/claw-ai/parts";

interface UISpecPartProps {
  data: UISpecData;
}

/**
 * Legacy fallback for `[UI_SPEC]` shapes streamed by older agents
 * before the typed `[CARD type=...]` protocol existed. We no longer
 * carry the `@json-render/react` runtime; instead, this component
 * surfaces a friendly "structured response" pill with the raw spec
 * available behind a `<details>` disclosure for debugging.
 *
 * In practice every agent on the typed protocol emits a typed
 * `data-*` part instead, so users only hit this code path when
 * replaying very old transcripts or talking to a stale agent build.
 */
export function UISpecPart({ data }: UISpecPartProps) {
  if (!data?.spec) return null;

  return (
    <details className="rounded-xl border bg-card p-3 text-sm">
      <summary className="flex cursor-pointer items-center gap-1.5 text-muted-foreground select-none">
        <Code className="h-3.5 w-3.5" />
        <span>Structured response</span>
      </summary>
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-[11px] text-muted-foreground">
        {JSON.stringify(data.spec, null, 2)}
      </pre>
    </details>
  );
}
