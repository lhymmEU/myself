"use client";

import { Bot, Activity, CheckCircle2, Brain, Wrench, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Message } from "./types";

interface ResponseCardProps {
  message: Message;
}

const JARGON: Record<string, string> = {
  gateway: "The service that connects your agent to the internet",
  channel: "A way your agent connects to external services like Slack or email",
  session: "A conversation thread with your agent",
  skill: "A capability or tool your agent has learned",
  memory: "Information your agent has stored for later recall",
};

function JargonTerm({
  term,
  children,
}: {
  term: string;
  children: React.ReactNode;
}) {
  const explanation = JARGON[term.toLowerCase()];
  if (!explanation) return <>{children}</>;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="underline decoration-dotted decoration-muted-foreground/50 cursor-help">
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-xs">
          {explanation}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function replaceJargon(text: string): React.ReactNode[] {
  const pattern = new RegExp(
    `\\b(${Object.keys(JARGON).join("|")})\\b`,
    "gi",
  );
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <JargonTerm key={match.index} term={match[0]}>
        {match[0]}
      </JargonTerm>,
    );
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

const CARD_STYLES: Record<
  string,
  { icon: React.ReactNode; border: string; bg: string }
> = {
  status: {
    icon: <Activity className="h-4 w-4 text-emerald-500" />,
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/5",
  },
  task: {
    icon: <CheckCircle2 className="h-4 w-4 text-blue-500" />,
    border: "border-blue-500/30",
    bg: "bg-blue-500/5",
  },
  memory: {
    icon: <Brain className="h-4 w-4 text-purple-500" />,
    border: "border-purple-500/30",
    bg: "bg-purple-500/5",
  },
  skills: {
    icon: <Wrench className="h-4 w-4 text-cyan-500" />,
    border: "border-cyan-500/30",
    bg: "bg-cyan-500/5",
  },
  error: {
    icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    border: "border-amber-500/30",
    bg: "bg-amber-500/5",
  },
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ResponseCard({ message }: ResponseCardProps) {
  const style = CARD_STYLES[message.responseType ?? ""] ?? {
    icon: <Bot className="h-4 w-4 text-muted-foreground" />,
    border: "border-border",
    bg: "",
  };

  return (
    <div className="flex gap-2.5 min-w-0">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <Card
        className={`max-w-[80%] min-w-0 border ${style.border} ${style.bg} shadow-none max-h-[60vh] overflow-auto`}
      >
        <CardContent className="p-3 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {style.icon}
            <span className="text-xs font-medium text-muted-foreground capitalize">
              {message.responseType}
            </span>
          </div>
          <div className="text-sm leading-relaxed whitespace-pre-wrap break-words min-w-0" style={{ overflowWrap: "anywhere" }}>
            {replaceJargon(message.content)}
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            {formatTime(message.timestamp)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
