/**
 * Safety helpers for the `/dial` TCP bridge.
 *
 * The Worker MUST refuse to open a TCP socket to:
 *   - private/internal IP space (RFC1918, loopback, link-local, multicast,
 *     reserved blocks). 169.254.169.254 in particular is the AWS / GCP /
 *     Azure metadata endpoint and would let an attacker who tricks a victim
 *     into adding a "server" pivot into instance credentials.
 *   - the cluster of SMTP ports (25/465/587). Cloudflare blocks 25 outbound
 *     anyway, but blocking the others heads off spam-relay abuse.
 *
 * Hostnames are resolved via DNS-over-HTTPS (Cloudflare 1.1.1.1) before we
 * connect, and the returned IP is what we hand to `connect()` — that
 * defeats DNS-rebinding attacks (where a hostname resolves "fine" the first
 * time and then flips to a private IP for the actual socket).
 */

export interface SafeAddressOk {
  ok: true;
  address: string;
  family: "ipv4" | "ipv6";
}

export interface SafeAddressFail {
  ok: false;
  reason: string;
}

export type SafeAddressResult = SafeAddressOk | SafeAddressFail;

const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

function parseIPv4(s: string): number[] | null {
  const m = IPV4_RE.exec(s);
  if (!m) return null;
  const parts = [m[1], m[2], m[3], m[4]].map((p) => Number(p));
  if (parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return parts;
}

export function isPrivateIPv4(ip: string): boolean {
  const parts = parseIPv4(ip);
  if (!parts) return true;
  const a = parts[0]!;
  const b = parts[1]!;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // RFC1918
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
  if (a === 192 && b === 0) return true; // protocol assignments / TEST-NET-1
  if (a === 192 && b === 168) return true; // RFC1918
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmark
  if (a === 198 && b === 51) return true; // TEST-NET-2 (198.51.100.0/24)
  if (a === 203 && b === 0) return true; // TEST-NET-3 (203.0.113.0/24)
  if (a >= 224) return true; // multicast (224/4) + reserved (240/4) + 255.255.255.255
  return false;
}

/**
 * Conservative IPv6 private-range check. Recognises canonical literals;
 * non-canonical forms (mixed-case, embedded IPv4) fall through and are
 * rejected as "unsafe". We only need to be permissive for *public* IPs.
 */
export function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase().trim();
  if (lower === "::" || lower === "::1") return true;
  if (lower.startsWith("fe8") || lower.startsWith("fe9") ||
      lower.startsWith("fea") || lower.startsWith("feb")) return true; // fe80::/10
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // fc00::/7 (ULA)
  if (lower.startsWith("ff")) return true; // ff00::/8 multicast
  if (lower.startsWith("::ffff:")) {
    // IPv4-mapped IPv6 — pull out the embedded v4 and re-check.
    const embedded = lower.slice("::ffff:".length);
    return isPrivateIPv4(embedded);
  }
  // Anything that doesn't look like a valid public IPv6 → deny.
  if (!/^[0-9a-f:]+$/.test(lower)) return true;
  return false;
}

export function isPrivateAddress(host: string): boolean {
  const trimmed = host.trim();
  if (!trimmed) return true;
  if (parseIPv4(trimmed)) return isPrivateIPv4(trimmed);
  // IPv6 literals from URLs are bracketed; tolerate either form.
  const v6 = trimmed.startsWith("[") && trimmed.endsWith("]")
    ? trimmed.slice(1, -1)
    : trimmed;
  if (v6.includes(":")) return isPrivateIPv6(v6);
  return false;
}

const BLOCKED_PORTS: ReadonlySet<number> = new Set([25, 465, 587]);

export function isBlockedPort(port: number): boolean {
  if (!Number.isInteger(port)) return true;
  if (port < 1 || port > 65535) return true;
  return BLOCKED_PORTS.has(port);
}

interface DohAnswer {
  type: number;
  data: string;
}
interface DohResponse {
  Status: number;
  Answer?: DohAnswer[];
}

async function resolveDoH(
  name: string,
  type: "A" | "AAAA",
): Promise<string[]> {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`;
  const resp = await fetch(url, {
    headers: { accept: "application/dns-json" },
    cf: { cacheTtl: 60, cacheEverything: true },
  });
  if (!resp.ok) return [];
  const data = (await resp.json()) as DohResponse;
  if (data.Status !== 0 || !data.Answer) return [];
  const wantType = type === "A" ? 1 : 28;
  return data.Answer
    .filter((a) => a.type === wantType)
    .map((a) => a.data);
}

/**
 * Resolve `host` to a single IP we can pass to `connect()`, refusing
 * private / link-local / metadata addresses. Returns the IP literal so
 * `connect()` is given an IP, not a hostname — closing the DNS-rebinding
 * window between resolution and connect.
 */
export async function resolveSafeAddress(
  host: string,
): Promise<SafeAddressResult> {
  const trimmed = host.trim();
  if (!trimmed) return { ok: false, reason: "empty host" };

  // IP literal short-circuit.
  if (parseIPv4(trimmed)) {
    if (isPrivateIPv4(trimmed)) {
      return { ok: false, reason: `private/reserved IPv4 ${trimmed}` };
    }
    return { ok: true, address: trimmed, family: "ipv4" };
  }
  const v6Candidate =
    trimmed.startsWith("[") && trimmed.endsWith("]")
      ? trimmed.slice(1, -1)
      : trimmed;
  if (v6Candidate.includes(":") && /^[0-9a-fA-F:]+$/.test(v6Candidate)) {
    if (isPrivateIPv6(v6Candidate)) {
      return { ok: false, reason: `private/reserved IPv6 ${v6Candidate}` };
    }
    return { ok: true, address: v6Candidate, family: "ipv6" };
  }

  // Hostname — resolve via DoH. Try IPv4 first since it's the common case;
  // fall back to IPv6 if no A record.
  let v4: string[] = [];
  let v6: string[] = [];
  try {
    [v4, v6] = await Promise.all([
      resolveDoH(trimmed, "A"),
      resolveDoH(trimmed, "AAAA"),
    ]);
  } catch (err) {
    return {
      ok: false,
      reason: `DNS lookup failed: ${(err as Error).message}`,
    };
  }

  for (const ip of v4) {
    if (!isPrivateIPv4(ip)) {
      return { ok: true, address: ip, family: "ipv4" };
    }
  }
  for (const ip of v6) {
    if (!isPrivateIPv6(ip)) {
      return { ok: true, address: ip, family: "ipv6" };
    }
  }
  if (v4.length === 0 && v6.length === 0) {
    return { ok: false, reason: `host "${trimmed}" did not resolve` };
  }
  return {
    ok: false,
    reason: `host "${trimmed}" only resolved to private addresses`,
  };
}
