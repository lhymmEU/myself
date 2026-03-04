export type SettingKey =
  | "openrouter_api_key"
  | "llm_model"
  | "llm_temperature"
  | "default_currency"
  | "fiscal_year_start"
  | "budget_period"
  | "theme"
  | "accent_color";

export interface SettingRecord {
  key: string;
  value: string;
  updatedAt: number;
}
