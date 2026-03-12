"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, ArrowLeft, Eye } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/context";
import type {
  InvoiceClient,
  InvoiceSignature,
  CreateInvoiceItemInput,
  InvoiceWithDetails,
} from "@/lib/modules/invoice/types";

interface InvoiceEditorProps {
  invoiceId?: string;
  onBack: () => void;
  onPreview: (id: string) => void;
  onSaved: () => void;
}

const EMPTY_ITEM: CreateInvoiceItemInput = {
  description: "",
  rate: 0,
  quantity: 1,
  amount: 0,
};

export function InvoiceEditor({ invoiceId, onBack, onPreview, onSaved }: InvoiceEditorProps) {
  const t = useT();
  const [clients, setClients] = useState<InvoiceClient[]>([]);
  const [signatures, setSignatures] = useState<InvoiceSignature[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    clientId: "",
    date: new Date().toISOString().split("T")[0],
    dueDate: "",
    currency: "USD",
    senderName: "",
    senderEmail: "",
    senderPhone: "",
    paymentInfo: "",
    signatureId: "",
    notes: "",
    tax: 0,
  });

  const [items, setItems] = useState<CreateInvoiceItemInput[]>([{ ...EMPTY_ITEM }]);

  const loadData = useCallback(async () => {
    const [clientsRes, sigsRes, numRes, settingsRes] = await Promise.all([
      fetch("/api/invoice?action=clients"),
      fetch("/api/invoice?action=signatures"),
      fetch("/api/invoice?action=nextNumber"),
      fetch("/api/settings"),
    ]);

    if (clientsRes.ok) setClients(await clientsRes.json());
    if (sigsRes.ok) {
      const sigs = await sigsRes.json();
      setSignatures(sigs);
      if (!invoiceId) {
        const defaultSig = sigs.find((s: InvoiceSignature) => s.isDefault);
        if (defaultSig) setForm((f) => ({ ...f, signatureId: defaultSig.id }));
      }
    }
    if (numRes.ok && !invoiceId) {
      const data = await numRes.json();
      setInvoiceNumber(data.number);
    }

    if (settingsRes.ok && !invoiceId) {
      const settings = await settingsRes.json();
      setForm((f) => ({
        ...f,
        senderName: settings.invoice_sender_name || f.senderName,
        senderEmail: settings.invoice_sender_email || f.senderEmail,
        senderPhone: settings.invoice_sender_phone || f.senderPhone,
        paymentInfo: settings.invoice_payment_info || f.paymentInfo,
      }));
    }
  }, [invoiceId]);

  const loadInvoice = useCallback(async () => {
    if (!invoiceId) return;
    const res = await fetch(`/api/invoice?action=detail&id=${invoiceId}`);
    if (!res.ok) return;
    const inv: InvoiceWithDetails = await res.json();
    setInvoiceNumber(inv.invoiceNumber);
    setForm({
      clientId: inv.clientId || "",
      date: inv.date,
      dueDate: inv.dueDate || "",
      currency: inv.currency,
      senderName: inv.senderName || "",
      senderEmail: inv.senderEmail || "",
      senderPhone: inv.senderPhone || "",
      paymentInfo: inv.paymentInfo || "",
      signatureId: inv.signatureId || "",
      notes: inv.notes || "",
      tax: inv.tax,
    });
    setItems(
      inv.items.length > 0
        ? inv.items.map((it) => ({
            description: it.description,
            rate: it.rate,
            quantity: it.quantity,
            amount: it.amount,
            sortOrder: it.sortOrder,
          }))
        : [{ ...EMPTY_ITEM }]
    );
  }, [invoiceId]);

  useEffect(() => {
    loadData();
    loadInvoice();
  }, [loadData, loadInvoice]);

  const updateItem = (idx: number, field: keyof CreateInvoiceItemInput, value: string | number) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === "rate" || field === "quantity") {
        next[idx].amount = Number(next[idx].rate) * Number(next[idx].quantity);
      }
      return next;
    });
  };

  const addItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }]);

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const subtotal = items.reduce((sum, it) => sum + it.amount, 0);
  const total = subtotal + form.tax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = invoiceId
      ? {
          id: invoiceId,
          ...form,
          clientId: form.clientId || undefined,
          signatureId: form.signatureId || undefined,
          items,
        }
      : {
          ...form,
          clientId: form.clientId || undefined,
          signatureId: form.signatureId || undefined,
          items,
        };

    const res = await fetch("/api/invoice", {
      method: invoiceId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (res.ok) {
      toast.success(invoiceId ? t("invoice.editor.updated") : t("invoice.editor.created"));
      onSaved();
    } else {
      toast.error(t("invoice.editor.failedSave"));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t("common.back")}
        </Button>
        <div className="flex gap-2">
          {invoiceId && (
            <Button type="button" variant="outline" size="sm" onClick={() => onPreview(invoiceId)}>
              <Eye className="h-4 w-4 mr-1" />
              {t("invoice.editor.preview")}
            </Button>
          )}
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? t("common.loading") : t("common.save")}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sender info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              {t("invoice.editor.from")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder={t("invoice.editor.senderName")}
              value={form.senderName}
              onChange={(e) => setForm({ ...form, senderName: e.target.value })}
            />
            <Input
              placeholder={t("invoice.editor.senderEmail")}
              value={form.senderEmail}
              onChange={(e) => setForm({ ...form, senderEmail: e.target.value })}
            />
            <Input
              placeholder={t("invoice.editor.senderPhone")}
              value={form.senderPhone}
              onChange={(e) => setForm({ ...form, senderPhone: e.target.value })}
            />
          </CardContent>
        </Card>

        {/* Client & invoice meta */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              {t("invoice.editor.billTo")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select
              value={form.clientId}
              onValueChange={(v) => setForm({ ...form, clientId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("invoice.editor.selectClient")} />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}{c.company ? ` (${c.company})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t("invoice.editor.invoiceNumber")}</Label>
                <Input value={invoiceNumber} readOnly className="bg-muted" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("invoice.editor.currency")}</Label>
                <Input
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("invoice.editor.date")}</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("invoice.editor.dueDate")}</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            {t("invoice.editor.items")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_100px_80px_100px_40px] gap-2 text-xs font-medium text-muted-foreground px-1">
              <span>{t("invoice.editor.description")}</span>
              <span className="text-right">{t("invoice.editor.rate")}</span>
              <span className="text-right">{t("invoice.editor.qty")}</span>
              <span className="text-right">{t("invoice.editor.amount")}</span>
              <span />
            </div>
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_100px_80px_100px_40px] gap-2 items-center">
                <Input
                  value={item.description}
                  onChange={(e) => updateItem(idx, "description", e.target.value)}
                  placeholder={t("invoice.editor.itemDescription")}
                />
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={item.rate || ""}
                  onChange={(e) => updateItem(idx, "rate", parseFloat(e.target.value) || 0)}
                  className="text-right"
                />
                <Input
                  type="number"
                  min={0}
                  step="1"
                  value={item.quantity || ""}
                  onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                  className="text-right"
                />
                <Input
                  type="number"
                  value={item.amount.toFixed(2)}
                  readOnly
                  className="text-right bg-muted"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => removeItem(idx)}
                  disabled={items.length <= 1}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-3 w-3 mr-1" />
              {t("invoice.editor.addItem")}
            </Button>
          </div>

          <Separator className="my-4" />

          <div className="flex flex-col items-end gap-1 text-sm">
            <div className="flex items-center gap-4 w-64">
              <span className="text-muted-foreground flex-1">{t("invoice.editor.subtotal")}</span>
              <span className="font-medium">{form.currency} {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2 w-64">
              <span className="text-muted-foreground flex-1">{t("invoice.editor.tax")}</span>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.tax || ""}
                onChange={(e) => setForm({ ...form, tax: parseFloat(e.target.value) || 0 })}
                className="w-28 text-right h-8"
              />
            </div>
            <div className="flex items-center gap-4 w-64 pt-2 border-t font-semibold">
              <span className="flex-1">{t("invoice.editor.total")}</span>
              <span>{form.currency} {total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              {t("invoice.editor.paymentAndNotes")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">{t("invoice.editor.paymentInfo")}</Label>
              <Input
                value={form.paymentInfo}
                onChange={(e) => setForm({ ...form, paymentInfo: e.target.value })}
                placeholder={t("invoice.editor.paymentPlaceholder")}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("invoice.editor.notes")}</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                placeholder={t("invoice.editor.notesPlaceholder")}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              {t("invoice.editor.signature")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {signatures.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("invoice.editor.noSignatures")}
              </p>
            ) : (
              <Select
                value={form.signatureId}
                onValueChange={(v) => setForm({ ...form, signatureId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("invoice.editor.selectSignature")} />
                </SelectTrigger>
                <SelectContent>
                  {signatures.map((sig) => (
                    <SelectItem key={sig.id} value={sig.id}>
                      {sig.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {form.signatureId && (
              <div className="mt-3 border rounded bg-white p-2">
                <img
                  src={signatures.find((s) => s.id === form.signatureId)?.dataUrl}
                  alt="Signature"
                  className="h-12 w-full object-contain"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
