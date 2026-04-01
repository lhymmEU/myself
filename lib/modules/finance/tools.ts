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
  {
    name: "getETFInfo",
    description:
      "Get ETF information including holdings, expense ratio, and asset class",
    parameters: z.object({
      symbol: z.string().describe("ETF symbol, e.g. SPY, QQQ"),
      provider: z.string().optional(),
    }),
    handler: async (params) => {
      const { symbol, provider } = params as {
        symbol: string;
        provider?: string;
      };
      const data = await fetchOpenBB("etf/info", {
        symbol,
        provider: provider ?? "fmp",
      });
      return (data as OpenBBResponse).results?.[0] ?? null;
    },
  },
  {
    name: "getETFHoldings",
    description: "Get the top holdings of an ETF",
    parameters: z.object({
      symbol: z.string().describe("ETF symbol, e.g. SPY"),
      provider: z.string().optional(),
    }),
    handler: async (params) => {
      const { symbol, provider } = params as {
        symbol: string;
        provider?: string;
      };
      const data = await fetchOpenBB("etf/holdings", {
        symbol,
        provider: provider ?? "fmp",
      });
      return (data as OpenBBResponse).results?.slice(0, 20) ?? [];
    },
  },
  {
    name: "getTreasuryRates",
    description:
      "Get current US Treasury yield curve rates across maturities",
    parameters: z.object({
      provider: z.string().optional(),
    }),
    handler: async (params) => {
      const { provider } = params as { provider?: string };
      const data = await fetchOpenBB(
        "fixedincome/government/treasury_rates",
        { provider: provider ?? "federal_reserve" },
      );
      return (data as OpenBBResponse).results?.slice(-5) ?? [];
    },
  },
  {
    name: "getOptionsChain",
    description: "Get options chain data for a stock symbol",
    parameters: z.object({
      symbol: z.string().describe("Ticker symbol"),
      provider: z.string().optional(),
    }),
    handler: async (params) => {
      const { symbol, provider } = params as {
        symbol: string;
        provider?: string;
      };
      const data = await fetchOpenBB("derivatives/options/chains", {
        symbol,
        provider: provider ?? "tradier",
      });
      return (data as OpenBBResponse).results?.slice(0, 30) ?? [];
    },
  },
  {
    name: "getCongressBills",
    description: "Get recent US Congressional bills",
    parameters: z.object({
      limit: z.number().optional().describe("Number of bills to return"),
    }),
    handler: async (params) => {
      const { limit } = params as { limit?: number };
      const data = await fetchOpenBB("uscongress/bills", {
        limit: String(limit ?? 10),
      });
      return (data as OpenBBResponse).results?.slice(0, 20) ?? [];
    },
  },
  {
    name: "getSP500Multiples",
    description:
      "Get S&P 500 valuation multiples like PE ratio, dividend yield",
    parameters: z.object({}),
    handler: async () => {
      const data = await fetchOpenBB("index/sp500_multiples", {
        provider: "multpl",
      });
      return (data as OpenBBResponse).results?.slice(-5) ?? [];
    },
  },
];
