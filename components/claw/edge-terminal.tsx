"use client";

/**
 * Browser-side SSH terminal for `transport: "edge"` connections.
 *
 * Wires xterm.js up to the WASM SSH client (`gossh-wasm`) provided by
 * `lib/modules/claw/transport-edge.ts`. The Cloudflare Worker is just a
 * raw TCP bridge — every byte on this terminal travels inside an SSH
 * tunnel that terminates inside the WASM module on one end and on the
 * user's sshd on the other.
 *
 * Three operational states:
 *   1. Vault locked  — show inline unlock prompt (we cannot decrypt the
 *      stored credential without the master key).
 *   2. Awaiting host-key TOFU — first connect surfaces the SHA256
 *      fingerprint and a binary "trust / reject" choice. Trust persists
 *      the fingerprint via PATCH /api/claw/connections, exact-match on
 *      every subsequent connect.
 *   3. Connected — xterm streams to/from the SSH session.
 *
 * The edge terminal is cloud-only; the local install uses
 * `components/claw/terminal.tsx` against ssh2 directly.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  Loader2,
  Lock,
  Plug,
  Power,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import {
  getCloudVaultStatus,
  isVaultClientUnlocked,
  subscribeVaultClient,
  unlockCloudVault,
} from "@/lib/modules/vault/client";
import { loadEdgeCredential } from "@/lib/modules/claw/edge-credentials";
import {
  openEdgeSession,
  type EdgeSession,
  type HostKeyInfo,
} from "@/lib/modules/claw/transport-edge";

interface EdgeTerminalProps {
  connectionId: string | null;
  /** Optional snapshot of the connection row. Saves an extra fetch and
   *  lets us TOFU-check `hostKeyFingerprint` immediately. */
  connection?: {
    id: string;
    name: string;
    transport?: string;
    credentialSecretId?: string;
    hostKeyFingerprint?: string;
  } | null;
}

type Phase =
  | "idle"
  | "unlock"
  | "loading-credential"
  | "awaiting-host-key"
  | "connecting"
  | "connected"
  | "closed"
  | "error";

interface PendingHostKey {
  info: HostKeyInfo;
  resolve: (accept: boolean) => void;
}

export function EdgeTerminal({ connectionId, connection }: EdgeTerminalProps) {
  const termRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<import("@xterm/xterm").Terminal | null>(null);
  const fitRef = useRef<import("@xterm/addon-fit").FitAddon | null>(null);
  const sessionRef = useRef<EdgeSession | null>(null);

  const [vaultUnlocked, setVaultUnlocked] = useState(() =>
    isVaultClientUnlocked(),
  );
  const [vaultPassword, setVaultPassword] = useState("");
  const [vaultUnlocking, setVaultUnlocking] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pendingHostKey, setPendingHostKey] = useState<PendingHostKey | null>(
    null,
  );
  const [statusLine, setStatusLine] = useState<string>("");

  const trustedFingerprint = connection?.hostKeyFingerprint ?? null;

  const stableConnection = useMemo(() => connection ?? null, [connection]);

  useEffect(() => {
    return subscribeVaultClient(() => {
      setVaultUnlocked(isVaultClientUnlocked());
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await getCloudVaultStatus();
        if (cancelled) return;
        setVaultUnlocked(status.unlocked || isVaultClientUnlocked());
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!termRef.current) return;
    let mounted = true;
    let resizeObserver: ResizeObserver | null = null;

    (async () => {
      const { Terminal } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");
      const { WebLinksAddon } = await import("@xterm/addon-web-links");

      if (!mounted || !termRef.current) return;

      const term = new Terminal({
        cursorBlink: true,
        fontFamily: "'Geist Mono', 'SF Mono', Menlo, monospace",
        fontSize: 13,
        lineHeight: 1.4,
        theme: {
          background: "#09090b",
          foreground: "#fafafa",
          cursor: "#a1a1aa",
          selectionBackground: "#27272a",
        },
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.loadAddon(new WebLinksAddon());
      term.open(termRef.current);
      fit.fit();

      xtermRef.current = term;
      fitRef.current = fit;

      resizeObserver = new ResizeObserver(() => {
        try {
          fit.fit();
        } catch {
          // terminal not ready
        }
      });
      resizeObserver.observe(termRef.current);
    })();

    return () => {
      mounted = false;
      resizeObserver?.disconnect();
      sessionRef.current?.close();
      sessionRef.current = null;
      xtermRef.current?.dispose();
      xtermRef.current = null;
      fitRef.current = null;
    };
  }, []);

  const handleUnlock = useCallback(async () => {
    if (!vaultPassword) return;
    setVaultUnlocking(true);
    setError(null);
    try {
      const ok = await unlockCloudVault(vaultPassword);
      if (!ok) {
        setError("Incorrect password.");
        return;
      }
      setVaultPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unlock vault");
    } finally {
      setVaultUnlocking(false);
    }
  }, [vaultPassword]);

  const persistFingerprint = useCallback(
    async (fingerprint: string) => {
      if (!connectionId) return;
      try {
        await fetch("/api/claw/connections", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: connectionId,
            hostKeyFingerprint: fingerprint,
          }),
        });
      } catch {
        // best-effort; the fingerprint is captured in DB on next successful connect
      }
    },
    [connectionId],
  );

  const handleConnect = useCallback(async () => {
    setError(null);
    if (!connectionId) {
      setError("No connection selected.");
      return;
    }
    if (!stableConnection?.credentialSecretId) {
      setError(
        "This connection has no vault credential. Re-add the server.",
      );
      return;
    }
    if (!isVaultClientUnlocked()) {
      setPhase("unlock");
      return;
    }
    if (!xtermRef.current) {
      setError("Terminal is still initialising. Try again in a moment.");
      return;
    }

    setPhase("loading-credential");
    setStatusLine("Decrypting credential…");
    let credential;
    try {
      credential = await loadEdgeCredential(
        stableConnection.credentialSecretId,
      );
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "Failed to load credential");
      return;
    }

    setPhase("connecting");
    setStatusLine("Connecting to relay…");

    try {
      const session = await openEdgeSession({
        connectionId,
        credential,
        terminal: xtermRef.current,
        onBanner: (banner) => {
          if (xtermRef.current && banner) {
            xtermRef.current.write(`\r\n${banner}\r\n`);
          }
        },
        onHostKey: async (info) => {
          if (
            trustedFingerprint &&
            trustedFingerprint === info.fingerprint
          ) {
            return true;
          }
          if (
            trustedFingerprint &&
            trustedFingerprint !== info.fingerprint
          ) {
            // Hard-fail on mismatch — surface to user before any auth.
            setPendingHostKey({
              info,
              resolve: (accept) => {
                setPendingHostKey(null);
                if (accept) {
                  void persistFingerprint(info.fingerprint);
                }
              },
            });
            setPhase("awaiting-host-key");
            return await new Promise<boolean>((resolve) => {
              setPendingHostKey({
                info,
                resolve: (accept) => {
                  setPendingHostKey(null);
                  if (accept) void persistFingerprint(info.fingerprint);
                  resolve(accept);
                },
              });
            });
          }
          // First-use TOFU prompt.
          setPhase("awaiting-host-key");
          return await new Promise<boolean>((resolve) => {
            setPendingHostKey({
              info,
              resolve: (accept) => {
                setPendingHostKey(null);
                if (accept) void persistFingerprint(info.fingerprint);
                resolve(accept);
              },
            });
          });
        },
      });
      sessionRef.current = session;
      setPhase("connected");
      setStatusLine(
        `Connected — ${stableConnection.name ?? connectionId}`,
      );
      session.onClose((reason) => {
        sessionRef.current = null;
        setPhase("closed");
        setStatusLine(`Session closed${reason ? `: ${reason}` : ""}`);
      });
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "Failed to connect");
    }
  }, [
    connectionId,
    persistFingerprint,
    stableConnection,
    trustedFingerprint,
  ]);

  const handleDisconnect = useCallback(() => {
    sessionRef.current?.close();
    sessionRef.current = null;
    setPhase("closed");
  }, []);

  const fingerprintMismatch = Boolean(
    pendingHostKey &&
      trustedFingerprint &&
      pendingHostKey.info.fingerprint !== trustedFingerprint,
  );

  const isConnected = phase === "connected";
  const isBusy =
    phase === "loading-credential" ||
    phase === "connecting" ||
    phase === "awaiting-host-key";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {!isConnected ? (
          <Button
            size="sm"
            onClick={handleConnect}
            disabled={!connectionId || isBusy}
          >
            {isBusy ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Plug className="h-3.5 w-3.5 mr-1.5" />
            )}
            {phase === "connecting"
              ? "Connecting…"
              : phase === "loading-credential"
                ? "Decrypting…"
                : "Connect"}
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={handleDisconnect}>
            <Power className="h-3.5 w-3.5 mr-1.5" />
            Disconnect
          </Button>
        )}
        {statusLine && (
          <span className="text-xs text-muted-foreground ml-auto">
            {statusLine}
          </span>
        )}
      </div>

      {!vaultUnlocked && phase === "unlock" && (
        <div className="rounded-md border border-border bg-muted/40 p-3 space-y-2">
          <Label className="flex items-center gap-1.5 text-xs">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            Unlock the vault to decrypt the SSH credential.
          </Label>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="Vault master password"
              value={vaultPassword}
              onChange={(e) => setVaultPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
              autoFocus
            />
            <Button
              onClick={handleUnlock}
              disabled={vaultUnlocking || !vaultPassword}
            >
              {vaultUnlocking ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Lock className="h-3.5 w-3.5 mr-1.5" />
              )}
              Unlock
            </Button>
          </div>
        </div>
      )}

      {pendingHostKey && (
        <HostKeyPrompt
          info={pendingHostKey.info}
          mismatch={fingerprintMismatch}
          previous={trustedFingerprint}
          onAccept={() => pendingHostKey.resolve(true)}
          onReject={() => pendingHostKey.resolve(false)}
        />
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/20 rounded-md px-2.5 py-1.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      <div
        ref={termRef}
        className="rounded-md border border-border overflow-hidden bg-[#09090b]"
        style={{ height: "450px" }}
      />
    </div>
  );
}

interface HostKeyPromptProps {
  info: HostKeyInfo;
  mismatch: boolean;
  previous: string | null;
  onAccept: () => void;
  onReject: () => void;
}

function HostKeyPrompt({
  info,
  mismatch,
  previous,
  onAccept,
  onReject,
}: HostKeyPromptProps) {
  return (
    <div
      className={`rounded-md border p-3 space-y-2 ${
        mismatch
          ? "border-red-700 bg-red-950/30"
          : "border-amber-700 bg-amber-950/20"
      }`}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        {mismatch ? (
          <ShieldAlert className="h-4 w-4 text-red-400" />
        ) : (
          <ShieldCheck className="h-4 w-4 text-amber-400" />
        )}
        {mismatch
          ? "Host key changed — investigate before reconnecting"
          : "Verify the server's host key"}
      </div>
      <div className="text-xs space-y-1 font-mono">
        <div>
          <span className="text-muted-foreground">host:</span> {info.host}:
          {info.port}
        </div>
        <div>
          <span className="text-muted-foreground">type:</span> {info.type}
        </div>
        <div>
          <span className="text-muted-foreground">fingerprint:</span>{" "}
          {info.fingerprint}
        </div>
        {previous && (
          <div>
            <span className="text-muted-foreground">previous:</span> {previous}
          </div>
        )}
      </div>
      {mismatch ? (
        <p className="text-xs text-red-300">
          The server presented a different host key than the one we
          recorded. This could mean the server was rebuilt — or someone is
          intercepting your traffic. Cancel, verify out-of-band, and then
          accept only if you intentionally rotated the key.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          We&apos;ll remember this fingerprint and reject connections that
          don&apos;t match it on subsequent connects.
        </p>
      )}
      <div className="flex justify-end gap-2 pt-1">
        <Button size="sm" variant="ghost" onClick={onReject}>
          Cancel
        </Button>
        <Button
          size="sm"
          variant={mismatch ? "destructive" : "default"}
          onClick={onAccept}
        >
          {mismatch ? "Trust new key" : "Trust this key"}
        </Button>
      </div>
    </div>
  );
}
