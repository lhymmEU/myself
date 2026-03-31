import { z } from "zod";
import type { AgentTool } from "@/lib/core/types";
import { fetchOpenBB } from "./openbb-client";
import type { OpenBBResponse, EquityHistorical, EquitySearchResult, CryptoHistorical, NewsArticle } from "./types";

export const financeTools: AgentTool[] = [
  {
    name: "getStockPrice",
    description:
      "Get historical stock price data for a given symbol. Returns OHLCV data.",
    parameters: z.object({
      symbol: z.string().describe("Ticker symbol, e.g. AAPL"),
      start_date: z.string().optional().describe("Start date YYYY-MM-DD"),
      end_date: z.string().optional().describe("End date YYYY-MM-DD"),
      provider: z.string().optional().describe("Data provider, defaults to yfinance"),
    }),
    handler: async (params) => {
      const { symbol, start_date, end_date, provider } = params as {
        symbol: string;
        start_date?: string;
        end_date?: string;
        provider?: string;
      };
      const data = await fetchOpenBB<OpenBBResponse<EquityHistorical>>(
        "equity/price/historical",
        {
          symbol,
          ...(start_date && { start_date }),
          ...(end_date && { end_date }),
          provider: provider ?? "yfinance",
        },
      );
      return data.results?.slice(-30) ?? [];
    },
  },
  {
    name: "searchEquity",
    description: "Search for stocks / equities by name or symbol keyword",
    parameters: z.object({
      query: z.string().describe("Search term, e.g. 'Apple' or 'AAPL'"),
    }),
    handler: async (params) => {
      const { query } = params as { query: string };
      const data = await fetchOpenBB<OpenBBResponse<EquitySearchResult>>(
        "equity/search",
        { query },
      );
      return data.results?.slice(0, 10) ?? [];
    },
  },
  {
    name: "getCryptoPrice",
    description:
      "Get historical cryptocurrency price data. Returns OHLCV data.",
    parameters: z.object({
      symbol: z.string().describe("Crypto pair, e.g. BTCUSD"),
      start_date: z.string().optional(),
      end_date: z.string().optional(),
      provider: z.string().optional(),
    }),
    handler: async (params) => {
      const { symbol, start_date, end_date, provider } = params as {
        symbol: string;
        start_date?: string;
        end_date?: string;
        provider?: string;
      };
      const data = await fetchOpenBB<OpenBBResponse<CryptoHistorical>>(
        "crypto/price/historical",
        {
          symbol,
          ...(start_date && { start_date }),
          ...(end_date && { end_date }),
          provider: provider ?? "yfinance",
        },
      );
      return data.results?.slice(-30) ?? [];
    },
  },
  {
    name: "getEconomicIndicator",
    description:
      "Get economic indicator data (GDP, CPI, unemployment, etc.) from FRED or other sources",
    parameters: z.object({
      symbol: z
        .string()
        .optional()
        .describe("FRED series ID, e.g. GDP, CPIAUCSL, UNRATE"),
      country: z.string().optional().describe("Country code, e.g. united_states"),
      provider: z.string().optional(),
    }),
    handler: async (params) => {
      const { symbol, country, provider } = params as {
        symbol?: string;
        country?: string;
        provider?: string;
      };
      const data = await fetchOpenBB(
        "economy/indicators",
        {
          ...(symbol && { symbol }),
          ...(country && { country }),
          provider: provider ?? "econdb",
        },
      );
      return (data as OpenBBResponse).results?.slice(-30) ?? [];
    },
  },
  {
    name: "getMarketNews",
    description: "Get financial news articles, optionally filtered by symbol",
    parameters: z.object({
      symbols: z.string().optional().describe("Comma-separated ticker symbols"),
      limit: z.number().optional().describe("Number of articles, default 10"),
    }),
    handler: async (params) => {
      const { symbols, limit } = params as {
        symbols?: string;
        limit?: number;
      };
      const endpoint = symbols ? "news/company" : "news/world";
      const provider = symbols ? "yfinance" : "biztoc";
      const data = await fetchOpenBB<OpenBBResponse<NewsArticle>>(endpoint, {
        ...(symbols && { symbol: symbols }),
        limit: String(limit ?? 10),
        provider,
      });
      return (
        data.results?.map((a) => ({
          title: a.title,
          date: a.date,
          url: a.url,
          source: a.source,
          symbols: a.symbols,
        })) ?? []
      );
    },
  },
  {
    name: "getStockInfo",
    description:
      "Get company profile and fundamental information for a stock symbol",
    parameters: z.object({
      symbol: z.string().describe("Ticker symbol, e.g. AAPL"),
      provider: z.string().optional(),
    }),
    handler: async (params) => {
      const { symbol, provider } = params as {
        symbol: string;
        provider?: string;
      };
      const data = await fetchOpenBB(
        "equity/profile",
        { symbol, provider: provider ?? "yfinance" },
      );
      return (data as OpenBBResponse).results?.[0] ?? null;
    },
  },
];
