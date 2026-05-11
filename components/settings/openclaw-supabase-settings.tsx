"use client";

import { useCallback, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { swrFetcher } from "@/lib/swr/config";

interface TokenPayload {
  configured: boolean;
}

export function OpenClawSupabaseSettings() {
  const { mutate: globalMutate } = useSWRConfig();
  const { data, error, isLoading, mutate } = useSWR<TokenPayload>(
    "/api/dashboard/openclaw-token",
    swrFetcher,
    { revalidateOnFocus: true },
  );
  const [tokenInput, setTokenInput] = useState("");
  const [saving, setSaving] = useState(false);

  const configured = data?.configured === true;

  const invalidateWikiIngestStatus = useCallback(async () => {
    await globalMutate("/api/dashboard/insights/wiki-ingest");
  }, [globalMutate]);

  const saveManual = useCallback(async () => {
    const t = tokenInput.trim();
    if (t.length < 10) {
      toast.error("Paste your Supabase refresh_token, or use Get from session.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/openclaw-token", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ refreshToken: t }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(
          typeof body.error === "string"
            ? body.error
            : "Could not save. Set MYSELF_OPENCLAW_TOKEN_KEY on the server.",
        );
        return;
      }
      setTokenInput("");
      toast.success("Refresh token saved.");
      await mutate();
      await invalidateWikiIngestStatus();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Network error");
    } finally {
      setSaving(false);
    }
  }, [tokenInput, mutate, invalidateWikiIngestStatus]);

  const getFromSession = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/openclaw-token/from-session", {
        method: "POST",
        credentials: "include",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(
          typeof body.error === "string"
            ? body.error
            : "Could not read session. Set MYSELF_OPENCLAW_TOKEN_KEY or log in again.",
        );
        return;
      }
      toast.success("Refresh token saved from your current browser session.");
      await mutate();
      await invalidateWikiIngestStatus();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Network error");
    } finally {
      setSaving(false);
    }
  }, [mutate, invalidateWikiIngestStatus]);

  const clear = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/openclaw-token", {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        toast.error("Could not clear token");
        return;
      }
      toast.message("OpenClaw token cleared.");
      await mutate();
      await invalidateWikiIngestStatus();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Network error");
    } finally {
      setSaving(false);
    }
  }, [mutate, invalidateWikiIngestStatus]);

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          <CardTitle>OpenClaw / wiki ingest (Supabase)</CardTitle>
        </div>
        <CardDescription>
          Wiki ingest sends your Supabase URL, anon key, and this refresh token
          to the remote openclaw over SSH. Stored encrypted with{" "}
          <code className="rounded bg-muted px-1 text-xs">
            MYSELF_OPENCLAW_TOKEN_KEY
          </code>
          .
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <p className="text-sm text-destructive">Could not load token status.</p>
        ) : isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : configured ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              A refresh token is saved — wiki ingest is allowed.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => void clear()}
            >
              Clear
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No token on file — wiki ingest stays disabled until you save one below.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={() => void getFromSession()}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Get from session"
            )}
          </Button>
          <span className="text-xs text-muted-foreground self-center">
            Uses the Supabase auth cookie from this browser (you must be logged in
            here).
          </span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="openclaw-refresh-manual">Or paste refresh_token manually</Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              id="openclaw-refresh-manual"
              type="password"
              autoComplete="off"
              placeholder="Supabase refresh_token"
              className="sm:max-w-md"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
            />
            <Button
              type="button"
              disabled={saving}
              onClick={() => void saveManual()}
            >
              Save
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
