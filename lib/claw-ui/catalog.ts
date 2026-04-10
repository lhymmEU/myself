import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { shadcnComponentDefinitions } from "@json-render/shadcn/catalog";
import { z } from "zod";

export const clawCatalog = defineCatalog(schema, {
  components: {
    // --- Layout ---
    Card: shadcnComponentDefinitions.Card,
    Stack: shadcnComponentDefinitions.Stack,
    Grid: shadcnComponentDefinitions.Grid,
    Separator: shadcnComponentDefinitions.Separator,

    // --- Content ---
    Heading: shadcnComponentDefinitions.Heading,
    Text: shadcnComponentDefinitions.Text,
    Badge: shadcnComponentDefinitions.Badge,
    Alert: shadcnComponentDefinitions.Alert,
    Table: shadcnComponentDefinitions.Table,
    Progress: shadcnComponentDefinitions.Progress,
    Accordion: shadcnComponentDefinitions.Accordion,
    Collapsible: shadcnComponentDefinitions.Collapsible,

    // --- Claw-specific ---
    StatusPanel: {
      props: z.object({
        agentName: z.string(),
        online: z.boolean(),
        health: z.nullable(z.enum(["healthy", "unhealthy", "unknown"])),
        gatewayRunning: z.nullable(z.boolean()),
        uptime: z.nullable(z.string()),
        currentTask: z.nullable(z.string()),
      }),
      description:
        "Status dashboard showing agent health, gateway state, and current activity",
      example: {
        agentName: "main-agent",
        online: true,
        health: "healthy",
        gatewayRunning: true,
        uptime: "3d 12h",
        currentTask: null,
      },
    },

    MemoryEntry: {
      props: z.object({
        key: z.string(),
        value: z.string(),
        category: z.nullable(z.string()),
        timestamp: z.nullable(z.string()),
      }),
      description: "A single memory/knowledge entry recalled by the agent",
      example: {
        key: "user-preference",
        value: "Prefers dark mode",
        category: "preferences",
        timestamp: "2025-01-15",
      },
    },

    SkillCard: {
      props: z.object({
        name: z.string(),
        description: z.nullable(z.string()),
        installed: z.boolean(),
        version: z.nullable(z.string()),
      }),
      description: "Display card for an agent skill or capability",
      example: {
        name: "web-search",
        description: "Search the web for information",
        installed: true,
        version: "1.2.0",
      },
    },

    TaskProgress: {
      props: z.object({
        taskName: z.string(),
        status: z.enum(["queued", "running", "completed", "failed"]),
        progress: z.nullable(z.number()),
        detail: z.nullable(z.string()),
      }),
      description: "Task progress indicator with status and optional detail",
      example: {
        taskName: "Deploy service",
        status: "running",
        progress: 65,
        detail: "Building container image...",
      },
    },

    KeyValue: {
      props: z.object({
        items: z.array(
          z.object({
            label: z.string(),
            value: z.string(),
          }),
        ),
      }),
      description:
        "Display a list of key-value pairs in a compact two-column layout",
      example: {
        items: [
          { label: "Version", value: "2.1.0" },
          { label: "Uptime", value: "3d 12h" },
        ],
      },
    },
  },
  actions: {},
});
