"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { LLM_MODELS } from "@/lib/modules/settings/defaults";
import { Key, Brain, Thermometer, Eye, EyeOff, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/context";

interface LlmConfigProps {
  settings: Record<string, string>;
  onUpdate: (key: string, value: string) => void;
}

export function LlmConfig({ settings, onUpdate }: LlmConfigProps) {
  const t = useT();
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState<boolean | null>(null);

  const handleTestConnection = async () => {
    if (!settings.openrouter_api_key) {
      toast.error(t("settings.llm.enterKeyFirst"));
      return;
    }
    setTesting(true);
    setTestSuccess(null);
    try {
      const res = await fetch("https://openrouter.ai/api/v1/models", {
        headers: { Authorization: `Bearer ${settings.openrouter_api_key}` },
      });
      if (res.ok) {
        setTestSuccess(true);
        toast.success(t("settings.llm.connectionSuccess"));
      } else {
        setTestSuccess(false);
        toast.error(t("settings.llm.invalidKey"));
      }
    } catch {
      setTestSuccess(false);
      toast.error(t("settings.llm.connectionFailed"));
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="size-5" />
          {t("settings.llm.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="api-key" className="flex items-center gap-2">
            <Key className="size-4" />
            {t("settings.llm.openRouterKey")}
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="api-key"
                type={showKey ? "text" : "password"}
                value={settings.openrouter_api_key ?? ""}
                onChange={(e) => onUpdate("openrouter_api_key", e.target.value)}
                placeholder={t("settings.llm.placeholderKey")}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={testing}
              className="shrink-0"
            >
              {testing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : testSuccess ? (
                <Check className="size-4 text-green-500" />
              ) : (
                t("common.test")
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Brain className="size-4" />
            {t("settings.llm.preferredModel")}
          </Label>
          <Select
            value={settings.llm_model ?? "anthropic/claude-sonnet-4"}
            onValueChange={(v) => onUpdate("llm_model", v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LLM_MODELS.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Thermometer className="size-4" />
            {t("settings.llm.temperature")}
            <span className="ml-auto text-sm font-mono text-muted-foreground">
              {parseFloat(settings.llm_temperature ?? "0.7").toFixed(1)}
            </span>
          </Label>
          <Slider
            min={0}
            max={1}
            step={0.1}
            value={[parseFloat(settings.llm_temperature ?? "0.7")]}
            onValueChange={([v]) => onUpdate("llm_temperature", v.toString())}
          />
        </div>
      </CardContent>
    </Card>
  );
}
