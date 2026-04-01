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

export interface EtfSearchResult {
  symbol: string;
  name: string;
  exchange?: string;
}

export interface EtfInfo {
  symbol: string;
  name: string;
  description?: string;
  asset_class?: string;
  expense_ratio?: number;
  inception_date?: string;
}

export interface EtfHolding {
  symbol: string;
  name: string;
  weight: number;
  shares?: number;
  market_value?: number;
}

export interface CommoditySpot {
  date: string;
  symbol: string;
  price: number;
  change?: number;
  change_percent?: number;
}

export interface OptionsChain {
  strike: number;
  expiration: string;
  option_type: string;
  bid: number;
  ask: number;
  volume?: number;
  open_interest?: number;
  implied_volatility?: number;
}

export interface UnusualActivity {
  symbol: string;
  strike: number;
  expiration: string;
  option_type: string;
  volume: number;
  open_interest: number;
  sentiment?: string;
}

export interface BondIndex {
  date: string;
  name?: string;
  value: number;
  change?: number;
}

export interface MortgageIndex {
  date: string;
  name?: string;
  rate: number;
}

export interface TIPSYield {
  date: string;
  maturity: string;
  yield: number;
}

export interface SP500Multiples {
  date: string;
  pe_ratio?: number;
  earnings_yield?: number;
  dividend_yield?: number;
  book_value?: number;
}

export interface TechnicalIndicator {
  date: string;
  value?: number;
  close?: number;
  [key: string]: unknown;
}

export interface QuantitativeSummary {
  symbol?: string;
  mean?: number;
  std?: number;
  variance?: number;
  skew?: number;
  kurtosis?: number;
  min?: number;
  max?: number;
  count?: number;
}

export interface SECFiling {
  cik: string;
  company_name: string;
  form_type?: string;
  date_filed?: string;
  url?: string;
}

export interface CongressBill {
  bill_id?: string;
  title: string;
  date?: string;
  status?: string;
  congress?: number;
  bill_type?: string;
  url?: string;
}
