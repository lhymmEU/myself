"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Save,
  Loader2,
  AlertTriangle,
  Wand2,
  Plus,
  Server,
  RefreshCw,
  Pencil,
} from "lucide-react";
import { CodeEditor } from "@/components/claw/code-editor";
import { JsonFormEditor } from "@/components/claw/json-form-editor";
import type { InstalledSkill } from "@/lib/modules/claw/types";

interface SkillEditorProps {
  connectionId: string | null;
  connected: boolean;
  editingSkillPath: string | null;
  onSkillCreated?: () => void;
}

function parseFrontmatter(raw: string) {
  const fmMatch = raw.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!fmMatch) return { name: "", description: "", metadata: {} as Record<string, unknown>, body: raw };

  const fm = fmMatch[1];
  const body = raw.slice(fmMatch[0].length).replace(/^\n+/, "");
  const nameMatch = fm.match(/^name:\s*(.+)$/m);
  const descMatch = fm.match(/^description:\s*(.+)$/m);

  let metadata: Record<string, unknown> = {};
  const metaMatch = fm.match(/^metadata:\s*(.+)$/m);
  if (metaMatch) {
    try { metadata = JSON.parse(metaMatch[1]); } catch { /* ignore */ }
  }

  return {
    name: nameMatch?.[1]?.trim() ?? "",
    description: descMatch?.[1]?.trim() ?? "",
    metadata,
    body,
  };
}

function serializeToSkillMd(name: string, description: string, metadata: Record<string, unknown>, body: string) {
  let fm = `---\nname: ${name}\ndescription: ${description}`;
  if (Object.keys(metadata).length > 0) {
    fm += `\nmetadata: ${JSON.stringify(metadata)}`;
  }
  fm += "\n---\n\n";
  return fm + body;
}

export function SkillEditor({
  connectionId,
  connected,
  editingSkillPath,
  onSkillCreated,
}: SkillEditorProps) {
  const [skills, setSkills] = useState<InstalledSkill[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [skillName, setSkillName] = useState("");
  const [skillDescription, setSkillDescription] = useState("");
  const [skillMetadata, setSkillMetadata] = useState<Record<string, unknown>>({});
  const [skillBody, setSkillBody] = useState("");
  const [originalContent, setOriginalContent] = useState("");

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [creating, setCreating] = useState(false);

  const loadSkills = useCallback(async () => {
    if (!connectionId || !connected) return;
    try {
      const res = await fetch(
        `/api/claw/skills/installed?connectionId=${encodeURIComponent(connectionId)}`
      );
      const data = await res.json();
      if (!data.error) setSkills(data.skills ?? []);
    } catch { /* ignore */ }
  }, [connectionId, connected]);

  const loadSkillContent = useCallback(
    async (path: string) => {
      if (!connectionId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/claw/skills/editor?connectionId=${encodeURIComponent(connectionId)}&path=${encodeURIComponent(path)}`
        );
        const data = await res.json();
        if (data.error) {
          setError(data.error);
          return;
        }
        const raw = data.content ?? "";
        setOriginalContent(raw);
        const parsed = parseFrontmatter(raw);
        setSkillName(parsed.name);
        setSkillDescription(parsed.description);
        setSkillMetadata(parsed.metadata);
        setSkillBody(parsed.body);
        setSelectedPath(path);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load skill");
      } finally {
        setLoading(false);
      }
    },
    [connectionId]
  );

  const saveSkill = useCallback(async () => {
    if (!connectionId || !selectedPath) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const content = serializeToSkillMd(skillName, skillDescription, skillMetadata, skillBody);
      const res = await fetch("/api/claw/skills/editor", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, path: selectedPath, content }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setOriginalContent(content);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        loadSkills();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }, [connectionId, selectedPath, skillName, skillDescription, skillMetadata, skillBody, loadSkills]);

  const createSkill = useCallback(async () => {
    if (!connectionId || !newSkillName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/claw/skills/editor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, name: newSkillName.trim() }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setCreateDialogOpen(false);
        setNewSkillName("");
        await loadSkills();
        onSkillCreated?.();
        if (data.path) loadSkillContent(data.path);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create skill");
    } finally {
      setCreating(false);
    }
  }, [connectionId, newSkillName, loadSkills, loadSkillContent, onSkillCreated]);

  useEffect(() => {
    if (connected) loadSkills();
    else {
      setSkills([]);
      setSelectedPath(null);
      setError(null);
    }
  }, [connected, loadSkills]);

  useEffect(() => {
    if (editingSkillPath && connected) {
      loadSkillContent(editingSkillPath);
    }
  }, [editingSkillPath, connected, loadSkillContent]);

  const currentContent = serializeToSkillMd(skillName, skillDescription, skillMetadata, skillBody);
  const hasChanges = selectedPath !== null && currentContent !== originalContent;

  if (!connected) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Server className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-xs">Connect to manage skills</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Wand2 className="h-3.5 w-3.5" />
            Skill Editor
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={loadSkills}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCreateDialogOpen(true)}
              className="h-6 px-2 text-[10px]"
            >
              <Plus className="h-3 w-3 mr-0.5" />
              New
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Skill selector */}
        {!selectedPath && (
          <div className="space-y-1">
            {skills.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No skills installed. Create a new one to get started.
              </p>
            ) : (
              skills.map((skill) => (
                <button
                  key={skill.path}
                  className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors flex items-center gap-2 text-xs"
                  onClick={() => loadSkillContent(skill.path)}
                >
                  <Pencil className="h-3 w-3 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{skill.name || skill.path}</div>
                    {skill.description && (
                      <div className="text-muted-foreground truncate">{skill.description}</div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* Editor */}
        {selectedPath && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedPath(null);
                  setOriginalContent("");
                }}
                className="h-7 text-xs"
              >
                Back to list
              </Button>
              <Button
                size="sm"
                onClick={saveSkill}
                disabled={saving || !hasChanges}
                className="h-7"
              >
                {saving ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Save className="h-3 w-3 mr-1" />
                )}
                Save
              </Button>
              {hasChanges && (
                <span className="text-xs text-yellow-500">Unsaved</span>
              )}
              {saved && (
                <span className="text-xs text-emerald-500">Saved</span>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/20 rounded-md px-2 py-1.5">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="space-y-2 p-3 rounded-md border bg-muted/30">
                  <div className="space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={skillName}
                      onChange={(e) => setSkillName(e.target.value)}
                      className="h-7 text-xs"
                      placeholder="Skill name"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={skillDescription}
                      onChange={(e) => setSkillDescription(e.target.value)}
                      className="h-7 text-xs"
                      placeholder="What does this skill do?"
                    />
                  </div>
                  {Object.keys(skillMetadata).length > 0 && (
                    <div className="space-y-1">
                      <Label className="text-xs">Metadata</Label>
                      <JsonFormEditor
                        value={skillMetadata as Record<string, never>}
                        onChange={(v) => setSkillMetadata(v)}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Body (Markdown)</Label>
                  <CodeEditor
                    value={skillBody}
                    onChange={setSkillBody}
                    language="markdown"
                    minHeight="250px"
                  />
                </div>

                <div className="text-[10px] text-muted-foreground font-mono truncate">
                  {selectedPath}SKILL.md
                </div>
              </>
            )}
          </div>
        )}

        {/* Create skill dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Skill</DialogTitle>
              <DialogDescription>
                Create a new custom skill in ~/.openclaw/skills/
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Skill Name</Label>
              <Input
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                placeholder="my-custom-skill"
                onKeyDown={(e) => e.key === "Enter" && createSkill()}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createSkill} disabled={creating || !newSkillName.trim()}>
                {creating ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                )}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
