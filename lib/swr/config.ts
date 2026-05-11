"use client";

import { SWRConfig } from "swr";

export const swrFetcher = async (url: string) => {
  const res = await fetch(url, {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    const err = new Error("Fetch failed");
    (err as unknown as Record<string, unknown>).status = res.status;
    throw err;
  }
  return res.json();
};

export const swrDefaults: React.ComponentProps<typeof SWRConfig>["value"] = {
  fetcher: swrFetcher,
  dedupingInterval: 10_000,
  revalidateOnFocus: true,
  revalidateIfStale: true,
  errorRetryCount: 2,
};
