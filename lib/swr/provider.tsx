"use client";

import { SWRConfig } from "swr";
import { swrDefaults } from "./config";

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return <SWRConfig value={swrDefaults}>{children}</SWRConfig>;
}
