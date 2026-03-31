export interface OpenBBResponse<T = unknown> {
  results: T[];
  provider: string;
  warnings: string[] | null;
  error: string | null;
}

export interface EquityHistorical {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number;
}

export interface EquityProfile {
  symbol: string;
  name: string;
  exchange: string;
  sector: string;
  industry: string;
  market_cap: number;
  description: string;
  website: string;
  currency: string;
  country: string;
}

export interface EquityQuote {
  symbol: string;
  name?: string;
  last_price: number;
  change: number;
  change_percent: number;
  volume: number;
  open: number;
  high: number;
  low: number;
  prev_close: number;
  market_cap?: number;
}

export interface EquitySearchResult {
  symbol: string;
  name: string;
  exchange?: string;
  exchange_short_name?: string;
}

export interface CryptoHistorical {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface EconomyIndicator {
  date: string;
  value: number;
  country?: string;
}

export interface TreasuryRate {
  date: string;
  month_1?: number;
  month_3?: number;
  month_6?: number;
  year_1?: number;
  year_2?: number;
  year_5?: number;
  year_10?: number;
  year_20?: number;
  year_30?: number;
}

export interface CurrencyRate {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface MarketIndex {
  symbol: string;
  name?: string;
  price?: number;
  change?: number;
  change_percent?: number;
  volume?: number;
}

export interface NewsArticle {
  date: string;
  title: string;
  text?: string;
  url: string;
  images?: { o?: string }[];
  symbols?: string;
  source?: string;
}
