"use client";

import { useMemo, useState } from "react";
import { useT } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FormData, FormField } from "@/lib/claw-ai/parts";

interface FormPartProps {
  data: FormData;
  onSubmit?: (values: Record<string, unknown>) => Promise<void> | void;
  onCancel?: () => void;
}

/**
 * Generative form: openclaw asks for missing parameters in plain
 * language ("When should I run this for you?") and the user fills in
 * a typed form rendered from a [CARD type=form] payload.
 */
export function FormPart({ data, onSubmit, onCancel }: FormPartProps) {
  const t = useT();
  const initial = useMemo(() => {
    const seed: Record<string, unknown> = {};
    for (const f of data.fields) seed[f.name] = f.value ?? "";
    return seed;
  }, [data]);
  const [values, setValues] = useState<Record<string, unknown>>(initial);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit?.(values);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3 text-sm">
      {data.description && (
        <p className="text-muted-foreground">{data.description}</p>
      )}
      {data.fields.map((field) => (
        <FieldRow
          key={field.name}
          field={field}
          value={values[field.name]}
          onChange={(v) =>
            setValues((prev) => ({ ...prev, [field.name]: v }))
          }
        />
      ))}
      <div className="flex items-center justify-end gap-2 pt-1">
        {onCancel && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onCancel}
            disabled={submitting}
          >
            {t("claw.parts.form.cancel")}
          </Button>
        )}
        <Button size="sm" onClick={handleSubmit} disabled={submitting}>
          {data.submitLabel || t("claw.parts.form.submit")}
        </Button>
      </div>
    </div>
  );
}

interface FieldRowProps {
  field: FormField;
  value: unknown;
  onChange: (value: unknown) => void;
}

function FieldRow({ field, value, onChange }: FieldRowProps) {
  const stringValue = typeof value === "string" ? value : String(value ?? "");
  const inputId = `form-field-${field.name}`;

  return (
    <div className="space-y-1">
      <Label htmlFor={inputId} className="text-xs">
        {field.label}
        {field.required && <span className="text-red-500"> *</span>}
      </Label>
      {field.type === "textarea" ? (
        <Textarea
          id={inputId}
          value={stringValue}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        />
      ) : field.type === "select" ? (
        <Select value={stringValue} onValueChange={onChange}>
          <SelectTrigger id={inputId}>
            <SelectValue placeholder={field.placeholder ?? "Select…"} />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : field.type === "time" ? (
        <Input
          id={inputId}
          type="time"
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : field.type === "number" ? (
        <Input
          id={inputId}
          type="number"
          value={stringValue}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input
          id={inputId}
          value={stringValue}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
