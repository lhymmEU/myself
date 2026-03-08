"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
} from "lucide-react";
import { useT } from "@/lib/i18n/context";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface JsonFormEditorProps {
  value: Record<string, JsonValue>;
  onChange: (value: Record<string, JsonValue>) => void;
  className?: string;
}

export function JsonFormEditor({ value, onChange, className }: JsonFormEditorProps) {
  return (
    <div className={className}>
      <ObjectFields
        value={value}
        path={[]}
        onChange={(updated) => onChange(updated as Record<string, JsonValue>)}
        depth={0}
        allowAddRemove
      />
    </div>
  );
}

function ObjectFields({
  value,
  path,
  onChange,
  depth,
  allowAddRemove,
}: {
  value: Record<string, JsonValue>;
  path: string[];
  onChange: (updated: JsonValue) => void;
  depth: number;
  allowAddRemove?: boolean;
}) {
  const t = useT();
  const [newKey, setNewKey] = useState("");

  const updateField = useCallback(
    (key: string, fieldValue: JsonValue) => {
      onChange({ ...value, [key]: fieldValue });
    },
    [value, onChange]
  );

  const removeField = useCallback(
    (key: string) => {
      const next = { ...value };
      delete next[key];
      onChange(next);
    },
    [value, onChange]
  );

  const addField = useCallback(() => {
    const key = newKey.trim();
    if (!key || key in value) return;
    onChange({ ...value, [key]: "" });
    setNewKey("");
  }, [value, onChange, newKey]);

  return (
    <div className="space-y-3">
      {Object.entries(value).map(([key, fieldValue]) => (
        <FieldRenderer
          key={[...path, key].join(".")}
          label={key}
          value={fieldValue}
          path={[...path, key]}
          onChange={(v) => updateField(key, v)}
          onRemove={allowAddRemove ? () => removeField(key) : undefined}
          depth={depth}
        />
      ))}
      {allowAddRemove && (
        <div className="flex items-center gap-2 pt-1">
          <Input
            placeholder={t("claw.jsonForm.newFieldName")}
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addField()}
            className="h-7 text-xs max-w-[180px]"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addField}
            disabled={!newKey.trim() || newKey.trim() in value}
            className="h-7 px-2"
          >
            <Plus className="h-3 w-3 mr-1" />
            {t("common.add")}
          </Button>
        </div>
      )}
    </div>
  );
}

function FieldRenderer({
  label,
  value,
  path,
  onChange,
  onRemove,
  depth,
}: {
  label: string;
  value: JsonValue;
  path: string[];
  onChange: (v: JsonValue) => void;
  onRemove?: () => void;
  depth: number;
}) {
  const t = useT();
  const [collapsed, setCollapsed] = useState(depth > 1);

  if (typeof value === "boolean") {
    return (
      <div className="flex items-center justify-between gap-3 py-1" style={{ paddingLeft: depth * 12 }}>
        <div className="flex items-center gap-2 min-w-0">
          <Label className="text-xs font-mono text-muted-foreground truncate">{label}</Label>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Switch
            size="sm"
            checked={value}
            onCheckedChange={(checked) => onChange(checked)}
          />
          {onRemove && (
            <Button type="button" size="sm" variant="ghost" onClick={onRemove} className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (typeof value === "number") {
    return (
      <div className="space-y-1" style={{ paddingLeft: depth * 12 }}>
        <div className="flex items-center justify-between">
          <Label className="text-xs font-mono text-muted-foreground">{label}</Label>
          {onRemove && (
            <Button type="button" size="sm" variant="ghost" onClick={onRemove} className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
        <Input
          type="number"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === "" ? 0 : Number(v));
          }}
          className="h-7 text-xs font-mono"
        />
      </div>
    );
  }

  if (typeof value === "string") {
    return (
      <div className="space-y-1" style={{ paddingLeft: depth * 12 }}>
        <div className="flex items-center justify-between">
          <Label className="text-xs font-mono text-muted-foreground">{label}</Label>
          {onRemove && (
            <Button type="button" size="sm" variant="ghost" onClick={onRemove} className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 text-xs font-mono"
        />
      </div>
    );
  }

  if (Array.isArray(value)) {
    return (
      <div style={{ paddingLeft: depth * 12 }}>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {label}
            <span className="text-[10px] opacity-60">[{value.length}]</span>
          </button>
          {onRemove && (
            <Button type="button" size="sm" variant="ghost" onClick={onRemove} className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
        {!collapsed && (
          <div className="mt-2 ml-3 border-l border-border pl-3 space-y-2">
            {value.map((item, idx) => (
              <FieldRenderer
                key={`${path.join(".")}.${idx}`}
                label={`[${idx}]`}
                value={item}
                path={[...path, String(idx)]}
                onChange={(v) => {
                  const next = [...value];
                  next[idx] = v;
                  onChange(next);
                }}
                onRemove={() => {
                  const next = value.filter((_, i) => i !== idx);
                  onChange(next);
                }}
                depth={depth + 1}
              />
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onChange([...value, ""])}
              className="h-6 px-2 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              {t("claw.jsonForm.addItem")}
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (value !== null && typeof value === "object") {
    return (
      <div style={{ paddingLeft: depth * 12 }}>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {label}
            <span className="text-[10px] opacity-60">{`{${Object.keys(value).length}}`}</span>
          </button>
          {onRemove && (
            <Button type="button" size="sm" variant="ghost" onClick={onRemove} className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
        {!collapsed && (
          <div className="mt-2 ml-3 border-l border-border pl-3">
            <ObjectFields
              value={value as Record<string, JsonValue>}
              path={path}
              onChange={onChange}
              depth={depth + 1}
              allowAddRemove
            />
          </div>
        )}
      </div>
    );
  }

  // null / unknown
  return (
    <div className="space-y-1" style={{ paddingLeft: depth * 12 }}>
      <div className="flex items-center justify-between">
        <Label className="text-xs font-mono text-muted-foreground">{label} <span className="text-[10px] opacity-50">({t("claw.jsonForm.nullValue")})</span></Label>
        {onRemove && (
          <Button type="button" size="sm" variant="ghost" onClick={onRemove} className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
      <Input
        value=""
        placeholder={t("claw.jsonForm.nullValue")}
        onChange={(e) => onChange(e.target.value || null)}
        className="h-7 text-xs font-mono"
      />
    </div>
  );
}
