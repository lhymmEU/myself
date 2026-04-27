import { getSettingSync } from "@/lib/modules/settings/actions";
import { isLocal } from "@/lib/core/runtime";

// Use 127.0.0.1 instead of localhost: on Windows (and some Linux configs)
// `localhost` resolves to ::1 first, but openbb-api binds to 0.0.0.0/127.0.0.1
// only by default, producing instant ECONNREFUSED with a confusing error.
const DEFAULT_URL = "http://127.0.0.1:6900";

const CLOUD_DISABLED_MESSAGE =
  "OpenBB market data is only available in local installs. Cloud users can install Life Dashboard locally and run openbb-api on the same box to enable Market Intelligence.";

function ensureLocal(): void {
  if (!isLocal()) {
    throw new Error(CLOUD_DISABLED_MESSAGE);
  }
}

function getBaseUrl(): string {
  return getSettingSync("openbb_api_url") || DEFAULT_URL;
}

export async function fetchOpenBB<T = unknown>(
  endpoint: string,
  params?: Record<string, string>,
): Promise<T> {
  ensureLocal();
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
  if (!isLocal()) return false;
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
