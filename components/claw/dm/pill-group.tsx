"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/context";
import type { PillConfig } from "./types";
import { TemplatePopover } from "./template-popover";

interface PillGroupProps {
  categoryId: string;
  onInsert: (text: string) => void;
  disabled: boolean;
}

const PILLS_BY_CATEGORY: Record<string, PillConfig[]> = {
  tasks: [
    {
      id: "report",
      labelKey: "claw.dm.shelf.pills.writeReport",
      template: {
        titleKey: "claw.dm.template.reportTitle",
        fields: [
          { name: "topic", labelKey: "claw.dm.template.topic", type: "text", placeholder: "e.g. market trends in AI" },
          {
            name: "length",
            labelKey: "claw.dm.template.length",
            type: "select",
            options: [
              { value: "brief", labelKey: "claw.dm.template.brief" },
              { value: "detailed", labelKey: "claw.dm.template.detailed" },
              { value: "deep", labelKey: "claw.dm.template.deep" },
            ],
          },
        ],
        buildMessage: (v) =>
          `Write me a ${v.length || "detailed"} report on: ${v.topic}`,
      },
    },
    {
      id: "research",
      labelKey: "claw.dm.shelf.pills.research",
      template: {
        titleKey: "claw.dm.template.researchTitle",
        fields: [
          { name: "topic", labelKey: "claw.dm.template.topic", type: "text", placeholder: "e.g. best practices for..." },
        ],
        buildMessage: (v) => `Research this topic for me: ${v.topic}`,
      },
    },
    {
      id: "summarize",
      labelKey: "claw.dm.shelf.pills.summarize",
      insertText: "Summarize what you've been working on",
    },
    {
      id: "email",
      labelKey: "claw.dm.shelf.pills.draftEmail",
      template: {
        titleKey: "claw.dm.template.emailTitle",
        fields: [
          { name: "recipient", labelKey: "claw.dm.template.recipient", type: "text", placeholder: "e.g. John from marketing" },
          { name: "subject", labelKey: "claw.dm.template.subject", type: "text", placeholder: "e.g. Q3 review follow-up" },
          { name: "keyPoints", labelKey: "claw.dm.template.keyPoints", type: "text", placeholder: "e.g. thank them, ask for data" },
        ],
        buildMessage: (v) =>
          `Draft an email to ${v.recipient} about "${v.subject}". Key points: ${v.keyPoints}`,
      },
    },
  ],
  memory: [
    {
      id: "whatRemember",
      labelKey: "claw.dm.shelf.pills.whatRemember",
      insertText: "What do you remember about our previous conversations?",
    },
    {
      id: "searchMemory",
      labelKey: "claw.dm.shelf.pills.searchMemory",
      template: {
        titleKey: "claw.dm.template.memorySearchTitle",
        fields: [
          { name: "query", labelKey: "claw.dm.template.query", type: "text", placeholder: "e.g. project deadlines" },
        ],
        buildMessage: (v) => `Search your memory for: ${v.query}`,
      },
    },
    {
      id: "rememberThis",
      labelKey: "claw.dm.shelf.pills.rememberThis",
      template: {
        titleKey: "claw.dm.template.rememberTitle",
        fields: [
          { name: "fact", labelKey: "claw.dm.template.fact", type: "text", placeholder: "e.g. my preferred timezone is PST" },
        ],
        buildMessage: (v) => `Remember this for me: ${v.fact}`,
      },
    },
  ],
  health: [
    {
      id: "checkStatus",
      labelKey: "claw.dm.shelf.pills.checkStatus",
      insertText: "What is your current status?",
    },
    {
      id: "checkGateway",
      labelKey: "claw.dm.shelf.pills.checkGateway",
      insertText: "Is the gateway running properly?",
    },
    {
      id: "checkChannels",
      labelKey: "claw.dm.shelf.pills.checkChannels",
      insertText: "What channels are connected?",
    },
  ],
  skills: [
    {
      id: "listSkills",
      labelKey: "claw.dm.shelf.pills.listSkills",
      insertText: "What skills do you have?",
    },
    {
      id: "whatCanYouDo",
      labelKey: "claw.dm.shelf.pills.whatCanYouDo",
      insertText: "What are you capable of doing?",
    },
  ],
};

const PILL_STYLE =
  "rounded-full border border-dashed border-border bg-background px-3 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-solid hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export function PillGroup({ categoryId, onInsert, disabled }: PillGroupProps) {
  const t = useT();
  const [openTemplate, setOpenTemplate] = useState<string | null>(null);
  const pills = PILLS_BY_CATEGORY[categoryId] ?? [];

  if (pills.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 pl-1">
      {pills.map((pill) => {
        if (pill.template) {
          return (
            <TemplatePopover
              key={pill.id}
              open={openTemplate === pill.id}
              onOpenChange={(open) =>
                setOpenTemplate(open ? pill.id : null)
              }
              template={pill.template}
              onSubmit={(text) => {
                onInsert(text);
                setOpenTemplate(null);
              }}
            >
              <button
                type="button"
                className={PILL_STYLE}
                disabled={disabled}
                onClick={() => setOpenTemplate(pill.id)}
              >
                {t(pill.labelKey as Parameters<typeof t>[0])}
              </button>
            </TemplatePopover>
          );
        }

        return (
          <button
            key={pill.id}
            type="button"
            className={PILL_STYLE}
            disabled={disabled}
            onClick={() => pill.insertText && onInsert(pill.insertText)}
          >
            {t(pill.labelKey as Parameters<typeof t>[0])}
          </button>
        );
      })}
    </div>
  );
}
