import { getSetting } from "@/lib/modules/settings/actions";
import { isLocal } from "@/lib/core/runtime";

const DEFAULT_URL = "http://127.0.0.1:6900";

const CLOUD_DISABLED_MESSAGE =
  "OpenBB market data is only available when DEPLOYMENT_MODE=local (self-hosted OpenBB on the same machine).";

function ensureLocal(): void {
  if (!isLocal()) {
    throw new Error(CLOUD_DISABLED_MESSAGE);
  }
}

async function getBaseUrl(userId: string): Promise<string> {
  return (await getSetting("openbb_api_url", userId)) || DEFAULT_URL;
}

export async function fetchOpenBB<T = unknown>(
  endpoint: string,
  params: Record<string, string> | undefined,
  userId: string,
): Promise<T> {
  ensureLocal();
  const base = await getBaseUrl(userId);
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

export async function checkConnection(userId: string): Promise<boolean> {
  if (!isLocal()) return false;
  try {
    const base = await getBaseUrl(userId);
    const res = await fetch(base, {
      signal: AbortSignal.timeout(5_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
