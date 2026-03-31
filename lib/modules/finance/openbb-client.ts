import { getSetting } from "@/lib/modules/settings/actions";

const DEFAULT_URL = "http://localhost:6900";

function getBaseUrl(): string {
  return getSetting("openbb_api_url") || DEFAULT_URL;
}

export async function fetchOpenBB<T = unknown>(
  endpoint: string,
  params?: Record<string, string>,
): Promise<T> {
  const base = getBaseUrl();
  const url = new URL(`/api/v1/${endpoint}`, base);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, value);
      }
    }
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `OpenBB API error ${res.status}: ${body || res.statusText}`,
    );
  }

  return res.json();
}

export async function checkConnection(): Promise<boolean> {
  try {
    const base = getBaseUrl();
    const res = await fetch(base, {
      signal: AbortSignal.timeout(5_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
