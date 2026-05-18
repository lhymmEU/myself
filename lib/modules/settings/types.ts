export type SettingKey =
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
