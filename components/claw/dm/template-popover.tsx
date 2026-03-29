"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/context";
import type { TemplateConfig } from "./types";

interface TemplatePopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: TemplateConfig;
  onSubmit: (message: string) => void;
  children: React.ReactNode;
}

export function TemplatePopover({
  open,
  onOpenChange,
  template,
  onSubmit,
  children,
}: TemplatePopoverProps) {
  const t = useT();
  const [values, setValues] = useState<Record<string, string>>({});

  const handleChange = useCallback((name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(() => {
    const message = template.buildMessage(values);
    onSubmit(message);
    setValues({});
  }, [template, values, onSubmit]);

  const hasRequiredFields = template.fields
    .filter((f) => f.type === "text")
    .some((f) => (values[f.name] ?? "").trim().length > 0);

  return (
    <>
      {children}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">
              {t(template.titleKey as Parameters<typeof t>[0])}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t(template.titleKey as Parameters<typeof t>[0])}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {template.fields.map((field) => (
              <div key={field.name} className="space-y-1.5">
                <Label className="text-xs">
                  {t(field.labelKey as Parameters<typeof t>[0])}
                </Label>

                {field.type === "text" ? (
                  <Input
                    value={values[field.name] ?? ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    className="h-9"
                  />
                ) : (
                  <Select
                    value={values[field.name] ?? ""}
                    onValueChange={(v) => handleChange(field.name, v)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {t(opt.labelKey as Parameters<typeof t>[0])}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!hasRequiredFields}
            >
              {t("claw.dm.template.startTask")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
