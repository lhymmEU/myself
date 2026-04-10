"use client";

import { defineRegistry } from "@json-render/react";
import { shadcnComponents } from "@json-render/shadcn";
import {
  Activity,
  Brain,
  CheckCircle2,
  Circle,
  Loader2,
  Package,
  XCircle,
} from "lucide-react";
import { clawCatalog } from "./catalog";

export const { registry } = defineRegistry(clawCatalog, {
  components: {
    // --- Standard shadcn ---
    Card: shadcnComponents.Card,
    Stack: shadcnComponents.Stack,
    Grid: shadcnComponents.Grid,
    Separator: shadcnComponents.Separator,
    Heading: shadcnComponents.Heading,
    Text: shadcnComponents.Text,
    Badge: shadcnComponents.Badge,
    Alert: shadcnComponents.Alert,
    Table: shadcnComponents.Table,
    Progress: shadcnComponents.Progress,
    Accordion: shadcnComponents.Accordion,
    Collapsible: shadcnComponents.Collapsible,

    // --- Claw-specific ---
    StatusPanel: ({ props }) => {
      const healthColor =
        props.health === "healthy"
          ? "text-emerald-500"
          : props.health === "unhealthy"
            ? "text-red-500"
            : "text-muted-foreground";

      return (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500" />
              <span className="font-medium text-sm">{props.agentName}</span>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                props.online ? "text-emerald-500" : "text-red-500"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  props.online ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
              {props.online ? "Online" : "Offline"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {props.health && (
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Health:</span>
                <span className={`font-medium capitalize ${healthColor}`}>
                  {props.health}
                </span>
              </div>
            )}
            {props.gatewayRunning != null && (
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Gateway:</span>
                <span
                  className={`font-medium ${
                    props.gatewayRunning ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {props.gatewayRunning ? "Running" : "Stopped"}
                </span>
              </div>
            )}
            {props.uptime && (
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Uptime:</span>
                <span className="font-medium">{props.uptime}</span>
              </div>
            )}
            {props.currentTask && (
              <div className="col-span-2 flex items-center gap-1.5">
                <span className="text-muted-foreground">Task:</span>
                <span className="font-medium truncate">
                  {props.currentTask}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    },

    MemoryEntry: ({ props }) => (
      <div className="rounded-lg border bg-card p-3 space-y-1">
        <div className="flex items-center gap-2">
          <Brain className="h-3.5 w-3.5 text-purple-500" />
          <span className="text-sm font-medium">{props.key}</span>
          {props.category && (
            <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-500">
              {props.category}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {props.value}
        </p>
        {props.timestamp && (
          <p className="text-[10px] text-muted-foreground/60">
            {props.timestamp}
          </p>
        )}
      </div>
    ),

    SkillCard: ({ props }) => (
      <div className="rounded-lg border bg-card p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-3.5 w-3.5 text-cyan-500" />
            <span className="text-sm font-medium">{props.name}</span>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
              props.installed
                ? "bg-emerald-500/10 text-emerald-500"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {props.installed ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <Circle className="h-3 w-3" />
            )}
            {props.installed ? "Installed" : "Available"}
          </span>
        </div>
        {props.description && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            {props.description}
          </p>
        )}
        {props.version && (
          <p className="mt-1 text-[10px] text-muted-foreground/60">
            v{props.version}
          </p>
        )}
      </div>
    ),

    TaskProgress: ({ props }) => {
      const statusConfig = {
        queued: {
          icon: <Circle className="h-3.5 w-3.5 text-muted-foreground" />,
          color: "text-muted-foreground",
          bg: "bg-muted",
        },
        running: {
          icon: (
            <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />
          ),
          color: "text-blue-500",
          bg: "bg-blue-500/10",
        },
        completed: {
          icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
          color: "text-emerald-500",
          bg: "bg-emerald-500/10",
        },
        failed: {
          icon: <XCircle className="h-3.5 w-3.5 text-red-500" />,
          color: "text-red-500",
          bg: "bg-red-500/10",
        },
      };

      const cfg = statusConfig[props.status];

      return (
        <div className="rounded-lg border bg-card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {cfg.icon}
              <span className="text-sm font-medium">{props.taskName}</span>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${cfg.bg} ${cfg.color}`}
            >
              {props.status}
            </span>
          </div>
          {props.progress != null && (
            <div className="space-y-1">
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    props.status === "failed" ? "bg-red-500" : "bg-blue-500"
                  }`}
                  style={{ width: `${Math.min(100, props.progress)}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground text-right">
                {props.progress}%
              </p>
            </div>
          )}
          {props.detail && (
            <p className="text-xs text-muted-foreground">{props.detail}</p>
          )}
        </div>
      );
    },

    KeyValue: ({ props }) => (
      <div className="rounded-lg border bg-card divide-y">
        {props.items.map((item, i) => (
          <div
            key={`${item.label}-${i}`}
            className="flex items-center justify-between px-3 py-2 text-sm"
          >
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    ),
  },
});
