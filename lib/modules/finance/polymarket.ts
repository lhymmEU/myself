import { execFile } from "child_process";
import { promisify } from "util";

const exec = promisify(execFile);

const CLI_PATH =
  process.env.POLYMARKET_CLI_PATH || `${process.env.HOME}/.local/bin/polymarket`;

const CLI_TIMEOUT_MS = 45_000;

interface CliCache {
  data: unknown;
  timestamp: number;
}

const cache = new Map<string, CliCache>();
const CACHE_TTL_MS = 60_000;

async function polymarketCli(...args: string[]): Promise<unknown> {
  const key = args.join("|");
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const { stdout } = await exec(CLI_PATH, ["-o", "json", ...args], {
      timeout: CLI_TIMEOUT_MS,
    });

    const data = JSON.parse(stdout);

    if (data?.error) {
      throw new Error(String(data.error));
    }

    cache.set(key, { data, timestamp: Date.now() });
    return data;
  } catch (err) {
    if (cached) {
      return cached.data;
    }
    throw err;
  }
}

export interface PolymarketMarket {
  id: string;
  question: string;
  slug: string;
  outcomes: string[];
  outcomePrices: number[];
  volume: number;
  active: boolean;
  closed: boolean;
  endDate?: string;
  description?: string;
  image?: string;
  category?: string;
}

export interface PolymarketEvent {
  id: string;
  title: string;
  slug: string;
  markets: PolymarketMarket[];
}

function parseMarket(raw: Record<string, unknown>): PolymarketMarket {
  let outcomes: string[] = [];
  let prices: number[] = [];

  try {
    const rawOutcomes = raw.outcomes;
    if (typeof rawOutcomes === "string") {
      outcomes = JSON.parse(rawOutcomes);
    } else if (Array.isArray(rawOutcomes)) {
      outcomes = rawOutcomes.map(String);
    }
  } catch {
    outcomes = ["Yes", "No"];
  }

  try {
    const rawPrices = raw.outcomePrices;
    if (typeof rawPrices === "string") {
      prices = JSON.parse(rawPrices).map(Number);
    } else if (Array.isArray(rawPrices)) {
      prices = rawPrices.map(Number);
    }
  } catch {
    prices = [];
  }

  return {
    id: String(raw.id ?? raw.conditionId ?? ""),
    question: String(raw.question ?? ""),
    slug: String(raw.slug ?? ""),
    outcomes,
    outcomePrices: prices,
    volume: parseFloat(String(raw.volume ?? 0)),
    active: Boolean(raw.active),
    closed: Boolean(raw.closed),
    endDate: raw.endDate ? String(raw.endDate) : undefined,
    description: raw.description ? String(raw.description) : undefined,
    image: raw.image ? String(raw.image) : undefined,
    category: raw.category ? String(raw.category) : undefined,
  };
}

function parseEvent(raw: Record<string, unknown>): PolymarketEvent {
  const rawMarkets = Array.isArray(raw.markets) ? raw.markets : [];
  return {
    id: String(raw.id ?? ""),
    title: String(raw.title ?? ""),
    slug: String(raw.slug ?? ""),
    markets: rawMarkets.map((m: unknown) =>
      parseMarket(m as Record<string, unknown>)
    ),
  };
}

export async function listMarkets(
  limit = 20,
  closedFilter = false
): Promise<PolymarketMarket[]> {
  const args = ["markets", "list", "--limit", String(limit)];
  if (!closedFilter) {
    args.push("--closed", "false");
  }
  const data = await polymarketCli(...args);
  if (!Array.isArray(data)) return [];
  return data
    .map((m: unknown) => parseMarket(m as Record<string, unknown>))
    .sort((a, b) => b.volume - a.volume);
}

export async function searchMarkets(
  query: string,
  limit = 10
): Promise<PolymarketMarket[]> {
  const data = await polymarketCli(
    "markets",
    "search",
    query,
    "--limit",
    String(limit)
  );
  if (!Array.isArray(data)) return [];
  return data
    .map((m: unknown) => parseMarket(m as Record<string, unknown>))
    .sort((a, b) => b.volume - a.volume);
}

export async function listEvents(
  tag?: string,
  limit = 20
): Promise<PolymarketEvent[]> {
  const args = ["events", "list", "--limit", String(limit)];
  if (tag) {
    args.push("--tag", tag);
  }
  const data = await polymarketCli(...args);
  if (!Array.isArray(data)) return [];
  return data.map((e: unknown) =>
    parseEvent(e as Record<string, unknown>)
  );
}

export async function getMarket(
  slugOrId: string
): Promise<PolymarketMarket | null> {
  try {
    const data = await polymarketCli("markets", "get", slugOrId);
    if (!data || typeof data !== "object") return null;
    return parseMarket(data as Record<string, unknown>);
  } catch {
    return null;
  }
}
