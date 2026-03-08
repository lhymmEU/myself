"use client";

import { useState, useCallback, useMemo } from "react";
import { useT } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Save,
  Loader2,
  AlertTriangle,
  Puzzle,
  Server,
  Eye,
  PenLine,
  RotateCcw,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { CodeEditor } from "@/components/claw/code-editor";

interface ExtendPanelProps {
  connectionId: string | null;
  connected: boolean;
}

type Phase = "describe" | "edit";

function sanitizeName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function serializeToSkillMd(
  name: string,
  description: string,
  body: string
): string {
  return `---\nname: ${name}\ndescription: ${description}\n---\n\n${body}`;
}

export function ExtendPanel({ connectionId, connected }: ExtendPanelProps) {
  const t = useT();

  const [phase, setPhase] = useState<Phase>("describe");
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);

  const [skillName, setSkillName] = useState("");
  const [skillDescription, setSkillDescription] = useState("");
  const [skillBody, setSkillBody] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const safeName = useMemo(() => sanitizeName(skillName), [skillName]);

  const preview = useMemo(
    () => serializeToSkillMd(skillName, skillDescription, skillBody),
    [skillName, skillDescription, skillBody]
  );

  const canSave =
    skillName.trim().length > 0 && skillDescription.trim().length > 0;

  const generateSkill = useCallback(async () => {
    if (!connectionId || !prompt.trim()) return;
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/claw/skills/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, prompt: prompt.trim() }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }

      setSkillName(data.name ?? "");
      setSkillDescription(data.description ?? "");
      setSkillBody(data.body ?? "");
      setPhase("edit");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("claw.extend.failedGenerate")
      );
    } finally {
      setGenerating(false);
    }
  }, [connectionId, prompt, t]);

  const saveSkill = useCallback(async () => {
    if (!connectionId || !canSave) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const content = serializeToSkillMd(
        skillName,
        skillDescription,
        skillBody
      );

      if (!savedPath) {
        const res = await fetch("/api/claw/skills/editor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ connectionId, name: skillName.trim() }),
        });
        const data = await res.json();
        if (data.error) {
          setError(data.error);
          return;
        }
        const path = data.path as string;
        setSavedPath(path);

        const putRes = await fetch("/api/claw/skills/editor", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ connectionId, path, content }),
        });
        const putData = await putRes.json();
        if (putData.error) {
          setError(putData.error);
          return;
        }
      } else {
        const res = await fetch("/api/claw/skills/editor", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            connectionId,
            path: savedPath,
            content,
          }),
        });
        const data = await res.json();
        if (data.error) {
          setError(data.error);
          return;
        }
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("claw.extend.failedSave")
      );
    } finally {
      setSaving(false);
    }
  }, [connectionId, canSave, skillName, skillDescription, skillBody, savedPath, t]);

  const resetForm = useCallback(() => {
    setPhase("describe");
    setPrompt("");
    setSkillName("");
    setSkillDescription("");
    setSkillBody("");
    setSavedPath(null);
    setSaved(false);
    setError(null);
    setShowPreview(false);
  }, []);

  if (!connected) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Server className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm">{t("claw.extend.connectToManage")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Puzzle className="h-4 w-4" />
            {t("claw.extend.title")}
          </span>
          <div className="flex items-center gap-1.5">
            {phase === "edit" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowPreview(!showPreview)}
                className="h-7 px-2 text-xs"
              >
                {showPreview ? (
                  <PenLine className="h-3.5 w-3.5 mr-1" />
                ) : (
                  <Eye className="h-3.5 w-3.5 mr-1" />
                )}
                {showPreview
                  ? t("claw.extend.edit")
                  : t("claw.extend.preview")}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={resetForm}
              className="h-7 px-2 text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              {t("claw.extend.reset")}
            </Button>
          </div>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t("claw.extend.subtitle")}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/20 rounded-md px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}

        {phase === "describe" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">
                {t("claw.extend.promptLabel")}
              </Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t("claw.extend.promptPlaceholder")}
                className="min-h-[140px] text-sm resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    generateSkill();
                  }
                }}
              />
              <p className="text-[10px] text-muted-foreground">
                {t("claw.extend.promptHint")}
              </p>
            </div>

            <Button
              onClick={generateSkill}
              disabled={generating || !prompt.trim()}
              className="h-9"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {generating
                ? t("claw.extend.generating")
                : t("claw.extend.generate")}
            </Button>
          </div>
        )}

        {phase === "edit" && (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setPhase("describe")}
              className="h-7 px-2 text-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              {t("claw.extend.backToDescribe")}
            </Button>

            {showPreview ? (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {t("claw.extend.previewLabel")}
                </Label>
                <CodeEditor
                  value={preview}
                  onChange={() => {}}
                  language="markdown"
                  minHeight="400px"
                  readOnly
                />
              </div>
            ) : (
              <>
                <div className="space-y-3 p-3 rounded-md border bg-muted/30">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      {t("claw.extend.skillName")}
                    </Label>
                    <Input
                      value={skillName}
                      onChange={(e) => setSkillName(e.target.value)}
                      className="h-8 text-sm"
                      placeholder={t("claw.extend.skillNamePlaceholder")}
                    />
                    {skillName && (
                      <p className="text-[10px] text-muted-foreground font-mono">
                        $HOME/.openclaw/workspace/skills/{safeName}/SKILL.md
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      {t("claw.extend.description")}
                    </Label>
                    <Input
                      value={skillDescription}
                      onChange={(e) => setSkillDescription(e.target.value)}
                      className="h-8 text-sm"
                      placeholder={t("claw.extend.descriptionPlaceholder")}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      {t("claw.extend.descriptionHint")}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    {t("claw.extend.body")}
                  </Label>
                  <CodeEditor
                    value={skillBody}
                    onChange={setSkillBody}
                    language="markdown"
                    minHeight="300px"
                  />
                </div>
              </>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                onClick={saveSkill}
                disabled={saving || !canSave}
                className="h-8"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                )}
                {t("claw.extend.saveSkill")}
              </Button>
              {saved && (
                <span className="text-xs text-emerald-500">
                  {t("claw.extend.saved")}
                </span>
              )}
              {!canSave && skillName.length > 0 && (
                <span className="text-xs text-yellow-500">
                  {t("claw.extend.descriptionRequired")}
                </span>
              )}
            </div>

            {savedPath && (
              <p className="text-[10px] text-muted-foreground font-mono">
                {savedPath}SKILL.md
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
