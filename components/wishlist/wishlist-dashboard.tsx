"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Loader2, Sparkles, Trash2, ChevronRight, Send } from "lucide-react";
import { toast } from "sonner";
import { sendToAgent } from "@/lib/modules/agent/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";
import { useUserWishes, useAgentRegistration } from "@/lib/swr/hooks";
import { parsePlanDataJson } from "@/lib/wishlist/parse-plan";
import { flatPlanToCards } from "@/lib/wishlist/flat-plan-to-cards";
import { CardRenderer } from "@/components/claw/card-renderer";
import { TodoPreview } from "@/components/todos/todo-preview";
import type { WishCategory } from "@/lib/wishlist/types";

export interface UserWishRow {
  id: string;
  category: WishCategory;
  userDescription: string;
  planData: string;
  status: "expanding" | "ready" | "error";
  createdAt: number;
  updatedAt: number;
}

const STEP_KEY = /^step_(\d+)$/;

function sortedStepKeys(plan: Record<string, string>): string[] {
  return Object.keys(plan)
    .filter((k) => STEP_KEY.test(k))
    .sort((a, b) => {
      const na = Number(STEP_KEY.exec(a)?.[1] ?? 0);
      const nb = Number(STEP_KEY.exec(b)?.[1] ?? 0);
      return na - nb;
    });
}

function AgentStatusLight({
  agentConnected,
  expandError,
}: {
  agentConnected: boolean;
  expandError: string | null;
}) {
  const t = useT();
  const tone = !agentConnected
    ? "bg-destructive shadow-[0_0_10px] shadow-destructive/50"
    : expandError
      ? "bg-amber-500 shadow-[0_0_8px] shadow-amber-500/40"
      : "bg-emerald-500 shadow-[0_0_8px] shadow-emerald-500/40";
  const label = !agentConnected
    ? t("wishlist.agent.disconnected")
    : expandError
      ? t("wishlist.agent.lastError")
      : t("wishlist.agent.ready");

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span
        className={cn("h-2.5 w-2.5 shrink-0 rounded-full", tone)}
        title={label}
        aria-hidden
      />
      <span className="text-xs text-muted-foreground truncate">{label}</span>
    </div>
  );
}

function WishCard({
  wish,
  onDeleted,
  onPlanPatched,
}: {
  wish: UserWishRow;
  onDeleted: () => void;
  onPlanPatched: () => void;
}) {
  const t = useT();
  const plan = useMemo(
    () => parsePlanDataJson(wish.planData),
    [wish.planData],
  );
  const cards = useMemo(() => flatPlanToCards(plan), [plan]);

  const handleToggleStep = useCallback(
    async (stepIndex: number, nextDone: boolean) => {
      const keys = sortedStepKeys(plan);
      const stepKey = keys[stepIndex];
      if (!stepKey) return;
      const n = Number(STEP_KEY.exec(stepKey)?.[1]);
      if (!Number.isFinite(n)) return;
      const nextPlan = {
        ...plan,
        [`done_step_${n}`]: nextDone ? "true" : "false",
      };
      await fetch("/api/dashboard/wishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "patch-plan",
          id: wish.id,
          planData: nextPlan,
        }),
      });
      onPlanPatched();
    },
    [plan, wish.id, onPlanPatched],
  );

  const handleDelete = async () => {
    await fetch("/api/dashboard/wishes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id: wish.id }),
    });
    onDeleted();
  };

  const handleSendToAgent = async () => {
    try {
      await sendToAgent(
        "wish.upsert",
        wish,
        { table: "user_wishes", id: wish.id },
      );
      toast.success(t("agent.sentToAgent"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("agent.sendFailed"));
    }
  };

  return (
    <Card className="overflow-hidden border-muted/60">
      <CardHeader className="p-3 pb-0 space-y-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug line-clamp-3">
            {wish.userDescription}
          </p>
          <div className="flex items-center shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={handleSendToAgent}
              aria-label={t("agent.sendToAgent")}
              title={t("agent.sendToAgent")}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={handleDelete}
              aria-label={t("wishlist.deleteWish")}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-2 space-y-2">
        {wish.status === "expanding" ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>{t("wishlist.expanding")}</span>
          </div>
        ) : wish.status === "error" ? (
          <p className="text-xs text-destructive">
            {t("wishlist.expandError")}
          </p>
        ) : cards.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("wishlist.emptyPlan")}</p>
        ) : (
          cards.map((card, i) => (
            <CardRenderer
              key={i}
              card={card}
              onToggleStep={
                card.kind === "steps" ? handleToggleStep : undefined
              }
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function WishlistDashboard() {
  const t = useT();
  const { data: wishData, isLoading: wishesLoading, mutate: mutateWishes } =
    useUserWishes();
  const { data: registration } = useAgentRegistration();
  const agentConnected = registration?.connected === true;

  const anyExpanding = useMemo(() => {
    const rows = (wishData?.wishes ?? []) as UserWishRow[];
    return rows.some((w) => w.status === "expanding");
  }, [wishData?.wishes]);

  useEffect(() => {
    if (!anyExpanding) return;
    const t = setInterval(() => {
      void mutateWishes();
    }, 5000);
    return () => clearInterval(t);
  }, [anyExpanding, mutateWishes]);

  const [category, setCategory] = useState<WishCategory>("learn");
  const [description, setDescription] = useState("");
  const [expanding, setExpanding] = useState(false);
  const [expandError, setExpandError] = useState<string | null>(null);

  const wishes: UserWishRow[] = useMemo(
    () => wishData?.wishes ?? [],
    [wishData?.wishes],
  );

  const byCategory = useCallback(
    (c: WishCategory) => wishes.filter((w) => w.category === c),
    [wishes],
  );

  const handleGenerate = async () => {
    if (!description.trim() || !agentConnected) return;
    setExpanding(true);
    setExpandError(null);
    try {
      const res = await fetch("/api/dashboard/wishes/expand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          userDescription: description.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 202) {
        const detail =
          typeof json.error === "string" ? json.error : res.statusText;
        setExpandError(detail);
        return;
      }
      // 202 — placeholder wish was created; the watcher will fill planData in
      // and the polling below will surface the update.
      setDescription("");
      await mutateWishes();
    } catch (e) {
      setExpandError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setExpanding(false);
    }
  };

  const column = (cat: WishCategory, accent: string) => (
    <div
      className={cn(
        "flex min-h-0 flex-col rounded-xl border bg-card/40",
        accent,
      )}
    >
      <div className="border-b px-3 py-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {cat === "learn" && t("wishlist.column.learn")}
          {cat === "place" && t("wishlist.column.place")}
          {cat === "goal" && t("wishlist.column.goal")}
        </h3>
      </div>
      <ScrollArea className="h-[min(52vh,520px)] px-2 pb-2">
        <div className="space-y-2 py-2 pr-1">
          {byCategory(cat).length === 0 ? (
            <p className="text-xs text-muted-foreground px-1 py-6 text-center">
              {t("wishlist.column.empty")}
            </p>
          ) : (
            byCategory(cat).map((w) => (
              <WishCard
                key={w.id}
                wish={w}
                onDeleted={() => void mutateWishes()}
                onPlanPatched={() => void mutateWishes()}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8 h-full min-h-0">
      <div className="flex flex-col gap-4 rounded-xl border bg-muted/20 p-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <AgentStatusLight
              agentConnected={agentConnected}
              expandError={expandError}
            />
            {!agentConnected && (
              <Button variant="outline" size="sm" asChild className="h-8 text-xs">
                <Link href="/dashboard/settings">{t("wishlist.linkClaw")}</Link>
              </Button>
            )}
          </div>
          <Tabs
            value={category}
            onValueChange={(v) => setCategory(v as WishCategory)}
          >
            <TabsList className="h-9 flex-wrap">
              <TabsTrigger value="learn" className="text-xs">
                {t("wishlist.tab.learn")}
              </TabsTrigger>
              <TabsTrigger value="place" className="text-xs">
                {t("wishlist.tab.place")}
              </TabsTrigger>
              <TabsTrigger value="goal" className="text-xs">
                {t("wishlist.tab.goal")}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("wishlist.descriptionPlaceholder")}
            className="min-h-[88px] max-h-40 resize-y text-sm"
            disabled={expanding}
          />
        </div>
        <Button
          className="shrink-0 gap-2 md:self-end"
          disabled={
            expanding || !agentConnected || !description.trim()
          }
          onClick={() => void handleGenerate()}
        >
          {expanding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {t("wishlist.generate")}
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{t("wishlist.todosSection")}</h3>
          <Button variant="ghost" size="sm" asChild className="h-8 gap-1 text-xs">
            <Link href="/dashboard/todos">
              {t("wishlist.openTodos")}
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        <TodoPreview />
      </div>

      {wishesLoading ? (
        <div className="flex flex-1 items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid flex-1 min-h-0 grid-cols-1 gap-3 lg:grid-cols-3">
          {column("learn", "border-t-2 border-t-sky-500/60")}
          {column("place", "border-t-2 border-t-amber-500/60")}
          {column("goal", "border-t-2 border-t-violet-500/60")}
        </div>
      )}
    </div>
  );
}
