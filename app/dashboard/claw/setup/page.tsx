"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Cloud,
  Loader2,
  Pencil,
  Plug,
  Smartphone,
  Star,
  Trash2,
} from "lucide-react";

import { useT } from "@/lib/i18n/context";
import { useClawConnections } from "@/lib/swr/hooks";
import { isCloud } from "@/lib/core/runtime";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { AddEdgeServer } from "@/components/claw/add-edge-server";
import { PairLobster } from "@/components/claw/pair-lobster";
import { ConnectionForm } from "@/components/claw/connection-form";
import { EditEdgeServer } from "@/components/claw/edit-edge-server";

interface ConnectionInfo {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authMethod: "password" | "key";
  isDefault: boolean;
  transport?: "ssh" | "relay" | "edge";
  credentialSecretId?: string;
}

type SetupBranch = "pair" | "edge" | "ssh" | null;

/**
 * Setup wizard for adding a Claw connection. Reframes the existing
 * `AddEdgeServer`, `PairLobster`, and SSH connection dialogs into a
 * single non-technical landing page with explanatory copy.
 *
 * Cloud users see the pairing flow first (the friendliest path);
 * local-mode users see SSH first. Each branch is a thin wrapper
 * around the existing component so the proven flows keep working.
 */
export default function ClawSetupPage() {
  const t = useT();
  const router = useRouter();
  const cloud = isCloud();
  const { data: connectionsData, mutate } = useClawConnections();
  const connections: ConnectionInfo[] = useMemo(
    () => (Array.isArray(connectionsData) ? connectionsData : []),
    [connectionsData],
  );
  const [branch, setBranch] = useState<SetupBranch>(null);
  const [editing, setEditing] = useState<ConnectionInfo | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [pendingDefault, setPendingDefault] = useState<string | null>(null);

  const handleConnectionAdded = () => {
    mutate();
    router.push("/dashboard/claw");
  };

  const handleDelete = async (conn: ConnectionInfo) => {
    const confirmed = window.confirm(
      t("claw.setup.confirmDelete").replace("{name}", conn.name),
    );
    if (!confirmed) return;
    setDeleting(conn.id);
    try {
      const res = await fetch("/api/claw/connections", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: conn.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        window.alert(data.error ?? "Failed to delete connection");
        return;
      }
      // Best-effort: drop the in-process SSH client too. Failures here are
      // harmless because the server already released the row.
      void fetch("/api/claw/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: conn.id, action: "disconnect" }),
      }).catch(() => {});
      await mutate();
    } finally {
      setDeleting(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    setPendingDefault(id);
    try {
      const res = await fetch("/api/claw/connections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, setDefault: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        window.alert(data.error ?? "Failed to set default");
        return;
      }
      await mutate();
    } finally {
      setPendingDefault(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/claw"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("claw.setup.backToHome")}
        </Link>
        {connections.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {connections.length} {t("claw.setup.alreadyConnected")}
          </span>
        )}
      </div>

      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          {t("claw.setup.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("claw.setup.subtitle")}
        </p>
      </div>

      {branch === null && (
        <div className="grid gap-4 sm:grid-cols-2">
          {cloud && (
            <BranchCard
              icon={<Smartphone className="h-5 w-5" />}
              title={t("claw.setup.pair.title")}
              description={t("claw.setup.pair.description")}
              recommended
              onClick={() => setBranch("pair")}
            />
          )}
          {cloud && (
            <BranchCard
              icon={<Cloud className="h-5 w-5" />}
              title={t("claw.setup.edge.title")}
              description={t("claw.setup.edge.description")}
              onClick={() => setBranch("edge")}
            />
          )}
          {!cloud && (
            <BranchCard
              icon={<Plug className="h-5 w-5" />}
              title={t("claw.setup.ssh.title")}
              description={t("claw.setup.ssh.description")}
              recommended
              onClick={() => setBranch("ssh")}
            />
          )}
          {cloud && (
            <BranchCard
              icon={<Plug className="h-5 w-5" />}
              title={t("claw.setup.ssh.title")}
              description={t("claw.setup.sshAdvanced.description")}
              onClick={() => setBranch("ssh")}
            />
          )}
        </div>
      )}

      {branch !== null && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              {branch === "pair" && t("claw.setup.pair.title")}
              {branch === "edge" && t("claw.setup.edge.title")}
              {branch === "ssh" && t("claw.setup.ssh.title")}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBranch(null)}
              className="text-xs"
            >
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              {t("common.back")}
            </Button>
          </CardHeader>
          <CardContent>
            {branch === "pair" && (
              <div className="space-y-4 text-sm">
                <p className="text-muted-foreground">
                  {t("claw.setup.pair.steps")}
                </p>
                <PairLobster onPaired={handleConnectionAdded} />
              </div>
            )}
            {branch === "edge" && (
              <div className="space-y-4 text-sm">
                <p className="text-muted-foreground">
                  {t("claw.setup.edge.steps")}
                </p>
                <AddEdgeServer onAdded={handleConnectionAdded} />
              </div>
            )}
            {branch === "ssh" && (
              <div className="space-y-4 text-sm">
                <p className="text-muted-foreground">
                  {t("claw.setup.ssh.steps")}
                </p>
                <ConnectionForm onConnectionChange={() => mutate()} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {connections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {t("claw.setup.existing")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {connections.map((conn) => {
              const transport = conn.transport ?? "ssh";
              const editable = transport === "edge";
              return (
                <div
                  key={conn.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2"
                >
                  <div className="flex flex-1 items-center gap-2 min-w-0">
                    {conn.isDefault ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    ) : (
                      <span
                        className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground/40"
                        aria-hidden
                      />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {conn.name}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {transport}
                        </Badge>
                        {conn.isDefault && (
                          <Badge variant="secondary" className="text-[10px]">
                            {t("claw.setup.defaultLabel")}
                          </Badge>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {conn.username}@{conn.host}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!conn.isDefault && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => handleSetDefault(conn.id)}
                        disabled={pendingDefault === conn.id}
                        title={t("claw.setup.setDefault")}
                      >
                        {pendingDefault === conn.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Star className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                    {editable && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => setEditing(conn)}
                        title={t("claw.setup.edit")}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(conn)}
                      disabled={deleting === conn.id}
                      title={t("claw.setup.delete")}
                    >
                      {deleting === conn.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
            <p className="pt-1 text-[11px] text-muted-foreground">
              {t("claw.setup.editHint")}
            </p>
          </CardContent>
        </Card>
      )}

      {editing && (
        <EditEdgeServer
          connection={{
            id: editing.id,
            name: editing.name,
            host: editing.host,
            port: editing.port,
            username: editing.username,
            authMethod: editing.authMethod,
            transport: editing.transport ?? "edge",
            credentialSecretId: editing.credentialSecretId,
          }}
          open={!!editing}
          onOpenChange={(next) => {
            if (!next) setEditing(null);
          }}
          onSaved={() => {
            setEditing(null);
            mutate();
          }}
        />
      )}
    </div>
  );
}

function BranchCard({
  icon,
  title,
  description,
  recommended,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  recommended?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-full flex-col gap-3 rounded-xl border bg-card p-5 text-left shadow-sm transition-colors hover:border-foreground/30 hover:bg-muted/50"
    >
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground">
          {icon}
        </div>
        {recommended && (
          <Badge variant="default" className="text-[10px]">
            Recommended
          </Badge>
        )}
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-semibold leading-tight">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="mt-auto inline-flex items-center text-xs font-medium text-muted-foreground group-hover:text-foreground">
        Continue
        <ArrowRight className="ml-1 h-3 w-3" />
      </div>
    </button>
  );
}
