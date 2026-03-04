export const SETTING_DEFAULTS: Record<string, string> = {
  openrouter_api_key: "",
  llm_model: "anthropic/claude-sonnet-4",
  llm_temperature: "0.7",
  default_currency: "USD",
  fiscal_year_start: "1",
  budget_period: "monthly",
  theme: "system",
  accent_color: "#6366f1",
};

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
