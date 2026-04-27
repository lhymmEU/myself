"use client";

/**
 * Browser-side edge transport (Flavor A).
 *
 * Loads `gossh-wasm` once per tab, opens a session against
 *   `wss://<RELAY>/dial/:connectionId?token=<JWT>`
 * and pumps SSH bytes between the WASM module and an xterm.js terminal.
 *
 * The Cloudflare Worker only ever sees ciphertext — SSH key exchange,
 * host-key verification, and authentication run inside the WASM module
 * and on the user's sshd. We pass the credentials directly into the
 * WASM module's local memory; they never touch any server.
 *
 * Public API:
 *   const session = await openEdgeSession({...});
 *   session.write(bytes);
 *   session.resize(cols, rows);
 *   session.close();
 *   session.onClose((reason) => ...);
 *
 * Note: this module is browser-only. It side-effects `window.GoSSH` and
 * `window.Go` through `wasm_exec.js`, so it must never be imported from
 * server components.
 */

import type { Terminal } from "@xterm/xterm";
import type { EdgeCredential } from "./edge-credentials";

export interface HostKeyInfo {
  /** SHA256 fingerprint, base64 — e.g. `SHA256:abcdef…` */
  fingerprint: string;
  /** Algorithm: `ssh-rsa`, `ssh-ed25519`, `ecdsa-sha2-nistp256`, … */
  type: string;
  /** Hostname / IP the session connected to */
  host: string;
  /** Port the session connected to */
  port: number;
}

export interface OpenEdgeSessionOptions {
  connectionId: string;
  credential: EdgeCredential;
  terminal: Terminal;
  /**
   * Called once per session at the host-key verification step. Resolve to
   * `true` to accept the host key (TOFU on first use, exact match on every
   * subsequent connect), or `false` to abort the connection.
   *
   * The host-key fingerprint is the same value sshd would print as
   * `ssh-keyscan -t <type> host` → SHA256 — store it on the connection row
   * so subsequent connects fail closed if the server ever rotates keys
   * unexpectedly.
   */
  onHostKey: (info: HostKeyInfo) => Promise<boolean>;
  /** Optional banner from sshd (e.g. /etc/issue.net). Sent before auth. */
  onBanner?: (banner: string) => void;
}

export interface EdgeSession {
  sessionId: string;
  write: (data: Uint8Array) => void;
  resize: (cols: number, rows: number) => void;
  close: () => void;
  onClose: (handler: (reason: string) => void) => void;
}

interface GoSSHConnectConfig {
  proxyUrl: string;
  host: string;
  port: number;
  username: string;
  authMethod: "password" | "key" | "agent";
  password?: string;
  keyPEM?: string;
  keyPassphrase?: string;
  cols?: number;
  rows?: number;
  token?: string;
  allowInsecureWS?: boolean;
  onData: (data: Uint8Array) => void;
  onClose: (reason: string) => void;
  onHostKey: (info: HostKeyInfo) => Promise<boolean>;
  onBanner?: (banner: string) => void;
}

interface GoSSHGlobal {
  connect: (config: GoSSHConnectConfig) => Promise<string>;
  write: (sessionId: string, data: Uint8Array) => void;
  resize: (sessionId: string, cols: number, rows: number) => void;
  disconnect: (sessionId: string) => void;
}

interface GoCtor {
  new (): {
    importObject: WebAssembly.Imports;
    run: (instance: WebAssembly.Instance) => void;
  };
}

declare global {
  interface Window {
    Go?: GoCtor;
    GoSSH?: GoSSHGlobal;
  }
}

const WASM_URL = "/wasm/gossh.wasm";
const WASM_EXEC_URL = "/wasm/wasm_exec.js";

let _wasmLoadPromise: Promise<GoSSHGlobal> | null = null;

async function loadGoSSH(): Promise<GoSSHGlobal> {
  if (_wasmLoadPromise) return _wasmLoadPromise;
  _wasmLoadPromise = (async () => {
    if (typeof window === "undefined") {
      throw new Error("openEdgeSession can only run in the browser.");
    }
    if (!window.GoSSH) {
      // Inject wasm_exec.js if not already loaded.
      if (!window.Go) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = WASM_EXEC_URL;
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () =>
            reject(new Error("Failed to load /wasm/wasm_exec.js"));
          document.head.appendChild(script);
        });
      }
      const Go = window.Go;
      if (!Go) {
        throw new Error("wasm_exec.js loaded but window.Go is missing");
      }
      const go = new Go();
      const wasmResp = await fetch(WASM_URL);
      if (!wasmResp.ok) {
        throw new Error(
          `Failed to fetch ${WASM_URL}: HTTP ${wasmResp.status}`,
        );
      }
      const { instance } = await WebAssembly.instantiateStreaming(
        wasmResp,
        go.importObject,
      );
      // `go.run` resolves only when the wasm process exits — start it
      // detached and wait for the exported global to appear.
      go.run(instance);
      const start = Date.now();
      while (!window.GoSSH) {
        if (Date.now() - start > 5000) {
          throw new Error(
            "gossh.wasm started but window.GoSSH never registered",
          );
        }
        await new Promise((r) => setTimeout(r, 16));
      }
    }
    return window.GoSSH!;
  })();
  return _wasmLoadPromise;
}

interface DialTokenResponse {
  token: string;
  connectionId: string;
  host: string;
  port: number;
  expiresAt: number;
  dialUrl: string;
}

async function mintDialToken(connectionId: string): Promise<DialTokenResponse> {
  const res = await fetch("/api/claw/edge-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ connectionId }),
  });
  if (!res.ok) {
    let message = `edge-token failed: HTTP ${res.status}`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return (await res.json()) as DialTokenResponse;
}

export async function openEdgeSession(
  options: OpenEdgeSessionOptions,
): Promise<EdgeSession> {
  const { connectionId, credential, terminal } = options;

  const [GoSSH, dial] = await Promise.all([
    loadGoSSH(),
    mintDialToken(connectionId),
  ]);

  // Carry user input from xterm into the WASM session. We capture the
  // sessionId after `connect()` resolves; until then writes are buffered.
  const writeQueue: Uint8Array[] = [];
  let sessionIdRef: string | null = null;
  const onTermDataDispose = terminal.onData((s: string) => {
    const bytes = new TextEncoder().encode(s);
    if (sessionIdRef) {
      try {
        GoSSH.write(sessionIdRef, bytes);
      } catch {
        // session torn down between callbacks; ignore.
      }
    } else {
      writeQueue.push(bytes);
    }
  });
  const onTermResizeDispose = terminal.onResize(({ cols, rows }) => {
    if (sessionIdRef) {
      try {
        GoSSH.resize(sessionIdRef, cols, rows);
      } catch {
        // session gone
      }
    }
  });

  const closeHandlers = new Set<(reason: string) => void>();
  let closed = false;
  const fireClose = (reason: string) => {
    if (closed) return;
    closed = true;
    onTermDataDispose.dispose();
    onTermResizeDispose.dispose();
    for (const h of closeHandlers) {
      try {
        h(reason);
      } catch {
        // ignored
      }
    }
  };

  const connectConfig: GoSSHConnectConfig = {
    proxyUrl: dial.dialUrl,
    host: dial.host,
    port: dial.port,
    username: "", // filled below
    authMethod: credential.authMethod,
    cols: terminal.cols,
    rows: terminal.rows,
    token: dial.token,
    onData: (data) => {
      try {
        terminal.write(data);
      } catch {
        // terminal disposed mid-stream
      }
    },
    onClose: (reason) => fireClose(reason),
    onHostKey: options.onHostKey,
    onBanner: options.onBanner,
  };
  if (credential.authMethod === "password") {
    connectConfig.password = credential.password;
  } else {
    connectConfig.keyPEM = credential.privateKey;
    if (credential.passphrase) {
      connectConfig.keyPassphrase = credential.passphrase;
    }
  }

  // The connection's username is on the dial config too — but the dial
  // route stores it on the row in the DB and the JWT only carries
  // host/port. We read username from the public connections list so the
  // JWT stays minimal. This separate fetch is cheap and runs in parallel
  // with the WASM warm-up.
  const username = await fetchConnectionUsername(connectionId);
  connectConfig.username = username;

  let sessionId: string;
  try {
    sessionId = await GoSSH.connect(connectConfig);
  } catch (err) {
    fireClose(err instanceof Error ? err.message : "connect failed");
    throw err;
  }
  sessionIdRef = sessionId;

  // Flush buffered keystrokes that arrived during WASM init.
  for (const buf of writeQueue) {
    try {
      GoSSH.write(sessionId, buf);
    } catch {
      // session ended during flush
      break;
    }
  }
  writeQueue.length = 0;

  return {
    sessionId,
    write: (data) => {
      if (closed) return;
      try {
        GoSSH.write(sessionId, data);
      } catch {
        // session torn down
      }
    },
    resize: (cols, rows) => {
      if (closed) return;
      try {
        GoSSH.resize(sessionId, cols, rows);
      } catch {
        // session torn down
      }
    },
    close: () => {
      if (closed) return;
      try {
        GoSSH.disconnect(sessionId);
      } catch {
        // already gone
      }
      fireClose("client closed");
    },
    onClose: (handler) => {
      closeHandlers.add(handler);
    },
  };
}

interface ConnectionRowSummary {
  id: string;
  username?: string;
}

async function fetchConnectionUsername(connectionId: string): Promise<string> {
  const res = await fetch("/api/claw/connections");
  if (!res.ok) {
    throw new Error("Could not look up connection username");
  }
  const json = (await res.json()) as
    | ConnectionRowSummary[]
    | { connections?: ConnectionRowSummary[] };
  const list = Array.isArray(json) ? json : (json.connections ?? []);
  const match = list.find((c) => c.id === connectionId);
  if (!match || !match.username) {
    throw new Error("Connection has no username configured");
  }
  return match.username;
}
