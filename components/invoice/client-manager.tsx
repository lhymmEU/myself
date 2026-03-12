"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Building2, Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/context";
import type { InvoiceClient } from "@/lib/modules/invoice/types";

export function ClientManager() {
  const t = useT();
  const [clients, setClients] = useState<InvoiceClient[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InvoiceClient | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    company: "",
    notes: "",
  });

  const fetchClients = useCallback(async () => {
    const res = await fetch("/api/invoice?action=clients");
    return res.ok ? await res.json() : null;
  }, []);

  const loadClients = useCallback(async () => {
    const data = await fetchClients();
    if (data) setClients(data);
  }, [fetchClients]);

  useEffect(() => {
    fetchClients().then((data) => { if (data) setClients(data); });
  }, [fetchClients]);

  const resetForm = () => {
    setForm({ name: "", email: "", phone: "", address: "", company: "", notes: "" });
    setEditing(null);
  };

  const openEdit = (client: InvoiceClient) => {
    setEditing(client);
    setForm({
      name: client.name,
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
      company: client.company || "",
      notes: client.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const payload = editing
      ? { entity: "client", data: { id: editing.id, ...form } }
      : { entity: "client", data: form };

    const res = await fetch("/api/invoice", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      toast.success(editing ? t("invoice.clients.updated") : t("invoice.clients.created"));
      setDialogOpen(false);
      resetForm();
      loadClients();
    } else {
      toast.error(t("invoice.clients.failedSave"));
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/invoice?id=${id}&entity=client`, { method: "DELETE" });
    if (res.ok) {
      toast.success(t("common.delete"));
      loadClients();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t("invoice.clients.title")}</h3>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              {t("invoice.clients.add")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing ? t("invoice.clients.edit") : t("invoice.clients.add")}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("common.name")} *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("invoice.clients.company")}</Label>
                  <Input
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("invoice.clients.email")}</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("invoice.clients.phone")}</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("invoice.clients.address")}</Label>
                <Textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("invoice.clients.notes")}</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit">{t("common.save")}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {clients.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          {t("invoice.clients.empty")}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id} className="group">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{client.name}</p>
                    {client.company && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {client.company}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(client)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(client.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {client.email && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {client.email}
                  </p>
                )}
                {client.phone && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {client.phone}
                  </p>
                )}
                {client.address && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {client.address}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
