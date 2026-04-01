export const SETTING_DEFAULTS: Record<string, string> = {
  openrouter_api_key: "",
  llm_model: "anthropic/claude-sonnet-4",
  llm_temperature: "0.7",
  theme: "system",
  accent_color: "#6366f1",
  openbb_api_url: "http://localhost:6900",
  claw_access_todos: "false",
  claw_access_finance: "false",
  claw_access_plans: "false",
  claw_access_wishlist: "false",
  claw_access_mindmap: "false",
  claw_access_skills: "false",

  fmp_api_key: "",
  polygon_api_key: "",
  benzinga_api_key: "",
  fred_api_key: "",
  nasdaq_api_key: "",
  intrinio_api_key: "",
  alpha_vantage_api_key: "",
  biztoc_api_key: "",
  tradier_api_key: "",
  tradier_account_type: "sandbox",
  tradingeconomics_api_key: "",
  tiingo_token: "",

  finance_default_mode: "market",
  finance_enabled_modules: JSON.stringify([
    "market-indices", "treasury-rates", "equity", "crypto",
    "currency-snapshots", "economy-indicators", "news-world", "news-company",
  ]),
  finance_module_order: JSON.stringify([
    "market-indices", "treasury-rates", "equity", "crypto",
    "currency-snapshots", "economy-indicators", "news-world", "news-company",
  ]),
};

export const CLAW_ACCESS_MODULES = [
  "todos",
  "finance",
  "plans",
  "wishlist",
  "mindmap",
  "skills",
] as const;

export type ClawAccessModule = (typeof CLAW_ACCESS_MODULES)[number];

export const LLM_MODELS = [
  { id: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4" },
  { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
  { id: "openai/gpt-4o", label: "GPT-4o" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { id: "google/gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B" },
] as const;

export const CURRENCIES = [
  "USD", "EUR", "GBP", "JPY", "CNY", "CAD", "AUD", "CHF", "INR", "KRW",
] as const;
