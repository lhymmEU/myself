"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Clock,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { TimezonePicker } from "@/components/ui/timezone-picker";

interface CronJob {
  id: string;
  name: string;
  expression: string;
  command: string;
  sessionTarget: string;
  enabled: boolean;
  scheduleKind: string;
  timezone: string | null;
  lastRun: string | null;
  nextRun: string | null;
}

const CHANNELS_WITH_DELIVERY_TO = ["qqbot", "telegram", "discord", "slack"];

interface CronPanelProps {
  connectionId: string | null;
}

type ScheduleType = "daily" | "weekly" | "custom" | "once";

interface FormState {
  name: string;
  expression: string;
  command: string;
  enabled: boolean;
  scheduleType: ScheduleType;
  hour: string;
  minute: string;
  weekday: string;
  datetime: Date | undefined;
  timezone: string;
  channel: string;
  deliveryTo: string;
}

function getLocalTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

const EMPTY_FORM: FormState = {
  name: "",
  expression: "",
  command: "",
  enabled: true,
  scheduleType: "daily",
  hour: "09",
  minute: "00",
  weekday: "1",
  datetime: undefined,
  timezone: getLocalTimezone(),
  channel: "",
  deliveryTo: "",
};

function buildExpression(form: FormState): string {
  switch (form.scheduleType) {
    case "daily":
      return `${form.minute} ${form.hour} * * *`;
    case "weekly":
      return `${form.minute} ${form.hour} * * ${form.weekday}`;
    case "once":
      return form.datetime ? `at ${form.datetime.toISOString()}` : "";
    case "custom":
      return form.expression;
  }
}

function parseExpressionToForm(expr: string, tz?: string | null): Partial<FormState> {
  const result: Partial<FormState> = {};
  if (tz) result.timezone = tz;

  if (expr.startsWith("at ")) {
    try {
      const d = new Date(expr.slice(3));
      if (isNaN(d.getTime())) return { ...result, scheduleType: "custom", expression: expr };
      return { ...result, scheduleType: "once", datetime: d };
    } catch {
      return { ...result, scheduleType: "custom", expression: expr };
    }
  }

  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return { ...result, scheduleType: "custom", expression: expr };

  const [min, hour, dom, , dow] = parts;

  if (dom === "*" && dow === "*" && /^\d+$/.test(min) && /^\d+$/.test(hour)) {
    return { ...result, scheduleType: "daily", hour: hour.padStart(2, "0"), minute: min.padStart(2, "0") };
  }
  if (dom === "*" && /^\d+$/.test(dow) && /^\d+$/.test(min) && /^\d+$/.test(hour)) {
    return { ...result, scheduleType: "weekly", hour: hour.padStart(2, "0"), minute: min.padStart(2, "0"), weekday: dow };
  }

  return { ...result, scheduleType: "custom", expression: expr };
}

function describeCron(expr: string): string {
  if (expr.startsWith("at ")) return `One-shot: ${expr.slice(3)}`;
  if (expr.startsWith("every ")) return expr;

  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return expr;
  const [min, hour, dom, mon, dow] = parts;

  if (min === "*" && hour === "*") return "Every minute";
  if (hour === "*" && min !== "*") return `Every hour at minute ${min}`;
  if (dom === "*" && mon === "*" && dow === "*" && min !== "*" && hour !== "*")
    return `Daily at ${hour.padStart(2, "0")}:${min.padStart(2, "0")}`;
  if (dow !== "*" && dom === "*" && mon === "*")
    return `Weekly (day ${dow}) at ${hour.padStart(2, "0")}:${min.padStart(2, "0")}`;
  return expr;
}

export function CronPanel({ connectionId }: CronPanelProps) {
  const t = useT();
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("current");
  const [availableChannels, setAvailableChannels] = useState<string[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchJobs = useCallback(async () => {
    if (!connectionId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/claw/cron?connectionId=${encodeURIComponent(connectionId)}`
      );
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setJobs(data.jobs ?? []);
      }
    } catch {
      setError(t("claw.dm.cronPanel.failedLoad"));
    } finally {
      setLoading(false);
    }
  }, [connectionId, t]);

  const fetchChannels = useCallback(async () => {
    if (!connectionId) return;
    try {
      const res = await fetch("/api/claw/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, command: "channels-list" }),
      });
      const data = await res.json();
      const output = data.stdout || "";
      const lines = output.split("\n").map((l: string) => l.trim()).filter(Boolean);
      const channels: string[] = [];
      for (const line of lines) {
        const match = line.match(/^[-•*]?\s*(\S+)/);
        if (match) channels.push(match[1].toLowerCase());
      }
      if (channels.length > 0) {
        setAvailableChannels(channels);
      } else {
        setAvailableChannels(["whatsapp", "telegram", "discord", "imessage", "slack", "qqbot"]);
      }
    } catch {
      setAvailableChannels(["whatsapp", "telegram", "discord", "imessage", "slack", "qqbot"]);
    }
  }, [connectionId]);

  useEffect(() => {
    if (connectionId) {
      fetchJobs();
      fetchChannels();
    }
  }, [connectionId, fetchJobs, fetchChannels]);

  const handleSave = useCallback(async () => {
    const finalExpression = buildExpression(form);
    if (!form.name || !finalExpression || !form.command || !connectionId) return;
    setSaving(true);
    setError(null);
    try {
      let res: Response;
      const payload: Record<string, unknown> = {
        name: form.name,
        expression: finalExpression,
        command: form.command,
        enabled: form.enabled,
        timezone: form.timezone,
        connectionId,
      };
      if (form.channel) payload.channel = form.channel;
      if (form.deliveryTo) payload.deliveryTo = form.deliveryTo;

      if (editingId) {
        res = await fetch(`/api/claw/cron/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/claw/cron", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Failed (${res.status})`);
        return;
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      setActiveTab("current");
      await fetchJobs();
    } catch {
      setError(t("claw.dm.cronPanel.failedSave"));
    } finally {
      setSaving(false);
    }
  }, [form, editingId, connectionId, fetchJobs, t]);

  const handleEdit = (job: CronJob) => {
    setEditingId(job.id);
    const parsed = parseExpressionToForm(job.expression, job.timezone);
    setForm({
      ...EMPTY_FORM,
      name: job.name,
      command: job.command,
      enabled: job.enabled,
      ...parsed,
    });
    setActiveTab("edit");
  };

  const handleDelete = async (id: string) => {
    if (!connectionId) return;
    try {
      await fetch(
        `/api/claw/cron/${id}?connectionId=${encodeURIComponent(connectionId)}`,
        { method: "DELETE" }
      );
      await fetchJobs();
    } catch {
      setError(t("claw.dm.cronPanel.failedDelete"));
    }
  };

  const handleToggle = async (job: CronJob) => {
    if (!connectionId) return;
    try {
      await fetch(`/api/claw/cron/${job.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !job.enabled, connectionId }),
      });
      await fetchJobs();
    } catch {
      setError(t("claw.dm.cronPanel.failedSave"));
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setActiveTab("current");
  };

  return (
    <div className="flex flex-col h-full border-l overflow-hidden">
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-sm font-medium">{t("claw.dm.cronPanel.title")}</h3>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={fetchJobs}
          disabled={loading || !connectionId}
          className="h-6 w-6 p-0"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {error && (
        <div className="mx-2 mt-2 flex items-center gap-2 text-xs text-red-400 bg-red-950/20 rounded-md px-2 py-1.5">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span className="flex-1 break-words">{error}</span>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <TabsList className="grid w-full grid-cols-2 h-8 mx-2 mt-2" style={{ width: "calc(100% - 16px)" }}>
          <TabsTrigger value="current" className="text-xs h-7">
            {t("claw.dm.cronPanel.tabCurrent")}
          </TabsTrigger>
          <TabsTrigger value="edit" className="text-xs h-7">
            {t("claw.dm.cronPanel.tabAddEdit")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="flex-1 mt-0 min-h-0 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !connectionId ? (
            <div className="text-center py-8">
              <p className="text-xs text-muted-foreground">
                {t("claw.dm.cronPanel.noJobs")}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="p-2 space-y-1.5">
                {jobs.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-xs text-muted-foreground">
                      {t("claw.dm.cronPanel.noJobs")}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActiveTab("edit")}
                      className="mt-3 h-7 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {t("claw.dm.cronPanel.createJob")}
                    </Button>
                  </div>
                ) : (
                  jobs.map((job) => (
                    <div
                      key={job.id}
                      className="rounded-md border p-2.5 space-y-1.5 min-w-0 overflow-hidden max-w-[350px]"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-medium truncate min-w-0">
                          {job.name}
                        </span>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(job)}
                            className="h-5 w-5 p-0"
                          >
                            <Pencil className="h-2.5 w-2.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(job.id)}
                            className="h-5 w-5 p-0 text-destructive"
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono truncate">
                        {job.expression}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {describeCron(job.expression)}
                      </div>
                      {job.command && (
                        <div className="text-xs text-muted-foreground truncate">
                          {job.command}
                        </div>
                      )}
                      {job.timezone && (
                        <div className="text-[10px] text-muted-foreground truncate">
                          🌐 {job.timezone}
                        </div>
                      )}
                      {job.sessionTarget && (
                        <div className="text-[10px] text-muted-foreground truncate">
                          Session: {job.sessionTarget}
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1">
                        <span
                          className={`text-[10px] ${
                            job.enabled ? "text-emerald-500" : "text-yellow-500"
                          }`}
                        >
                          {job.enabled
                            ? t("claw.dm.cronPanel.active")
                            : t("claw.dm.cronPanel.paused")}
                        </span>
                        <Switch
                          checked={job.enabled}
                          onCheckedChange={() => handleToggle(job)}
                          className="scale-75"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="edit" className="flex-1 mt-0 min-h-0 overflow-auto">
          <div className="p-3 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("claw.dm.cronPanel.name")}</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t("claw.dm.cronPanel.namePlaceholder")}
                className="h-7 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t("claw.dm.cronPanel.schedule")}</Label>
              <select
                value={form.scheduleType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, scheduleType: e.target.value as ScheduleType }))
                }
                className="w-full h-7 rounded-md border bg-transparent px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="daily">{t("claw.dm.cronPanel.scheduleDaily")}</option>
                <option value="weekly">{t("claw.dm.cronPanel.scheduleWeekly")}</option>
                <option value="once">{t("claw.dm.cronPanel.scheduleOnce")}</option>
                <option value="custom">{t("claw.dm.cronPanel.scheduleCustom")}</option>
              </select>
            </div>

            {form.scheduleType === "once" ? (
              <div className="space-y-1.5">
                <Label className="text-xs">{t("claw.dm.cronPanel.scheduleDatetime")}</Label>
                <DateTimePicker
                  value={form.datetime}
                  onChange={(d) => setForm((f) => ({ ...f, datetime: d }))}
                  placeholder={t("claw.dm.cronPanel.pickDateTime")}
                />
              </div>
            ) : form.scheduleType === "custom" ? (
              <div className="space-y-1.5">
                <Label className="text-xs">{t("claw.dm.cronPanel.expression")}</Label>
                <Input
                  value={form.expression}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, expression: e.target.value }))
                  }
                  placeholder={t("claw.dm.cronPanel.expressionPlaceholder")}
                  className="h-7 text-xs font-mono"
                />
                {form.expression && (
                  <p className="text-[10px] text-muted-foreground">
                    {describeCron(form.expression)}
                  </p>
                )}
              </div>
            ) : (
              <>
                {form.scheduleType === "weekly" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("claw.dm.cronPanel.scheduleDay")}</Label>
                    <select
                      value={form.weekday}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, weekday: e.target.value }))
                      }
                      className="w-full h-7 rounded-md border bg-transparent px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="1">{t("claw.dm.cronPanel.monday")}</option>
                      <option value="2">{t("claw.dm.cronPanel.tuesday")}</option>
                      <option value="3">{t("claw.dm.cronPanel.wednesday")}</option>
                      <option value="4">{t("claw.dm.cronPanel.thursday")}</option>
                      <option value="5">{t("claw.dm.cronPanel.friday")}</option>
                      <option value="6">{t("claw.dm.cronPanel.saturday")}</option>
                      <option value="0">{t("claw.dm.cronPanel.sunday")}</option>
                    </select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("claw.dm.cronPanel.pickTime")}</Label>
                  <TimePicker
                    hour={form.hour}
                    minute={form.minute}
                    onChange={(h, m) =>
                      setForm((f) => ({ ...f, hour: h, minute: m }))
                    }
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">{t("claw.dm.cronPanel.timezone")}</Label>
              <TimezonePicker
                value={form.timezone}
                onChange={(tz) => setForm((f) => ({ ...f, timezone: tz }))}
              />
            </div>

            {buildExpression(form) && (
              <p className="text-[10px] text-muted-foreground font-mono bg-muted/50 rounded px-1.5 py-1">
                {describeCron(buildExpression(form))}
              </p>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">{t("claw.dm.cronPanel.command")}</Label>
              <textarea
                value={form.command}
                onChange={(e) =>
                  setForm((f) => ({ ...f, command: e.target.value }))
                }
                placeholder={t("claw.dm.cronPanel.commandPlaceholder")}
                className="w-full rounded-md border bg-transparent px-2 py-1.5 text-xs min-h-[60px] resize-y focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t("claw.dm.cronPanel.channel")}</Label>
              <select
                value={form.channel}
                onChange={(e) =>
                  setForm((f) => ({ ...f, channel: e.target.value, deliveryTo: "" }))
                }
                className="w-full h-7 rounded-md border bg-transparent px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">{t("claw.dm.cronPanel.channelNone")}</option>
                {availableChannels.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
            </div>

            {form.channel && CHANNELS_WITH_DELIVERY_TO.includes(form.channel) && (
              <div className="space-y-1.5">
                <Label className="text-xs">{t("claw.dm.cronPanel.deliveryTo")}</Label>
                <Input
                  value={form.deliveryTo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, deliveryTo: e.target.value }))
                  }
                  placeholder={t("claw.dm.cronPanel.deliveryToPlaceholder")}
                  className="h-7 text-xs"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch
                checked={form.enabled}
                onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))}
              />
              <Label className="text-xs">{t("claw.dm.cronPanel.enabled")}</Label>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || !form.name || !buildExpression(form) || !form.command || !connectionId}
                className="h-7 text-xs flex-1"
              >
                {saving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                {editingId
                  ? t("claw.dm.cronPanel.saveJob")
                  : t("claw.dm.cronPanel.createJob")}
              </Button>
              {editingId && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={cancelEdit}
                  className="h-7 text-xs"
                >
                  {t("claw.dm.cronPanel.cancelEdit")}
                </Button>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
