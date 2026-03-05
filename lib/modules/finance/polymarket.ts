import { ClobClient } from "@polymarket/clob-client";

export interface PolymarketEvent {
  conditionId: string;
  question: string;
  outcomes: string[];
  outcomePrices: number[];
  volume: number;
  active: boolean;
  endDate?: string;
}

const CLOB_URL = "https://clob.polymarket.com";
const CHAIN_ID = 137;

function createClobClient(): ClobClient {
  return new ClobClient(CLOB_URL, CHAIN_ID);
}

export async function fetchPolymarkets(
  limit = 20
): Promise<PolymarketEvent[]> {
  const client = createClobClient();

  const response = await client.getMarkets("MA==");

  const markets: PolymarketEvent[] = [];
  const data = response?.data ?? response;

  if (Array.isArray(data)) {
    for (const m of data) {
      if (!m.active) continue;
      const prices = Array.isArray(m.tokens)
        ? m.tokens.map((t: { price?: number | string }) =>
            parseFloat(String(t.price ?? 0))
          )
        : [];
      const outcomes = Array.isArray(m.tokens)
        ? m.tokens.map((t: { outcome?: string }) => String(t.outcome ?? ""))
        : [];
      markets.push({
        conditionId: String(m.condition_id ?? ""),
        question: String(m.question ?? ""),
        outcomes,
        outcomePrices: prices,
        volume: parseFloat(String(m.volume_num_min ?? m.volume ?? 0)),
        active: Boolean(m.active),
        endDate: m.end_date_iso ? String(m.end_date_iso) : undefined,
      });
    }
  }

  return markets
    .sort((a, b) => b.volume - a.volume)
    .slice(0, limit);
}
