"use client";

/**
 * SVG-based pixel character for the dashboard.
 *
 * Replaces the legacy react-three-fiber `CharacterViewer`. Pure client-side
 * (no native deps, no Node APIs) so it ships only to the browser bundle and
 * never lands in the cloud serverless function bundle.
 *
 * Two character types — `user` (a small human) and `lobster` — share the
 * same render pipeline: a 64x64 viewBox, integer-coordinate rectangle
 * sprites (`shapeRendering="crispEdges"`), and a diff effect that animates
 * accessory adds (sparkle) and removes (poof) when the `userSkills` /
 * `lobsterSkills` props change.
 *
 * Gamification ("equipment slot" scheme):
 *   - Each user skill maps via `category` to one of seven slots
 *     (glasses, palette, book, headphones, sword, briefcase, badge);
 *     skill `level` controls the accessory's color tier.
 *   - Each installed Claw skill maps via `metadata.type` (with keyword
 *     fallback) to one of nine lobster slots. A skill count below the
 *     character renders a level ring.
 */

import { useEffect, useMemo, useRef, useState } from "react";

// ---------- Public types ----------

export interface UserColors {
  skin?: string;
  hair?: string;
  shirt?: string;
  pants?: string;
  shoe?: string;
}

export interface LobsterColors {
  shell?: string;
  shellDark?: string;
  belly?: string;
  eye?: string;
}

export interface PixelUserSkill {
  id: string;
  name: string;
  level: "familiar" | "fluent" | "mastering";
  category: string | null;
  createdAt: number;
}

export interface PixelLobsterSkill {
  name: string;
  description: string;
  path: string;
  metadata?: Record<string, unknown>;
}

export interface PixelCharacterProps {
  type: "user" | "lobster";
  className?: string;
  userColors?: UserColors;
  lobsterColors?: LobsterColors;
  grayscale?: boolean;
  userSkills?: PixelUserSkill[];
  lobsterSkills?: PixelLobsterSkill[];
  /** Localized accessory labels for the human character. Keys are slot ids. */
  userSlotLabels?: Partial<Record<UserSlot, string>>;
  /** Localized accessory labels for the lobster. Keys are slot ids. */
  lobsterSlotLabels?: Partial<Record<LobsterSlot, string>>;
}

// ---------- Sprite primitives ----------

interface Pixel {
  x: number;
  y: number;
  w?: number;
  h?: number;
  key: string;
}

const DEFAULT_USER_COLORS: Required<UserColors> = {
  skin: "#ffe0bd",
  hair: "#3b2f2f",
  shirt: "#4f8ef7",
  pants: "#2d3748",
  shoe: "#1a1a2e",
};

const DEFAULT_LOBSTER_COLORS: Required<LobsterColors> = {
  shell: "#c0392b",
  shellDark: "#922b21",
  belly: "#e8a87c",
  eye: "#222222",
};

const GRAY_LOBSTER_COLORS: Required<LobsterColors> = {
  shell: "#888888",
  shellDark: "#666666",
  belly: "#aaaaaa",
  eye: "#555555",
};

// ---------- Human base sprite (centered around x≈22-42, y≈10-58) ----------

const HUMAN_BASE: Pixel[] = [
  // Hair back / sides
  { x: 22, y: 10, w: 20, h: 4, key: "hair" },
  { x: 20, y: 14, w: 4, h: 8, key: "hair" },
  { x: 40, y: 14, w: 4, h: 8, key: "hair" },
  // Face skin
  { x: 24, y: 14, w: 16, h: 12, key: "skin" },
  // Hair fringe overlay
  { x: 24, y: 12, w: 16, h: 3, key: "hair" },
  // Eye whites
  { x: 27, y: 18, w: 3, h: 2, key: "eyeWhite" },
  { x: 34, y: 18, w: 3, h: 2, key: "eyeWhite" },
  // Pupils
  { x: 28, y: 18, w: 1, h: 2, key: "eye" },
  { x: 35, y: 18, w: 1, h: 2, key: "eye" },
  // Mouth
  { x: 30, y: 23, w: 4, h: 1, key: "mouth" },
  // Neck
  { x: 30, y: 26, w: 4, h: 2, key: "skin" },
  // Torso (shirt) + arms
  { x: 22, y: 28, w: 20, h: 16, key: "shirt" },
  { x: 18, y: 28, w: 4, h: 12, key: "shirt" },
  { x: 42, y: 28, w: 4, h: 12, key: "shirt" },
  // Hands
  { x: 18, y: 40, w: 4, h: 4, key: "skin" },
  { x: 42, y: 40, w: 4, h: 4, key: "skin" },
  // Pants legs
  { x: 24, y: 44, w: 7, h: 10, key: "pants" },
  { x: 33, y: 44, w: 7, h: 10, key: "pants" },
  // Shoes
  { x: 22, y: 54, w: 10, h: 4, key: "shoe" },
  { x: 32, y: 54, w: 10, h: 4, key: "shoe" },
];

// Pixels whose `key` represents the eye-white slot — used for blink overlay.
const HUMAN_EYE_REGION: Pixel[] = [
  { x: 27, y: 18, w: 3, h: 2, key: "skin" },
  { x: 34, y: 18, w: 3, h: 2, key: "skin" },
];

// ---------- Lobster base sprite (front-facing, centered) ----------

const LOBSTER_BASE: Pixel[] = [
  // Antennae
  { x: 26, y: 6, w: 1, h: 6, key: "shellDark" },
  { x: 27, y: 5, w: 1, h: 1, key: "shellDark" },
  { x: 37, y: 6, w: 1, h: 6, key: "shellDark" },
  { x: 36, y: 5, w: 1, h: 1, key: "shellDark" },
  // Head
  { x: 22, y: 14, w: 20, h: 8, key: "shell" },
  // Body
  { x: 20, y: 22, w: 24, h: 14, key: "shell" },
  // Belly
  { x: 24, y: 24, w: 16, h: 10, key: "belly" },
  // Eye whites
  { x: 26, y: 16, w: 3, h: 3, key: "eyeWhite" },
  { x: 35, y: 16, w: 3, h: 3, key: "eyeWhite" },
  // Pupils
  { x: 27, y: 17, w: 1, h: 2, key: "eye" },
  { x: 36, y: 17, w: 1, h: 2, key: "eye" },
  // Tail segments
  { x: 22, y: 36, w: 20, h: 3, key: "shellDark" },
  { x: 24, y: 39, w: 16, h: 3, key: "shell" },
  { x: 26, y: 42, w: 12, h: 3, key: "shellDark" },
  // Tail fan
  { x: 24, y: 45, w: 4, h: 4, key: "shell" },
  { x: 30, y: 45, w: 4, h: 4, key: "shell" },
  { x: 36, y: 45, w: 4, h: 4, key: "shell" },
  // Legs (decorative spikes)
  { x: 18, y: 36, w: 1, h: 4, key: "shellDark" },
  { x: 16, y: 32, w: 1, h: 6, key: "shellDark" },
  { x: 14, y: 28, w: 1, h: 8, key: "shellDark" },
  { x: 45, y: 36, w: 1, h: 4, key: "shellDark" },
  { x: 47, y: 32, w: 1, h: 6, key: "shellDark" },
  { x: 49, y: 28, w: 1, h: 8, key: "shellDark" },
];

// Claw arms + claws are split out so each can wave independently.
const LOBSTER_LEFT_CLAW: Pixel[] = [
  { x: 14, y: 22, w: 8, h: 4, key: "shell" },
  { x: 4, y: 18, w: 12, h: 4, key: "shellDark" },
  { x: 4, y: 24, w: 12, h: 4, key: "shellDark" },
];

const LOBSTER_RIGHT_CLAW: Pixel[] = [
  { x: 42, y: 22, w: 8, h: 4, key: "shell" },
  { x: 48, y: 18, w: 12, h: 4, key: "shellDark" },
  { x: 48, y: 24, w: 12, h: 4, key: "shellDark" },
];

const LOBSTER_EYE_REGION: Pixel[] = [
  { x: 26, y: 16, w: 3, h: 3, key: "shell" },
  { x: 35, y: 16, w: 3, h: 3, key: "shell" },
];

// ---------- Equipment slot resolvers ----------

export type UserSlot =
  | "glasses"
  | "palette"
  | "book"
  | "headphones"
  | "sword"
  | "briefcase"
  | "badge";

export type LobsterSlot =
  | "code"
  | "translate"
  | "search"
  | "summarize"
  | "image"
  | "music"
  | "scheduler"
  | "tool"
  | "generic";

const USER_SLOT_PATTERNS: Array<{ slot: UserSlot; re: RegExp }> = [
  { slot: "glasses", re: /(programming|code|coding|dev|engineer|software|web|tech)/i },
  { slot: "palette", re: /(design|art|ui|ux|paint|illustrat)/i },
  { slot: "book", re: /(language|translation|writing|speak|read|literature)/i },
  { slot: "headphones", re: /(music|audio|sound|sing|instrument)/i },
  { slot: "sword", re: /(sport|fitness|combat|martial|exercise|gym)/i },
  { slot: "briefcase", re: /(business|finance|management|market|sales|legal)/i },
];

function resolveUserSlot(category: string | null | undefined): UserSlot {
  const c = (category ?? "").trim();
  if (!c) return "badge";
  for (const { slot, re } of USER_SLOT_PATTERNS) {
    if (re.test(c)) return slot;
  }
  return "badge";
}

const LOBSTER_TYPE_PATTERNS: Array<{ slot: LobsterSlot; re: RegExp }> = [
  { slot: "code", re: /(code|build|compile|program|script|deploy)/i },
  { slot: "translate", re: /(translat|i18n|locale|language)/i },
  { slot: "search", re: /(search|find|grep|lookup|query)/i },
  { slot: "summarize", re: /(summar|abstract|digest|tldr)/i },
  { slot: "image", re: /(image|picture|photo|render|draw)/i },
  { slot: "music", re: /(music|audio|sound|voice)/i },
  { slot: "scheduler", re: /(cron|schedul|timer|alarm|reminder)/i },
  { slot: "tool", re: /(tool|util|helper|wrench)/i },
];

function resolveLobsterSlot(skill: PixelLobsterSkill): LobsterSlot {
  const meta = skill.metadata?.type;
  if (typeof meta === "string" && meta.trim()) {
    const m = meta.trim().toLowerCase();
    if (
      m === "code" || m === "translate" || m === "search" || m === "summarize" ||
      m === "image" || m === "music" || m === "scheduler" || m === "tool"
    ) {
      return m as LobsterSlot;
    }
  }
  const haystack = `${skill.name} ${skill.description}`;
  for (const { slot, re } of LOBSTER_TYPE_PATTERNS) {
    if (re.test(haystack)) return slot;
  }
  return "generic";
}

// ---------- Accessory sprites ----------

const ACCESSORIES_USER: Record<UserSlot, Pixel[]> = {
  glasses: [
    // Left lens frame
    { x: 26, y: 17, w: 5, h: 1, key: "outline" },
    { x: 26, y: 17, w: 1, h: 4, key: "outline" },
    { x: 30, y: 17, w: 1, h: 4, key: "outline" },
    { x: 26, y: 20, w: 5, h: 1, key: "outline" },
    // Right lens frame
    { x: 33, y: 17, w: 5, h: 1, key: "outline" },
    { x: 33, y: 17, w: 1, h: 4, key: "outline" },
    { x: 37, y: 17, w: 1, h: 4, key: "outline" },
    { x: 33, y: 20, w: 5, h: 1, key: "outline" },
    // Bridge
    { x: 31, y: 18, w: 2, h: 1, key: "outline" },
  ],
  palette: [
    { x: 13, y: 38, w: 7, h: 5, key: "outline" },
    { x: 14, y: 39, w: 5, h: 3, key: "highlight" },
    { x: 15, y: 40, w: 1, h: 1, key: "accent1" },
    { x: 17, y: 40, w: 1, h: 1, key: "accent2" },
  ],
  book: [
    { x: 14, y: 39, w: 6, h: 4, key: "outline" },
    { x: 15, y: 40, w: 4, h: 1, key: "highlight" },
    { x: 15, y: 42, w: 4, h: 1, key: "highlight" },
  ],
  headphones: [
    { x: 22, y: 9, w: 20, h: 1, key: "outline" },
    { x: 21, y: 10, w: 1, h: 3, key: "outline" },
    { x: 42, y: 10, w: 1, h: 3, key: "outline" },
    { x: 19, y: 13, w: 3, h: 4, key: "outline" },
    { x: 42, y: 13, w: 3, h: 4, key: "outline" },
  ],
  sword: [
    { x: 47, y: 28, w: 1, h: 12, key: "highlight" },
    { x: 48, y: 28, w: 1, h: 12, key: "outline" },
    { x: 47, y: 27, w: 2, h: 1, key: "outline" },
    { x: 45, y: 40, w: 6, h: 1, key: "accent1" },
    { x: 47, y: 41, w: 2, h: 3, key: "outline" },
  ],
  briefcase: [
    { x: 44, y: 40, w: 6, h: 5, key: "outline" },
    { x: 45, y: 41, w: 4, h: 3, key: "highlight" },
    { x: 46, y: 39, w: 2, h: 1, key: "outline" },
  ],
  badge: [
    { x: 30, y: 32, w: 4, h: 4, key: "outline" },
    { x: 31, y: 33, w: 2, h: 2, key: "highlight" },
  ],
};

const ACCESSORIES_LOBSTER: Record<LobsterSlot, Pixel[]> = {
  code: [
    { x: 28, y: 22, w: 8, h: 5, key: "outline" },
    { x: 29, y: 23, w: 6, h: 3, key: "highlight" },
    { x: 27, y: 27, w: 10, h: 1, key: "outline" },
  ],
  translate: [
    { x: 38, y: 4, w: 10, h: 6, key: "highlight" },
    { x: 38, y: 4, w: 10, h: 1, key: "outline" },
    { x: 38, y: 9, w: 10, h: 1, key: "outline" },
    { x: 38, y: 4, w: 1, h: 6, key: "outline" },
    { x: 47, y: 4, w: 1, h: 6, key: "outline" },
    { x: 41, y: 6, w: 1, h: 1, key: "outline" },
    { x: 43, y: 6, w: 1, h: 1, key: "outline" },
    { x: 45, y: 6, w: 1, h: 1, key: "outline" },
    { x: 39, y: 10, w: 2, h: 1, key: "outline" },
  ],
  search: [
    { x: 0, y: 14, w: 4, h: 1, key: "outline" },
    { x: 0, y: 18, w: 4, h: 1, key: "outline" },
    { x: 0, y: 14, w: 1, h: 5, key: "outline" },
    { x: 3, y: 14, w: 1, h: 5, key: "outline" },
    { x: 1, y: 15, w: 2, h: 3, key: "highlight" },
    { x: 4, y: 18, w: 3, h: 1, key: "outline" },
    { x: 5, y: 19, w: 2, h: 1, key: "outline" },
  ],
  summarize: [
    { x: 56, y: 14, w: 6, h: 1, key: "outline" },
    { x: 56, y: 18, w: 6, h: 1, key: "outline" },
    { x: 56, y: 14, w: 1, h: 5, key: "outline" },
    { x: 61, y: 14, w: 1, h: 5, key: "outline" },
    { x: 57, y: 15, w: 4, h: 3, key: "highlight" },
    { x: 58, y: 16, w: 2, h: 1, key: "outline" },
  ],
  image: [
    { x: 56, y: 26, w: 4, h: 2, key: "accent1" },
    { x: 56, y: 28, w: 4, h: 1, key: "outline" },
    { x: 57, y: 29, w: 2, h: 6, key: "highlight" },
  ],
  music: [
    { x: 24, y: 12, w: 16, h: 1, key: "outline" },
    { x: 23, y: 13, w: 1, h: 3, key: "outline" },
    { x: 40, y: 13, w: 1, h: 3, key: "outline" },
    { x: 22, y: 15, w: 3, h: 4, key: "outline" },
    { x: 39, y: 15, w: 3, h: 4, key: "outline" },
  ],
  scheduler: [
    { x: 50, y: 13, w: 6, h: 6, key: "highlight" },
    { x: 50, y: 13, w: 6, h: 1, key: "outline" },
    { x: 50, y: 18, w: 6, h: 1, key: "outline" },
    { x: 50, y: 13, w: 1, h: 6, key: "outline" },
    { x: 55, y: 13, w: 1, h: 6, key: "outline" },
    { x: 52, y: 15, w: 2, h: 1, key: "outline" },
    { x: 52, y: 16, w: 1, h: 2, key: "outline" },
  ],
  tool: [
    { x: 6, y: 26, w: 4, h: 4, key: "outline" },
    { x: 7, y: 27, w: 2, h: 2, key: "highlight" },
    { x: 8, y: 30, w: 2, h: 6, key: "outline" },
  ],
  generic: [
    { x: 30, y: 4, w: 2, h: 1, key: "highlight" },
    { x: 29, y: 5, w: 4, h: 1, key: "highlight" },
    { x: 28, y: 6, w: 6, h: 1, key: "highlight" },
    { x: 29, y: 7, w: 4, h: 1, key: "highlight" },
    { x: 30, y: 8, w: 2, h: 1, key: "highlight" },
  ],
};

// Approximate slot anchor used to position +N pips and sparkle/poof overlays.
const USER_SLOT_ANCHOR: Record<UserSlot, { x: number; y: number }> = {
  glasses: { x: 38, y: 16 },
  palette: { x: 12, y: 37 },
  book: { x: 13, y: 38 },
  headphones: { x: 41, y: 8 },
  sword: { x: 49, y: 27 },
  briefcase: { x: 50, y: 40 },
  badge: { x: 34, y: 31 },
};

const LOBSTER_SLOT_ANCHOR: Record<LobsterSlot, { x: number; y: number }> = {
  code: { x: 36, y: 21 },
  translate: { x: 48, y: 4 },
  search: { x: 0, y: 13 },
  summarize: { x: 62, y: 13 },
  image: { x: 60, y: 25 },
  music: { x: 40, y: 11 },
  scheduler: { x: 56, y: 12 },
  tool: { x: 10, y: 25 },
  generic: { x: 33, y: 3 },
};

// ---------- Level → palette ----------

type Tier = "familiar" | "fluent" | "mastering";

const ACCESSORY_PALETTES: Record<Tier, Record<string, string>> = {
  familiar: {
    outline: "#8b9295",
    highlight: "#cdd2d4",
    accent1: "#a35450",
    accent2: "#506fa3",
  },
  fluent: {
    outline: "#3b82f6",
    highlight: "#bfdbfe",
    accent1: "#ef4444",
    accent2: "#10b981",
  },
  mastering: {
    outline: "#f59e0b",
    highlight: "#fde68a",
    accent1: "#dc2626",
    accent2: "#7c3aed",
  },
};

// ---------- Helpers ----------

function paint(pixels: Pixel[], palette: Record<string, string>): React.ReactElement[] {
  return pixels.map((p, i) => {
    const fill = palette[p.key];
    if (!fill) return null;
    return (
      <rect
        key={`${p.key}-${i}-${p.x}-${p.y}`}
        x={p.x}
        y={p.y}
        width={p.w ?? 1}
        height={p.h ?? 1}
        fill={fill}
      />
    );
  }).filter(Boolean) as React.ReactElement[];
}

function levelTier(level: PixelUserSkill["level"]): Tier {
  return level;
}

/**
 * Resolves the canonical accessory + count + tier per slot. The "winner" of
 * each slot is the highest-tier skill (mastering > fluent > familiar) breaking
 * ties by most recent createdAt.
 */
function resolveUserSlots(skills: PixelUserSkill[]): Map<UserSlot, { tier: Tier; count: number; winnerId: string }> {
  const tierRank: Record<Tier, number> = { familiar: 0, fluent: 1, mastering: 2 };
  const buckets = new Map<UserSlot, { tier: Tier; count: number; winnerId: string; winnerCreatedAt: number }>();
  for (const s of skills) {
    const slot = resolveUserSlot(s.category);
    const tier = levelTier(s.level);
    const existing = buckets.get(slot);
    if (!existing) {
      buckets.set(slot, { tier, count: 1, winnerId: s.id, winnerCreatedAt: s.createdAt });
      continue;
    }
    existing.count += 1;
    const newRank = tierRank[tier];
    const oldRank = tierRank[existing.tier];
    if (newRank > oldRank || (newRank === oldRank && s.createdAt > existing.winnerCreatedAt)) {
      existing.tier = tier;
      existing.winnerId = s.id;
      existing.winnerCreatedAt = s.createdAt;
    }
  }
  const out = new Map<UserSlot, { tier: Tier; count: number; winnerId: string }>();
  for (const [k, v] of buckets) out.set(k, { tier: v.tier, count: v.count, winnerId: v.winnerId });
  return out;
}

/**
 * For lobster: tier is implicit (skills don't have a level). Tier is derived
 * from the slot's own count — solo=familiar, 2=fluent, 3+=mastering — so
 * stacking accessories in the same role visibly upgrades them.
 */
function resolveLobsterSlots(skills: PixelLobsterSkill[]): Map<LobsterSlot, { tier: Tier; count: number; winnerKey: string }> {
  const buckets = new Map<LobsterSlot, { count: number; winnerKey: string }>();
  for (const s of skills) {
    const slot = resolveLobsterSlot(s);
    const existing = buckets.get(slot);
    if (!existing) {
      buckets.set(slot, { count: 1, winnerKey: s.path });
    } else {
      existing.count += 1;
    }
  }
  const out = new Map<LobsterSlot, { tier: Tier; count: number; winnerKey: string }>();
  for (const [k, v] of buckets) {
    const tier: Tier = v.count >= 3 ? "mastering" : v.count === 2 ? "fluent" : "familiar";
    out.set(k, { tier, count: v.count, winnerKey: v.winnerKey });
  }
  return out;
}

// ---------- Diff hook for sparkle / poof animations ----------

function useSetDiff(keys: string[], windowMs: number): {
  added: Set<string>;
  removed: Set<string>;
} {
  const [added, setAdded] = useState<Set<string>>(() => new Set());
  const [removed, setRemoved] = useState<Set<string>>(() => new Set());
  const prevRef = useRef<Set<string> | null>(null);
  const signature = keys.slice().sort().join("|");

  useEffect(() => {
    const current = new Set(keys);
    const prev = prevRef.current;
    if (prev === null) {
      prevRef.current = current;
      return;
    }
    const newlyAdded = new Set<string>();
    const newlyRemoved = new Set<string>();
    for (const k of current) if (!prev.has(k)) newlyAdded.add(k);
    for (const k of prev) if (!current.has(k)) newlyRemoved.add(k);
    prevRef.current = current;

    const timers: ReturnType<typeof setTimeout>[] = [];

    if (newlyAdded.size > 0) {
      setAdded((s) => {
        const next = new Set(s);
        for (const k of newlyAdded) next.add(k);
        return next;
      });
      timers.push(
        setTimeout(() => {
          setAdded((s) => {
            const next = new Set(s);
            for (const k of newlyAdded) next.delete(k);
            return next;
          });
        }, windowMs),
      );
    }
    if (newlyRemoved.size > 0) {
      setRemoved((s) => {
        const next = new Set(s);
        for (const k of newlyRemoved) next.add(k);
        return next;
      });
      timers.push(
        setTimeout(() => {
          setRemoved((s) => {
            const next = new Set(s);
            for (const k of newlyRemoved) next.delete(k);
            return next;
          });
        }, windowMs),
      );
    }

    return () => {
      for (const t of timers) clearTimeout(t);
    };
  // signature collapses keys[] into a primitive so the effect re-runs only
  // when the membership actually changes, not on every parent render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return { added, removed };
}

// ---------- Sparkle overlay sprite ----------

function Sparkle({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g className="px-sparkle" style={{ transformOrigin: `${cx}px ${cy}px` }}>
      <rect x={cx} y={cy - 2} width={1} height={1} fill="#fde68a" />
      <rect x={cx} y={cy + 2} width={1} height={1} fill="#fde68a" />
      <rect x={cx - 2} y={cy} width={1} height={1} fill="#fde68a" />
      <rect x={cx + 2} y={cy} width={1} height={1} fill="#fde68a" />
      <rect x={cx} y={cy} width={1} height={1} fill="#ffffff" />
    </g>
  );
}

// ---------- Shared SVG <style> ----------

const SVG_STYLES = `
  .px-blink { animation: px-blink 5s ease-in-out infinite; }
  @keyframes px-blink {
    0%, 92%, 100% { opacity: 0; }
    94%, 96%      { opacity: 1; }
  }
  .px-claw-l { animation: px-claw-l 2s ease-in-out infinite; transform-origin: 14px 24px; }
  .px-claw-r { animation: px-claw-r 2s ease-in-out infinite; transform-origin: 50px 24px; }
  @keyframes px-claw-l {
    0%, 100% { transform: rotate(-3deg); }
    50%      { transform: rotate(4deg); }
  }
  @keyframes px-claw-r {
    0%, 100% { transform: rotate(3deg); }
    50%      { transform: rotate(-4deg); }
  }
  .px-sparkle { animation: px-sparkle 800ms ease-out forwards; }
  @keyframes px-sparkle {
    0%   { opacity: 0; transform: scale(0.4); }
    40%  { opacity: 1; transform: scale(1.3); }
    100% { opacity: 0; transform: scale(2); }
  }
  .px-poof { animation: px-poof 400ms ease-out forwards; }
  @keyframes px-poof {
    0%   { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(3px); }
  }
  .px-glow { filter: drop-shadow(0 0 0.8px #fcd34d) drop-shadow(0 0 0.4px #fcd34d); }
  @media (prefers-reduced-motion: reduce) {
    .px-blink, .px-claw-l, .px-claw-r, .px-sparkle, .px-poof {
      animation: none !important;
    }
  }
`;

// ---------- Human renderer ----------

function HumanRender({
  colors,
  skills,
  slotLabels,
}: {
  colors: Required<UserColors>;
  skills: PixelUserSkill[];
  slotLabels: Partial<Record<UserSlot, string>>;
}) {
  const palette = useMemo<Record<string, string>>(
    () => ({
      skin: colors.skin,
      hair: colors.hair,
      shirt: colors.shirt,
      pants: colors.pants,
      shoe: colors.shoe,
      eye: "#1a1a1a",
      eyeWhite: "#fefefe",
      mouth: "#a04848",
    }),
    [colors.skin, colors.hair, colors.shirt, colors.pants, colors.shoe],
  );

  const slots = useMemo(() => resolveUserSlots(skills), [skills]);
  const slotKeys = useMemo(
    () => Array.from(slots, ([slot, info]) => `${slot}:${info.winnerId}`),
    [slots],
  );
  const { added, removed } = useSetDiff(slotKeys, 800);

  const totalSkills = skills.length;
  const masteredCount = useMemo(
    () => skills.filter((s) => s.level === "mastering").length,
    [skills],
  );

  const baseRects = useMemo(() => paint(HUMAN_BASE, palette), [palette]);
  const blinkOverlay = useMemo(() => paint(HUMAN_EYE_REGION, palette), [palette]);

  return (
    <g>
      <g>
        {baseRects}
        {/* Blink overlay — covers eye whites with skin color on a 5s pulse. */}
        <g className="px-blink">{blinkOverlay}</g>

        {/* Accessories per slot */}
        {Array.from(slots).map(([slot, info]) => {
          const acc = ACCESSORIES_USER[slot];
          const accPalette = ACCESSORY_PALETTES[info.tier];
          const glowClass = info.tier === "mastering" ? "px-glow" : "";
          const label = slotLabels[slot] ?? slot;
          return (
            <g key={`acc-${slot}`} className={glowClass}>
              <title>
                {info.count > 1 ? `${label} ×${info.count}` : label}
              </title>
              {paint(acc, accPalette)}
              {info.count > 1 && (
                <rect
                  x={USER_SLOT_ANCHOR[slot].x + 2}
                  y={USER_SLOT_ANCHOR[slot].y - 2}
                  width={2}
                  height={2}
                  fill="#fbbf24"
                />
              )}
            </g>
          );
        })}

        {/* Sparkle overlay for newly added slots */}
        {Array.from(added).map((key) => {
          const slot = key.split(":")[0] as UserSlot;
          const a = USER_SLOT_ANCHOR[slot];
          if (!a) return null;
          return <Sparkle key={`spark-${key}`} cx={a.x} cy={a.y} />;
        })}
        {/* Poof overlay for newly removed slots — render a quick fade where the slot was */}
        {Array.from(removed).map((key) => {
          const slot = key.split(":")[0] as UserSlot;
          const a = USER_SLOT_ANCHOR[slot];
          if (!a) return null;
          return (
            <rect
              key={`poof-${key}`}
              className="px-poof"
              x={a.x - 1}
              y={a.y - 1}
              width={3}
              height={3}
              fill="#cbd5e1"
              opacity={0.7}
            />
          );
        })}
      </g>

      {/* Level ring under feet — one segment per skill, capped at 12 */}
      <LevelRing total={totalSkills} mastered={masteredCount} cy={61} />
    </g>
  );
}

// ---------- Lobster renderer ----------

function LobsterRender({
  colors,
  skills,
  grayscale,
  slotLabels,
}: {
  colors: Required<LobsterColors>;
  skills: PixelLobsterSkill[];
  grayscale: boolean;
  slotLabels: Partial<Record<LobsterSlot, string>>;
}) {
  const palette = useMemo<Record<string, string>>(() => {
    const src = grayscale ? GRAY_LOBSTER_COLORS : colors;
    return {
      shell: src.shell,
      shellDark: src.shellDark,
      belly: src.belly,
      eye: src.eye,
      eyeWhite: grayscale ? "#cccccc" : "#f5f5dc",
    };
  }, [colors, grayscale]);

  const slots = useMemo(() => resolveLobsterSlots(skills), [skills]);
  const slotKeys = useMemo(
    () => Array.from(slots, ([slot, info]) => `${slot}:${info.winnerKey}`),
    [slots],
  );
  const { added, removed } = useSetDiff(slotKeys, 800);

  const totalSkills = skills.length;
  const masteredCount = useMemo(
    () => Array.from(slots.values()).filter((v) => v.tier === "mastering").length,
    [slots],
  );

  const baseRects = useMemo(() => paint(LOBSTER_BASE, palette), [palette]);
  const leftClawRects = useMemo(() => paint(LOBSTER_LEFT_CLAW, palette), [palette]);
  const rightClawRects = useMemo(() => paint(LOBSTER_RIGHT_CLAW, palette), [palette]);
  const blinkOverlay = useMemo(() => paint(LOBSTER_EYE_REGION, palette), [palette]);

  return (
    <g style={grayscale ? { filter: "saturate(0.2) brightness(0.95)" } : undefined}>
      <g>
        {/* Animated claws first so the body sits on top in z-order */}
        <g className="px-claw-l">{leftClawRects}</g>
        <g className="px-claw-r">{rightClawRects}</g>
        {baseRects}
        <g className="px-blink">{blinkOverlay}</g>

        {/* Accessories per slot */}
        {Array.from(slots).map(([slot, info]) => {
          const acc = ACCESSORIES_LOBSTER[slot];
          const accPalette = ACCESSORY_PALETTES[info.tier];
          const glowClass = info.tier === "mastering" ? "px-glow" : "";
          const label = slotLabels[slot] ?? slot;
          return (
            <g key={`lacc-${slot}`} className={glowClass}>
              <title>
                {info.count > 1 ? `${label} ×${info.count}` : label}
              </title>
              {paint(acc, accPalette)}
              {info.count > 1 && (
                <rect
                  x={LOBSTER_SLOT_ANCHOR[slot].x + 2}
                  y={LOBSTER_SLOT_ANCHOR[slot].y - 2}
                  width={2}
                  height={2}
                  fill="#fbbf24"
                />
              )}
            </g>
          );
        })}

        {Array.from(added).map((key) => {
          const slot = key.split(":")[0] as LobsterSlot;
          const a = LOBSTER_SLOT_ANCHOR[slot];
          if (!a) return null;
          return <Sparkle key={`lspark-${key}`} cx={a.x} cy={a.y} />;
        })}
        {Array.from(removed).map((key) => {
          const slot = key.split(":")[0] as LobsterSlot;
          const a = LOBSTER_SLOT_ANCHOR[slot];
          if (!a) return null;
          return (
            <rect
              key={`lpoof-${key}`}
              className="px-poof"
              x={a.x - 1}
              y={a.y - 1}
              width={3}
              height={3}
              fill="#cbd5e1"
              opacity={0.7}
            />
          );
        })}
      </g>

      <LevelRing total={totalSkills} mastered={masteredCount} cy={61} />
    </g>
  );
}

// ---------- Level ring ----------

function LevelRing({
  total,
  mastered,
  cy,
}: {
  total: number;
  mastered: number;
  cy: number;
}) {
  const max = 12;
  const visible = Math.min(total, max);
  if (visible === 0) return null;
  const startX = 32 - visible; // 2px per segment, centered around x=32
  return (
    <g>
      {Array.from({ length: visible }, (_, i) => (
        <rect
          key={`ring-${i}`}
          x={startX + i * 2}
          y={cy}
          width={1}
          height={1}
          fill={i < mastered ? "#fbbf24" : "#94a3b8"}
        />
      ))}
    </g>
  );
}

// ---------- Public component ----------

export function PixelCharacter({
  type,
  className = "",
  userColors,
  lobsterColors,
  grayscale = false,
  userSkills = [],
  lobsterSkills = [],
  userSlotLabels = {},
  lobsterSlotLabels = {},
}: PixelCharacterProps) {
  const resolvedUserColors: Required<UserColors> = {
    skin: userColors?.skin ?? DEFAULT_USER_COLORS.skin,
    hair: userColors?.hair ?? DEFAULT_USER_COLORS.hair,
    shirt: userColors?.shirt ?? DEFAULT_USER_COLORS.shirt,
    pants: userColors?.pants ?? DEFAULT_USER_COLORS.pants,
    shoe: userColors?.shoe ?? DEFAULT_USER_COLORS.shoe,
  };
  const resolvedLobsterColors: Required<LobsterColors> = {
    shell: lobsterColors?.shell ?? DEFAULT_LOBSTER_COLORS.shell,
    shellDark: lobsterColors?.shellDark ?? DEFAULT_LOBSTER_COLORS.shellDark,
    belly: lobsterColors?.belly ?? DEFAULT_LOBSTER_COLORS.belly,
    eye: lobsterColors?.eye ?? DEFAULT_LOBSTER_COLORS.eye,
  };

  return (
    <div className={className}>
      <svg
        viewBox="0 0 64 64"
        preserveAspectRatio="xMidYMid meet"
        shapeRendering="crispEdges"
        style={{
          width: "100%",
          height: "100%",
          imageRendering: "pixelated",
        }}
        role="img"
        aria-label={type === "user" ? "Your pixel character" : "Your pixel lobster"}
      >
        <style>{SVG_STYLES}</style>
        {type === "user" ? (
          <HumanRender
            colors={resolvedUserColors}
            skills={userSkills}
            slotLabels={userSlotLabels}
          />
        ) : (
          <LobsterRender
            colors={resolvedLobsterColors}
            skills={lobsterSkills}
            grayscale={grayscale}
            slotLabels={lobsterSlotLabels}
          />
        )}
      </svg>
    </div>
  );
}

export default PixelCharacter;
