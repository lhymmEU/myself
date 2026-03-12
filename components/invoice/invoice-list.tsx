"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  Copy,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/context";
import type { Invoice } from "@/lib/modules/invoice/types";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

interface InvoiceListProps {
  onEdit: (id: string) => void;
  onPreview: (id: string) => void;
  onNew: () => void;
  refreshKey: number;
}

export function InvoiceList({ onEdit, onPreview, onNew, refreshKey }: InvoiceListProps) {
  const t = useT();
  const [invoiceList, setInvoiceList] = useState<Invoice[]>([]);
  const [search, setSearch] = useState("");

  const loadInvoices = useCallback(async () => {
    const res = await fetch("/api/invoice");
    if (res.ok) setInvoiceList(await res.json());
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices, refreshKey]);

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/invoice?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(t("invoice.list.deleted"));
      loadInvoices();
    }
  };

  const handleDuplicate = async (inv: Invoice) => {
    const detail = await fetch(`/api/invoice?action=detail&id=${inv.id}`).then((r) => r.json());
    const res = await fetch("/api/invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: detail.clientId,
        date: new Date().toISOString().split("T")[0],
        dueDate: detail.dueDate,
        currency: detail.currency,
        senderName: detail.senderName,
        senderEmail: detail.senderEmail,
        senderPhone: detail.senderPhone,
        paymentInfo: detail.paymentInfo,
        signatureId: detail.signatureId,
        notes: detail.notes,
        tax: detail.tax,
        items: detail.items.map((it: { description: string; rate: number; quantity: number; amount: number }) => ({
          description: it.description,
          rate: it.rate,
          quantity: it.quantity,
          amount: it.amount,
        })),
      }),
    });
    if (res.ok) {
      toast.success(t("invoice.list.duplicated"));
      loadInvoices();
    }
  };

  const filtered = invoiceList.filter(
    (inv) =>
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.senderName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("invoice.list.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={onNew}>
          <Plus className="h-4 w-4 mr-1" />
          {t("invoice.list.new")}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">
          {t("invoice.list.empty")}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((inv) => (
            <Card key={inv.id} className="group">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-sm">
                      {inv.invoiceNumber}
                    </span>
                    <Badge variant="secondary" className={STATUS_COLORS[inv.status]}>
                      {t(`invoice.status.${inv.status}` as Parameters<typeof t>[0])}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span>{inv.date}</span>
                    {inv.dueDate && <span>→ {inv.dueDate}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {inv.currency} {inv.total.toFixed(2)}
                  </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onPreview(inv.id)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(inv.id)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDuplicate(inv)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(inv.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
