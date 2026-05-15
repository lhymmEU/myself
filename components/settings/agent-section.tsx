"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import { Bot, Check, Copy, Loader2, PlayCircle, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { bootstrapAgent, sendToAgent } from "@/lib/modules/agent/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { swrFetcher } from "@/lib/swr/config";

interface RegistrationStatus {
  connected: boolean;
  label: string;
  connectedAt: number | null;
  lastSeenAt: number | null;
}

interface IssuedToken {
  token: string;
  supabaseUrl: string;
  userId: string;
  issuedAt: number;
}

const WATCHER_URL =
  typeof window !== "undefined" && window.location
    ? `${window.location.origin}/myself-op.js`
    : "/myself-op.js";

export function AgentSection() {
  const { data, error, isLoading, mutate } = useSWR<RegistrationStatus>(
    "/api/agent",
    swrFetcher,
    { revalidateOnFocus: true, refreshInterval: 15_000 },
  );

  const [label, setLabel] = useState("");
  const [wizardToken, setWizardToken] = useState<IssuedToken | null>(null);
  const [busy, setBusy] = useState<"none" | "issue" | "revoke">("none");

  const issue = useCallback(async () => {
    setBusy("issue");
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      if (!res.ok) {
        const { error: message } = await res.json().catch(() => ({}));
        throw new Error(message ?? "Failed to issue token");
      }
      const issued = (await res.json()) as IssuedToken;
      setWizardToken(issued);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to issue token");
    } finally {
      setBusy("none");
    }
  }, [label, mutate]);

  const revoke = useCallback(async () => {
    if (!confirm("Disconnect the agent? It will stop receiving events.")) {
      return;
    }
    setBusy("revoke");
    try {
      const res = await fetch("/api/agent", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to disconnect");
      toast.success("Agent disconnected");
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setBusy("none");
    }
  }, [mutate]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="size-4" />
          Agent
        </CardTitle>
        <CardDescription>
          Your agent runs on a machine you control. It receives content you push
          from this app, builds a wiki about you, and generates dashboard cards.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading || !data ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">Failed to load agent status.</p>
        ) : data.connected ? (
          <ConnectedView
            status={data}
            busy={busy}
            onReplace={() => issue()}
            onRevoke={revoke}
          />
        ) : (
          <DisconnectedView
            label={label}
            setLabel={setLabel}
            busy={busy === "issue"}
            onConnect={issue}
          />
        )}
      </CardContent>

      <ConnectWizard
        token={wizardToken}
        onClose={() => {
          setWizardToken(null);
          setLabel("");
        }}
        watcherUrl={WATCHER_URL}
      />
    </Card>
  );
}

function DisconnectedView({
  label,
  setLabel,
  busy,
  onConnect,
}: {
  label: string;
  setLabel: (v: string) => void;
  busy: boolean;
  onConnect: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
        No agent connected.
      </div>
      <div className="space-y-2">
        <Label htmlFor="agent-label" className="text-xs">
          Label (so you remember which machine this is)
        </Label>
        <Input
          id="agent-label"
          placeholder="home machine"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={64}
          disabled={busy}
        />
      </div>
      <Button onClick={onConnect} disabled={busy} className="w-full">
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          "Connect new agent"
        )}
      </Button>
    </div>
  );
}

function ConnectedView({
  status,
  busy,
  onReplace,
  onRevoke,
}: {
  status: RegistrationStatus;
  busy: "none" | "issue" | "revoke";
  onReplace: () => void;
  onRevoke: () => void;
}) {
  const [bootBusy, setBootBusy] = useState(false);
  const [regenBusy, setRegenBusy] = useState(false);

  const bootstrap = useCallback(async () => {
    if (
      !confirm(
        "Push everything you currently have (plans, marked items, wishes) to the agent? It will rebuild its wiki from scratch.",
      )
    ) {
      return;
    }
    setBootBusy(true);
    try {
      const { enqueued } = await bootstrapAgent();
      const total = Object.values(enqueued).reduce((a, b) => a + b, 0);
      toast.success(`Sent ${total} events to the agent.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bootstrap failed");
    } finally {
      setBootBusy(false);
    }
  }, []);

  const regen = useCallback(async () => {
    setRegenBusy(true);
    try {
      await sendToAgent("regen.cards", { reason: "manual" });
      toast.success("Asked the agent to regenerate cards.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Regen request failed");
    } finally {
      setRegenBusy(false);
    }
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-md border bg-muted/30 px-3 py-2.5">
        <span className="mt-1 inline-flex size-2 rounded-full bg-emerald-500" />
        <div className="flex-1 text-sm">
          <div className="font-medium">
            Connected{status.label ? ` — "${status.label}"` : ""}
          </div>
          <div className="text-xs text-muted-foreground">
            Paired {formatRelative(status.connectedAt)} · Last seen{" "}
            {status.lastSeenAt ? formatRelative(status.lastSeenAt) : "never"}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Button
          variant="secondary"
          size="sm"
          className="w-full justify-start"
          onClick={bootstrap}
          disabled={bootBusy || busy !== "none"}
        >
          {bootBusy ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <>
              <PlayCircle className="size-3.5 mr-1.5" />
              Bootstrap from existing data
            </>
          )}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="w-full justify-start"
          onClick={regen}
          disabled={regenBusy || busy !== "none"}
        >
          {regenBusy ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <>
              <RefreshCw className="size-3.5 mr-1.5" />
              Regenerate dashboard cards
            </>
          )}
        </Button>
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onReplace}
          disabled={busy !== "none"}
        >
          {busy === "issue" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <>
              <RefreshCw className="size-3.5 mr-1.5" /> Replace agent
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={onRevoke}
          disabled={busy !== "none"}
        >
          {busy === "revoke" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <>
              <Trash2 className="size-3.5 mr-1.5" /> Disconnect
            </>
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Replacing or disconnecting invalidates the existing token immediately —
        any running agent stops working until you re-pair.
      </p>
    </div>
  );
}

function ConnectWizard({
  token,
  onClose,
  watcherUrl,
}: {
  token: IssuedToken | null;
  onClose: () => void;
  watcherUrl: string;
}) {
  const open = token !== null;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Connect your agent</DialogTitle>
          <DialogDescription>
            Follow these three steps on the machine that will host your agent.
            The token below won&apos;t be shown again — copy it now.
          </DialogDescription>
        </DialogHeader>

        {token && (
          <div className="space-y-5">
            <WizardStep
              n={1}
              title="Download the watcher"
              body={
                <CopyBlock
                  language="bash"
                  text={`curl -fsSL ${watcherUrl} -o myself-op.js`}
                />
              }
            />

            <WizardStep
              n={2}
              title="Initialize. Paste this token when prompted."
              body={
                <div className="space-y-2">
                  <CopyBlock language="bash" text="node myself-op.js init" />
                  <CopyBlock
                    label="Token (paste this when asked)"
                    text={token.token}
                    sensitive
                  />
                  <p className="text-xs text-muted-foreground">
                    The watcher saves <code>~/.myself-op/config.json</code> and
                    drops the skill scripts at <code>~/.myself-op/skill/</code>.
                    Your agent reads them by absolute path — no skill registry
                    setup needed.
                  </p>
                </div>
              }
            />

            <WizardStep
              n={3}
              title="Start the watcher. Keep it running."
              body={
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">
                      Quick test (foreground — Ctrl-C to stop):
                    </p>
                    <CopyBlock language="bash" text="node myself-op.js start" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">
                      Production (Linux + systemd, survives logout &amp;
                      reboots):
                    </p>
                    <CopyBlock
                      language="bash"
                      text={`sudo tee /etc/systemd/system/myself-op.service >/dev/null <<EOF
[Unit]
Description=myself-op watcher
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$HOME
ExecStart=$(command -v node) $HOME/myself-op.js start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now myself-op
sudo systemctl status myself-op --no-pager`}
                    />
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      View logs with{" "}
                      <code>journalctl -u myself-op -f</code>. Reboot-safe.
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">
                      Or quick-and-dirty (no auto-restart, no reboot
                      survival):
                    </p>
                    <CopyBlock
                      language="bash"
                      text="nohup node myself-op.js start > ~/myself-op.log 2>&1 &"
                    />
                  </div>
                </div>
              }
            />
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose} className="w-full">
            <Check className="size-4 mr-1.5" />
            I&apos;ve connected my agent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WizardStep({
  n,
  title,
  body,
}: {
  n: number;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
        {n}
      </div>
      <div className="flex-1 space-y-2">
        <div className="text-sm font-medium">{title}</div>
        {body}
      </div>
    </div>
  );
}

function CopyBlock({
  text,
  language,
  label,
  sensitive,
}: {
  text: string;
  language?: string;
  label?: string;
  sensitive?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  }, [text]);

  return (
    <div className="space-y-1">
      {label && (
        <div className="text-[11px] text-muted-foreground">{label}</div>
      )}
      <div className="relative group">
        <pre
          className={`overflow-x-auto rounded-md border bg-muted/40 px-3 py-2 pr-12 font-mono text-xs ${
            sensitive ? "break-all whitespace-pre-wrap" : ""
          }`}
        >
          {language && (
            <span className="text-muted-foreground/60 select-none mr-1">$</span>
          )}
          {text}
        </pre>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="absolute top-1 right-1 size-7"
          onClick={copy}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </Button>
      </div>
    </div>
  );
}

function formatRelative(ms: number | null): string {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  if (diff < 0) return "just now";
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}
