"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Download, Send, X, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/context";
import type { InvoiceWithDetails } from "@/lib/modules/invoice/types";

interface InvoicePreviewProps {
  invoiceId: string | null;
  onClose: () => void;
}

export function InvoicePreview({ invoiceId, onClose }: InvoicePreviewProps) {
  const t = useT();
  const [invoice, setInvoice] = useState<InvoiceWithDetails | null>(null);
  const [view, setView] = useState<"preview" | "send">("preview");
  const [sendEmail, setSendEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [pendingPdf, setPendingPdf] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const loadInvoice = useCallback(async () => {
    if (!invoiceId) return;
    const res = await fetch(`/api/invoice?action=detail&id=${invoiceId}`);
    if (res.ok) {
      const data = await res.json();
      setInvoice(data);
      setSendEmail(data.client?.email || "");
    }
  }, [invoiceId]);

  useEffect(() => {
    loadInvoice();
    setView("preview");
    setPendingPdf(null);
  }, [loadInvoice]);

  const generatePdfFromPreview = async () => {
    const el = previewRef.current;
    if (!el) throw new Error("Preview element not found");

    const { toPng } = await import("html-to-image");
    const { jsPDF } = await import("jspdf");

    const imgData = await toPng(el, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
    });

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = imgData;
    });

    const imgWidth = pageWidth;
    const imgHeight = (img.height * imgWidth) / img.width;

    let y = 0;
    while (y < imgHeight) {
      if (y > 0) pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, -y, imgWidth, imgHeight);
      y += pageHeight;
    }

    return pdf;
  };

  const handleDownload = async () => {
    if (!invoice) return;
    setDownloading(true);
    try {
      const pdf = await generatePdfFromPreview();
      pdf.save(`${invoice.invoiceNumber}.pdf`);
      toast.success(t("invoice.preview.downloaded"));
    } catch {
      toast.error(t("invoice.preview.downloadFailed"));
    }
    setDownloading(false);
  };

  const handlePrepareEmail = async () => {
    try {
      // #region agent log
      fetch('http://127.0.0.1:7491/ingest/599ee872-411b-4edc-a1b8-877fd5fc2059',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b5bbb4'},body:JSON.stringify({sessionId:'b5bbb4',location:'invoice-preview.tsx:handlePrepareEmail',message:'Starting PDF generation',data:{previewRefExists:!!previewRef.current,invoiceId:invoice?.id},timestamp:Date.now(),hypothesisId:'H-B'})}).catch(()=>{});
      // #endregion
      const pdf = await generatePdfFromPreview();
      const base64 = pdf.output("datauristring").split(",")[1];
      // #region agent log
      fetch('http://127.0.0.1:7491/ingest/599ee872-411b-4edc-a1b8-877fd5fc2059',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b5bbb4'},body:JSON.stringify({sessionId:'b5bbb4',location:'invoice-preview.tsx:handlePrepareEmail',message:'PDF generated successfully',data:{base64Length:base64?.length},timestamp:Date.now(),hypothesisId:'H-B'})}).catch(()=>{});
      // #endregion
      setPendingPdf(base64);
      setView("send");
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7491/ingest/599ee872-411b-4edc-a1b8-877fd5fc2059',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b5bbb4'},body:JSON.stringify({sessionId:'b5bbb4',location:'invoice-preview.tsx:handlePrepareEmail',message:'PDF generation FAILED',data:{error:err instanceof Error ? err.message : String(err)},timestamp:Date.now(),hypothesisId:'H-B'})}).catch(()=>{});
      // #endregion
      toast.error(t("invoice.preview.sendFailed"));
    }
  };

  const handleSend = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7491/ingest/599ee872-411b-4edc-a1b8-877fd5fc2059',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b5bbb4'},body:JSON.stringify({sessionId:'b5bbb4',location:'invoice-preview.tsx:handleSend',message:'handleSend called',data:{hasInvoice:!!invoice,sendEmail,hasPendingPdf:!!pendingPdf,pendingPdfLength:pendingPdf?.length},timestamp:Date.now(),hypothesisId:'H-C'})}).catch(()=>{});
    // #endregion
    if (!invoice || !sendEmail || !pendingPdf) return;
    setSending(true);
    try {
      const res = await fetch("/api/invoice/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: invoice.id,
          pdfBase64: pendingPdf,
          recipientEmail: sendEmail,
        }),
      });

      // #region agent log
      fetch('http://127.0.0.1:7491/ingest/599ee872-411b-4edc-a1b8-877fd5fc2059',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b5bbb4'},body:JSON.stringify({sessionId:'b5bbb4',location:'invoice-preview.tsx:handleSend',message:'API response received',data:{status:res.status,ok:res.ok},timestamp:Date.now(),hypothesisId:'H-C'})}).catch(()=>{});
      // #endregion

      if (res.ok) {
        toast.success(t("invoice.preview.sent"));
        setView("preview");
        setPendingPdf(null);
        loadInvoice();
      } else {
        const err = await res.json();
        // #region agent log
        fetch('http://127.0.0.1:7491/ingest/599ee872-411b-4edc-a1b8-877fd5fc2059',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b5bbb4'},body:JSON.stringify({sessionId:'b5bbb4',location:'invoice-preview.tsx:handleSend',message:'API returned error',data:{error:err.error,status:res.status},timestamp:Date.now(),hypothesisId:'H-C'})}).catch(()=>{});
        // #endregion
        toast.error(err.error || t("invoice.preview.sendFailed"));
      }
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7491/ingest/599ee872-411b-4edc-a1b8-877fd5fc2059',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b5bbb4'},body:JSON.stringify({sessionId:'b5bbb4',location:'invoice-preview.tsx:handleSend',message:'Fetch threw exception',data:{error:err instanceof Error ? err.message : String(err)},timestamp:Date.now(),hypothesisId:'H-D'})}).catch(()=>{});
      // #endregion
      toast.error(t("invoice.preview.sendFailed"));
    }
    setSending(false);
  };

  if (!invoiceId) return null;

  return (
    <Dialog open={!!invoiceId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{t("invoice.preview.title")}</DialogTitle>
            <div className="flex gap-2">
              {view === "preview" && (
                <>
                  <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading}>
                    {downloading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
                    {t("invoice.preview.download")}
                  </Button>
                  <Button size="sm" onClick={handlePrepareEmail}>
                    <Send className="h-4 w-4 mr-1" />
                    {t("invoice.preview.send")}
                  </Button>
                </>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {view === "send" ? (
          <div className="space-y-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setView("preview"); setPendingPdf(null); }}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              {t("common.back")}
            </Button>
            <div className="space-y-2">
              <Label>{t("invoice.preview.recipientEmail")}</Label>
              <Input
                type="email"
                value={sendEmail}
                onChange={(e) => setSendEmail(e.target.value)}
                placeholder={t("invoice.preview.emailPlaceholder")}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => { setView("preview"); setPendingPdf(null); }}
              >
                {t("common.cancel")}
              </Button>
              <Button onClick={handleSend} disabled={sending || !sendEmail}>
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Send className="h-4 w-4 mr-1" />
                )}
                {t("invoice.preview.sendButton")}
              </Button>
            </div>
          </div>
        ) : !invoice ? (
          <div className="py-12 text-center text-muted-foreground">{t("common.loading")}</div>
        ) : (
          <div
            ref={previewRef}
            className="bg-white text-black p-8 rounded-md shadow-sm"
            style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {invoice.senderName || "—"}
                </h2>
                {invoice.senderPhone && (
                  <p className="text-sm text-gray-600">{invoice.senderPhone}</p>
                )}
                {invoice.senderEmail && (
                  <p className="text-sm text-gray-600">{invoice.senderEmail}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  {t("invoice.preview.invoiceLabel")}
                </p>
                <p className="font-mono font-bold text-lg">
                  {invoice.invoiceNumber}
                </p>
                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  <p>
                    <span className="text-xs text-gray-500 uppercase">
                      {t("invoice.preview.dateLabel")}
                    </span>
                    <br />
                    {invoice.date}
                  </p>
                  {invoice.dueDate && (
                    <p>
                      <span className="text-xs text-gray-500 uppercase">
                        {t("invoice.preview.dueDateLabel")}
                      </span>
                      <br />
                      {invoice.dueDate}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Bill to */}
            {invoice.client && (
              <div className="mb-8 pb-4 border-b border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  {t("invoice.preview.billTo")}
                </p>
                <p className="font-semibold text-gray-900">{invoice.client.name}</p>
                {invoice.client.company && (
                  <p className="text-sm text-gray-600">{invoice.client.company}</p>
                )}
                {invoice.client.email && (
                  <p className="text-sm text-gray-600">{invoice.client.email}</p>
                )}
                {invoice.client.address && (
                  <p className="text-sm text-gray-600">{invoice.client.address}</p>
                )}
              </div>
            )}

            {/* Items table */}
            <table className="w-full mb-6">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left text-xs text-gray-500 uppercase tracking-wider py-2 font-medium">
                    {t("invoice.preview.descriptionCol")}
                  </th>
                  <th className="text-right text-xs text-gray-500 uppercase tracking-wider py-2 font-medium">
                    {t("invoice.preview.rateCol")}
                  </th>
                  <th className="text-right text-xs text-gray-500 uppercase tracking-wider py-2 font-medium">
                    {t("invoice.preview.qtyCol")}
                  </th>
                  <th className="text-right text-xs text-gray-500 uppercase tracking-wider py-2 font-medium">
                    {t("invoice.preview.amountCol")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="py-3 text-sm">
                      <p className="font-medium text-gray-900">{item.description}</p>
                    </td>
                    <td className="py-3 text-sm text-right text-gray-600">
                      {invoice.currency} {item.rate.toFixed(2)}
                    </td>
                    <td className="py-3 text-sm text-right text-gray-600">
                      {item.quantity}
                    </td>
                    <td className="py-3 text-sm text-right font-medium">
                      {invoice.currency} {item.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-64 space-y-1">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{t("invoice.preview.subtotal")}</span>
                  <span>
                    {invoice.currency} {invoice.subtotal.toFixed(2)}
                  </span>
                </div>
                {invoice.tax > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{t("invoice.preview.tax")}</span>
                    <span>
                      {invoice.currency} {invoice.tax.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold pt-2 border-t-2 border-gray-900">
                  <span>{t("invoice.preview.total")}</span>
                  <span>
                    {invoice.currency} {invoice.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment info */}
            {invoice.paymentInfo && (
              <div className="mb-6 text-sm text-gray-600">
                <p>{invoice.paymentInfo}</p>
              </div>
            )}

            {/* Notes */}
            {invoice.notes && (
              <div className="mb-6 text-sm text-gray-500 border-t border-gray-100 pt-4">
                <p>{invoice.notes}</p>
              </div>
            )}

            {/* Signature */}
            {invoice.signature && (
              <div className="mt-8 pt-4">
                <img
                  src={invoice.signature.dataUrl}
                  alt="Signature"
                  className="h-16 object-contain"
                />
                <div className="border-t border-gray-300 w-48 mt-1" />
                <p className="text-xs text-gray-500 mt-1">
                  {invoice.senderName}
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
