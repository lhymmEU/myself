"use client";

/**
 * Pair-lobster dialog (cloud mode only).
 *
 * Issues a 6-digit code via POST /api/claw/pair, shows it in a big monospace
 * widget, and instructs the user to run `npx lobsterd pair <code>` on their
 * machine. Polls /api/claw/connections every few seconds; once a new
 * `transport: relay` row appears, the dialog auto-closes.
 */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Plus } from "lucide-react";

interface PairLobsterProps {
  onPaired?: () => void;
}

export function PairLobster({ onPaired }: PairLobsterProps) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestCode = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/claw/pair", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not allocate pairing code");
      }
      const json = (await res.json()) as { code: string; expiresAt: number };
      setCode(json.code);
      setExpiresAt(json.expiresAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start pairing");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!code || !open) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/claw/connections");
        if (!res.ok) return;
        const json = (await res.json()) as {
          connections: { transport?: string; pairingCode?: string }[];
        };
        const matched = json.connections?.some(
          (c) => c.transport === "relay" && c.pairingCode,
        );
        if (matched) {
          setOpen(false);
          setCode(null);
          onPaired?.();
        }
      } catch {
        // ignored
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [code, open, onPaired]);

  const remaining =
    expiresAt && open
      ? Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
      : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setCode(null);
          setExpiresAt(null);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add lobster
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pair a lobster</DialogTitle>
          <DialogDescription>
            On the machine you want to use as a lobster, install this repo and
            run the pairing command shown below. The code is valid for five
            minutes.
          </DialogDescription>
        </DialogHeader>

        {!code && (
          <div className="flex justify-center py-6">
            <Button onClick={requestCode} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Generate pairing code
            </Button>
          </div>
        )}

        {code && (
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/40 p-6 text-center">
              <div className="font-mono text-4xl tracking-[0.5rem] tabular-nums">
                {code}
              </div>
              {remaining !== null && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Expires in {remaining}s
                </div>
              )}
            </div>

            <div className="rounded-md border bg-muted/40 p-3 text-xs font-mono">
              npm run lobsterd -- pair {code} \<br />
              {"  "}--cloud-url{" "}
              {typeof window !== "undefined" ? window.location.origin : ""} \
              <br />
              {"  "}--relay-url wss://YOUR-RELAY-WORKER.workers.dev
            </div>

            <p className="text-xs text-muted-foreground">
              The dialog will close automatically once your lobster connects.
            </p>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
