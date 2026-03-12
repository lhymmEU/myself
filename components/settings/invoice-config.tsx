"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Receipt } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/context";

interface InvoiceConfigProps {
  settings: Record<string, string>;
  onUpdate: (key: string, value: string) => void;
}

const SENDER_KEYS = [
  "invoice_sender_name",
  "invoice_sender_email",
  "invoice_sender_phone",
  "invoice_payment_info",
] as const;

const SMTP_KEYS = [
  "smtp_host",
  "smtp_port",
  "smtp_user",
  "smtp_pass",
  "smtp_secure",
] as const;

function pick(settings: Record<string, string>, keys: readonly string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const k of keys) result[k] = settings[k] ?? "";
  return result;
}

export function InvoiceConfig({ settings, onUpdate }: InvoiceConfigProps) {
  const t = useT();

  const [sender, setSender] = useState(() => pick(settings, SENDER_KEYS));
  const [smtp, setSmtp] = useState(() => pick(settings, SMTP_KEYS));

  useEffect(() => {
    setSender(pick(settings, SENDER_KEYS));
    setSmtp(pick(settings, SMTP_KEYS));
  }, [settings]);

  const saveSender = async () => {
    try {
      for (const key of SENDER_KEYS) {
        await onUpdate(key, sender[key]);
      }
      toast.success(t("settings.form.settingSaved"));
    } catch {
      toast.error(t("settings.form.failedSave"));
    }
  };

  const saveSmtp = async () => {
    try {
      for (const key of SMTP_KEYS) {
        await onUpdate(key, smtp[key]);
      }
      toast.success(t("settings.form.settingSaved"));
    } catch {
      toast.error(t("settings.form.failedSave"));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="size-5" />
          {t("settings.invoice.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sender defaults */}
        <div className="space-y-4">
          <p className="text-sm font-medium text-muted-foreground">
            {t("settings.invoice.senderDefaults")}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("settings.invoice.senderName")}</Label>
              <Input
                value={sender.invoice_sender_name}
                onChange={(e) => setSender({ ...sender, invoice_sender_name: e.target.value })}
                placeholder={t("settings.invoice.senderNamePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("settings.invoice.senderEmail")}</Label>
              <Input
                value={sender.invoice_sender_email}
                onChange={(e) => setSender({ ...sender, invoice_sender_email: e.target.value })}
                placeholder={t("settings.invoice.senderEmailPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("settings.invoice.senderPhone")}</Label>
              <Input
                value={sender.invoice_sender_phone}
                onChange={(e) => setSender({ ...sender, invoice_sender_phone: e.target.value })}
                placeholder={t("settings.invoice.senderPhonePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("settings.invoice.defaultPayment")}</Label>
              <Input
                value={sender.invoice_payment_info}
                onChange={(e) => setSender({ ...sender, invoice_payment_info: e.target.value })}
                placeholder={t("settings.invoice.defaultPaymentPlaceholder")}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={saveSender}>
              {t("common.save")}
            </Button>
          </div>
        </div>

        <Separator />

        {/* SMTP config */}
        <div className="space-y-4">
          <p className="text-sm font-medium text-muted-foreground">
            {t("settings.invoice.smtpConfig")}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("settings.invoice.smtpHost")}</Label>
              <Input
                value={smtp.smtp_host}
                onChange={(e) => setSmtp({ ...smtp, smtp_host: e.target.value })}
                placeholder="smtp.gmail.com"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("settings.invoice.smtpPort")}</Label>
              <Input
                value={smtp.smtp_port || "587"}
                onChange={(e) => setSmtp({ ...smtp, smtp_port: e.target.value })}
                placeholder="587"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("settings.invoice.smtpUser")}</Label>
              <Input
                value={smtp.smtp_user}
                onChange={(e) => setSmtp({ ...smtp, smtp_user: e.target.value })}
                placeholder={t("settings.invoice.smtpUserPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("settings.invoice.smtpPass")}</Label>
              <Input
                type="password"
                value={smtp.smtp_pass}
                onChange={(e) => setSmtp({ ...smtp, smtp_pass: e.target.value })}
                placeholder={t("settings.invoice.smtpPassPlaceholder")}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={smtp.smtp_secure === "true"}
              onCheckedChange={(checked) =>
                setSmtp({ ...smtp, smtp_secure: checked ? "true" : "false" })
              }
            />
            <Label>{t("settings.invoice.smtpSecure")}</Label>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("settings.invoice.smtpHelp")}
          </p>
          <div className="flex justify-end">
            <Button size="sm" onClick={saveSmtp}>
              {t("common.save")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
