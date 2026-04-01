"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Shell } from "lucide-react";
import { useT } from "@/lib/i18n/context";

interface AskClawButtonProps {
  moduleName: string;
  contextData?: Record<string, unknown>;
  className?: string;
}

export function AskClawButton({ moduleName, contextData, className }: AskClawButtonProps) {
  const router = useRouter();
  const t = useT();

  const handleClick = () => {
    const dataSnippet = contextData
      ? JSON.stringify(contextData, null, 0).slice(0, 2000)
      : "";

    const prompt = encodeURIComponent(
      `Explain the following ${moduleName} data in simple terms. Help me understand what these numbers mean, their significance for personal finance decisions, and the key financial concepts involved.${dataSnippet ? `\n\nData:\n${dataSnippet}` : ""}`,
    );

    router.push(`/dashboard/claw?askClaw=${prompt}`);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className={`h-6 w-6 p-0 ${className ?? ""}`}
      onClick={handleClick}
      title={t("finance.askClaw.tooltip")}
    >
      <Shell className="h-3.5 w-3.5" />
    </Button>
  );
}
