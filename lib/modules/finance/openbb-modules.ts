export type OpenBBCategory =
  | "markets"
  | "equity"
  | "fixedIncome"
  | "crypto"
  | "currency"
  | "etf"
  | "economy"
  | "commodity"
  | "derivatives"
  | "news"
  | "technical"
  | "quantitative"
  | "regulators";

export interface OpenBBModule {
  id: string;
  category: OpenBBCategory;
  labelKey: string;
  descriptionKey: string;
  defaultEnabled: boolean;
  endpoints: string[];
  requiredProviders?: string[];
}

export const OPENBB_CATEGORIES: { id: OpenBBCategory; labelKey: string }[] = [
  { id: "markets", labelKey: "finance.modules.categories.markets" },
  { id: "equity", labelKey: "finance.modules.categories.equity" },
  { id: "fixedIncome", labelKey: "finance.modules.categories.fixedIncome" },
  { id: "crypto", labelKey: "finance.modules.categories.crypto" },
  { id: "currency", labelKey: "finance.modules.categories.currency" },
  { id: "etf", labelKey: "finance.modules.categories.etf" },
  { id: "economy", labelKey: "finance.modules.categories.economy" },
  { id: "commodity", labelKey: "finance.modules.categories.commodity" },
  { id: "derivatives", labelKey: "finance.modules.categories.derivatives" },
  { id: "news", labelKey: "finance.modules.categories.news" },
  { id: "technical", labelKey: "finance.modules.categories.technical" },
  { id: "quantitative", labelKey: "finance.modules.categories.quantitative" },
  { id: "regulators", labelKey: "finance.modules.categories.regulators" },
];

export const OPENBB_MODULES: OpenBBModule[] = [
  // Markets
  {
    id: "market-indices",
    category: "markets",
    labelKey: "finance.modules.marketIndices",
    descriptionKey: "finance.modules.desc.marketIndices",
    defaultEnabled: true,
    endpoints: ["index/snapshots"],
  },
  {
    id: "sp500-multiples",
    category: "markets",
    labelKey: "finance.modules.sp500Multiples",
    descriptionKey: "finance.modules.desc.sp500Multiples",
    defaultEnabled: false,
    endpoints: ["index/sp500_multiples"],
  },

  // Equity
  {
    id: "equity",
    category: "equity",
    labelKey: "finance.modules.equity",
    descriptionKey: "finance.modules.desc.equity",
    defaultEnabled: true,
    endpoints: ["equity/search", "equity/price/historical", "equity/profile"],
  },
  {
    id: "equity-screener",
    category: "equity",
    labelKey: "finance.modules.equityScreener",
    descriptionKey: "finance.modules.desc.equityScreener",
    defaultEnabled: false,
    endpoints: ["equity/screener"],
    requiredProviders: ["fmp_api_key"],
  },

  // Fixed Income
  {
    id: "treasury-rates",
    category: "fixedIncome",
    labelKey: "finance.modules.treasuryRates",
    descriptionKey: "finance.modules.desc.treasuryRates",
    defaultEnabled: true,
    endpoints: ["fixedincome/government/treasury_rates"],
  },
  {
    id: "bond-indices",
    category: "fixedIncome",
    labelKey: "finance.modules.bondIndices",
    descriptionKey: "finance.modules.desc.bondIndices",
    defaultEnabled: false,
    endpoints: ["fixedincome/bond_indices"],
  },
  {
    id: "mortgage-indices",
    category: "fixedIncome",
    labelKey: "finance.modules.mortgageIndices",
    descriptionKey: "finance.modules.desc.mortgageIndices",
    defaultEnabled: false,
    endpoints: ["fixedincome/mortgage_indices"],
  },
  {
    id: "tips-yields",
    category: "fixedIncome",
    labelKey: "finance.modules.tipsYields",
    descriptionKey: "finance.modules.desc.tipsYields",
    defaultEnabled: false,
    endpoints: ["fixedincome/government/tips_yields"],
  },

  // Crypto
  {
    id: "crypto",
    category: "crypto",
    labelKey: "finance.modules.crypto",
    descriptionKey: "finance.modules.desc.crypto",
    defaultEnabled: true,
    endpoints: ["crypto/search", "crypto/price/historical"],
  },

  // Currency
  {
    id: "currency-snapshots",
    category: "currency",
    labelKey: "finance.modules.currencySnapshots",
    descriptionKey: "finance.modules.desc.currencySnapshots",
    defaultEnabled: true,
    endpoints: ["currency/snapshots", "currency/price/historical"],
  },
  {
    id: "reference-rates",
    category: "currency",
    labelKey: "finance.modules.referenceRates",
    descriptionKey: "finance.modules.desc.referenceRates",
    defaultEnabled: false,
    endpoints: ["currency/reference_rates"],
  },

  // ETF
  {
    id: "etf",
    category: "etf",
    labelKey: "finance.modules.etf",
    descriptionKey: "finance.modules.desc.etf",
    defaultEnabled: false,
    endpoints: ["etf/search", "etf/info", "etf/holdings"],
    requiredProviders: ["fmp_api_key"],
  },

  // Economy
  {
    id: "economy-indicators",
    category: "economy",
    labelKey: "finance.modules.economyIndicators",
    descriptionKey: "finance.modules.desc.economyIndicators",
    defaultEnabled: true,
    endpoints: ["economy/indicators"],
  },
  {
    id: "interest-rates",
    category: "economy",
    labelKey: "finance.modules.interestRates",
    descriptionKey: "finance.modules.desc.interestRates",
    defaultEnabled: false,
    endpoints: ["economy/interest_rates"],
  },
  {
    id: "house-price-index",
    category: "economy",
    labelKey: "finance.modules.housePriceIndex",
    descriptionKey: "finance.modules.desc.housePriceIndex",
    defaultEnabled: false,
    endpoints: ["economy/house_price_index"],
  },

  // Commodity
  {
    id: "commodity",
    category: "commodity",
    labelKey: "finance.modules.commodity",
    descriptionKey: "finance.modules.desc.commodity",
    defaultEnabled: false,
    endpoints: ["commodity/spot"],
  },
  {
    id: "petroleum-status",
    category: "commodity",
    labelKey: "finance.modules.petroleumStatus",
    descriptionKey: "finance.modules.desc.petroleumStatus",
    defaultEnabled: false,
    endpoints: ["commodity/petroleum_status_report"],
  },

  // Derivatives
  {
    id: "options-chains",
    category: "derivatives",
    labelKey: "finance.modules.optionsChains",
    descriptionKey: "finance.modules.desc.optionsChains",
    defaultEnabled: false,
    endpoints: ["derivatives/options/chains"],
    requiredProviders: ["tradier_api_key"],
  },
  {
    id: "unusual-options",
    category: "derivatives",
    labelKey: "finance.modules.unusualOptions",
    descriptionKey: "finance.modules.desc.unusualOptions",
    defaultEnabled: false,
    endpoints: ["derivatives/options/unusual"],
  },

  // News
  {
    id: "news-world",
    category: "news",
    labelKey: "finance.modules.newsWorld",
    descriptionKey: "finance.modules.desc.newsWorld",
    defaultEnabled: true,
    endpoints: ["news/world"],
    requiredProviders: ["biztoc_api_key"],
  },
  {
    id: "news-company",
    category: "news",
    labelKey: "finance.modules.newsCompany",
    descriptionKey: "finance.modules.desc.newsCompany",
    defaultEnabled: true,
    endpoints: ["news/company"],
    requiredProviders: ["benzinga_api_key"],
  },

  // Technical
  {
    id: "technical",
    category: "technical",
    labelKey: "finance.modules.technical",
    descriptionKey: "finance.modules.desc.technical",
    defaultEnabled: false,
    endpoints: ["technical/sma", "technical/ema", "technical/atr", "technical/adx"],
  },

  // Quantitative
  {
    id: "quantitative",
    category: "quantitative",
    labelKey: "finance.modules.quantitative",
    descriptionKey: "finance.modules.desc.quantitative",
    defaultEnabled: false,
    endpoints: ["quantitative/summary", "quantitative/capm"],
  },

  // Regulators
  {
    id: "regulators",
    category: "regulators",
    labelKey: "finance.modules.regulators",
    descriptionKey: "finance.modules.desc.regulators",
    defaultEnabled: false,
    endpoints: ["regulators/sec/cik_map", "regulators/sec/institutions_search"],
  },
  {
    id: "congress",
    category: "regulators",
    labelKey: "finance.modules.congress",
    descriptionKey: "finance.modules.desc.congress",
    defaultEnabled: false,
    endpoints: ["uscongress/bills"],
  },
];

export function getDefaultEnabledModules(): string[] {
  return OPENBB_MODULES.filter((m) => m.defaultEnabled).map((m) => m.id);
}

export function getModuleById(id: string): OpenBBModule | undefined {
  return OPENBB_MODULES.find((m) => m.id === id);
}

export function getModulesByCategory(category: OpenBBCategory): OpenBBModule[] {
  return OPENBB_MODULES.filter((m) => m.category === category);
}
