import { isLocal } from "@/lib/core/runtime";

const LOCAL_ONLY_DEFAULTS: Record<string, string> = {
  openrouter_api_key: "",
  llm_model: "anthropic/claude-sonnet-4",
  llm_temperature: "0.7",
};

const COMMON_DEFAULTS: Record<string, string> = {
  theme: "system",
  accent_color: "#6366f1",
};

export const SETTING_DEFAULTS: Record<string, string> = isLocal()
  ? { ...LOCAL_ONLY_DEFAULTS, ...COMMON_DEFAULTS }
  : { ...COMMON_DEFAULTS };

export const CURRENCIES = [
  "USD", "EUR", "GBP", "JPY", "CNY", "CAD", "AUD", "CHF", "INR", "KRW",
] as const;
