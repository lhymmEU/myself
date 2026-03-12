"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvoiceList } from "@/components/invoice/invoice-list";
import { InvoiceEditor } from "@/components/invoice/invoice-editor";
import { InvoicePreview } from "@/components/invoice/invoice-preview";
import { ClientManager } from "@/components/invoice/client-manager";
import { SignatureManager } from "@/components/invoice/signature-manager";
import { useT } from "@/lib/i18n/context";

type View = "list" | "editor" | "preview";

export default function InvoicePage() {
  const t = useT();
  const [view, setView] = useState<View>("list");
  const [editingId, setEditingId] = useState<string | undefined>();
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleNew = () => {
    setEditingId(undefined);
    setView("editor");
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setView("editor");
  };

  const handlePreview = (id: string) => {
    setPreviewId(id);
  };

  const handleBack = () => {
    setView("list");
    setEditingId(undefined);
  };

  const handleSaved = () => {
    setView("list");
    setEditingId(undefined);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-6 px-8 py-4">
      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">{t("invoice.tabs.invoices")}</TabsTrigger>
          <TabsTrigger value="clients">{t("invoice.tabs.clients")}</TabsTrigger>
          <TabsTrigger value="signatures">{t("invoice.tabs.signatures")}</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-4">
          {view === "list" && (
            <InvoiceList
              onEdit={handleEdit}
              onPreview={handlePreview}
              onNew={handleNew}
              refreshKey={refreshKey}
            />
          )}
          {view === "editor" && (
            <InvoiceEditor
              invoiceId={editingId}
              onBack={handleBack}
              onPreview={handlePreview}
              onSaved={handleSaved}
            />
          )}
        </TabsContent>

        <TabsContent value="clients" className="mt-4">
          <ClientManager />
        </TabsContent>

        <TabsContent value="signatures" className="mt-4">
          <SignatureManager />
        </TabsContent>
      </Tabs>

      <InvoicePreview
        invoiceId={previewId}
        onClose={() => setPreviewId(null)}
        onSent={() => {
          setView("list");
          setEditingId(undefined);
          setRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );
}
