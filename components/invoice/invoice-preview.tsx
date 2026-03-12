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
  onSent?: () => void;
}

export function InvoicePreview({ invoiceId, onClose, onSent }: InvoicePreviewProps) {
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
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = imgData;
    });

    const contentH = (img.height * pageW) / img.width;

    if (contentH <= pageH) {
      pdf.addImage(imgData, "PNG", 0, 0, pageW, contentH);
      return pdf;
    }

    const scale = pageW / el.offsetWidth;
    const sectionEls = el.querySelectorAll("[data-pdf-section]");
    const sectionBounds = Array.from(sectionEls).map((s) => ({
      top: (s as HTMLElement).offsetTop * scale,
      bottom:
        ((s as HTMLElement).offsetTop + (s as HTMLElement).offsetHeight) *
        scale,
    }));

    const breakpoints: number[] = [0];
    let pageBottom = pageH;
    const totalMm = el.scrollHeight * scale;

    for (const sec of sectionBounds) {
      if (sec.top < pageBottom && sec.bottom > pageBottom) {
        breakpoints.push(sec.top);
        pageBottom = sec.top + pageH;
      }
      while (sec.top >= pageBottom) {
        breakpoints.push(pageBottom);
        pageBottom += pageH;
      }
    }
    if (breakpoints[breakpoints.length - 1] < totalMm) {
      breakpoints.push(totalMm);
    }

    const srcCanvas = document.createElement("canvas");
    srcCanvas.width = img.width;
    srcCanvas.height = img.height;
    srcCanvas.getContext("2d")!.drawImage(img, 0, 0);

    const pxPerMm = img.width / pageW;

    for (let i = 0; i < breakpoints.length - 1; i++) {
      if (i > 0) pdf.addPage();
      const topMm = breakpoints[i];
      const bottomMm = breakpoints[i + 1];
      const sliceH = bottomMm - topMm;

      const srcY = Math.round(topMm * pxPerMm);
      const srcH = Math.round(sliceH * pxPerMm);
      if (srcH <= 0) continue;

      const slice = document.createElement("canvas");
      slice.width = img.width;
      slice.height = srcH;
      slice.getContext("2d")!.drawImage(
        srcCanvas, 0, srcY, img.width, srcH, 0, 0, img.width, srcH
      );

      pdf.addImage(slice.toDataURL("image/png"), "PNG", 0, 0, pageW, sliceH);
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
      const pdf = await generatePdfFromPreview();
      const base64 = pdf.output("datauristring").split(",")[1];
      setPendingPdf(base64);
      setView("send");
    } catch {
      toast.error(t("invoice.preview.sendFailed"));
    }
  };

  const handleSend = async () => {
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

      if (res.ok) {
        toast.success(t("invoice.preview.sent"));
        setPendingPdf(null);
        onClose();
        onSent?.();
      } else {
        const err = await res.json();
        toast.error(err.error || t("invoice.preview.sendFailed"));
      }
    } catch {
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
            className="bg-white text-black rounded-md shadow-sm"
            style={{
              fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
              fontSize: "9px",
              lineHeight: "1.5",
              padding: "24px 28px",
            }}
          >
            {/* Header */}
            <div data-pdf-section className="flex justify-between items-start" style={{ marginBottom: "18px" }}>
              <div>
                <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#111827", margin: 0 }}>
                  {invoice.senderName || "—"}
                </h2>
                {invoice.senderPhone && (
                  <p style={{ fontSize: "9px", color: "#4b5563", margin: "2px 0 0" }}>{invoice.senderPhone}</p>
                )}
                {invoice.senderEmail && (
                  <p style={{ fontSize: "9px", color: "#4b5563", margin: "2px 0 0" }}>{invoice.senderEmail}</p>
                )}
              </div>
              <div className="text-right">
                <p style={{ fontSize: "8px", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
                  {t("invoice.preview.invoiceLabel")}
                </p>
                <p style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "12px", margin: "2px 0 0" }}>
                  {invoice.invoiceNumber}
                </p>
                <div style={{ marginTop: "6px", fontSize: "9px", color: "#4b5563" }}>
                  <p style={{ margin: "2px 0" }}>
                    <span style={{ fontSize: "7px", color: "#6b7280", textTransform: "uppercase" }}>
                      {t("invoice.preview.dateLabel")}
                    </span>
                    <br />
                    {invoice.date}
                  </p>
                  {invoice.dueDate && (
                    <p style={{ margin: "2px 0" }}>
                      <span style={{ fontSize: "7px", color: "#6b7280", textTransform: "uppercase" }}>
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
              <div data-pdf-section style={{ marginBottom: "18px", paddingBottom: "10px", borderBottom: "1px solid #e5e7eb" }}>
                <p style={{ fontSize: "7px", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "3px" }}>
                  {t("invoice.preview.billTo")}
                </p>
                <p style={{ fontWeight: 600, color: "#111827", margin: "0 0 1px" }}>{invoice.client.name}</p>
                {invoice.client.company && (
                  <p style={{ fontSize: "9px", color: "#4b5563", margin: "1px 0" }}>{invoice.client.company}</p>
                )}
                {invoice.client.email && (
                  <p style={{ fontSize: "9px", color: "#4b5563", margin: "1px 0" }}>{invoice.client.email}</p>
                )}
                {invoice.client.address && (
                  <p style={{ fontSize: "9px", color: "#4b5563", margin: "1px 0" }}>{invoice.client.address}</p>
                )}
              </div>
            )}

            {/* Items table */}
            <table data-pdf-section className="w-full" style={{ marginBottom: "14px", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                  <th style={{ textAlign: "left", fontSize: "7px", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", padding: "4px 0", fontWeight: 500 }}>
                    {t("invoice.preview.descriptionCol")}
                  </th>
                  <th style={{ textAlign: "right", fontSize: "7px", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", padding: "4px 0", fontWeight: 500 }}>
                    {t("invoice.preview.rateCol")}
                  </th>
                  <th style={{ textAlign: "right", fontSize: "7px", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", padding: "4px 0", fontWeight: 500 }}>
                    {t("invoice.preview.qtyCol")}
                  </th>
                  <th style={{ textAlign: "right", fontSize: "7px", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", padding: "4px 0", fontWeight: 500 }}>
                    {t("invoice.preview.amountCol")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "6px 0" }}>
                      <p style={{ fontWeight: 500, color: "#111827", margin: 0 }}>{item.description}</p>
                    </td>
                    <td style={{ padding: "6px 0", textAlign: "right", color: "#4b5563" }}>
                      {invoice.currency} {item.rate.toFixed(2)}
                    </td>
                    <td style={{ padding: "6px 0", textAlign: "right", color: "#4b5563" }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: "6px 0", textAlign: "right", fontWeight: 500 }}>
                      {invoice.currency} {item.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div data-pdf-section className="flex justify-end" style={{ marginBottom: "18px" }}>
              <div style={{ width: "160px" }}>
                <div className="flex justify-between" style={{ color: "#4b5563", marginBottom: "2px" }}>
                  <span>{t("invoice.preview.subtotal")}</span>
                  <span>{invoice.currency} {invoice.subtotal.toFixed(2)}</span>
                </div>
                {invoice.tax > 0 && (
                  <div className="flex justify-between" style={{ color: "#4b5563", marginBottom: "2px" }}>
                    <span>{t("invoice.preview.tax")}</span>
                    <span>{invoice.currency} {invoice.tax.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between" style={{ fontWeight: 700, fontSize: "10px", paddingTop: "4px", borderTop: "2px solid #111827" }}>
                  <span>{t("invoice.preview.total")}</span>
                  <span>{invoice.currency} {invoice.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment info */}
            {invoice.paymentInfo && (
              <div data-pdf-section style={{ marginBottom: "12px", color: "#4b5563" }}>
                <p style={{ margin: 0 }}>{invoice.paymentInfo}</p>
              </div>
            )}

            {/* Notes */}
            {invoice.notes && (
              <div data-pdf-section style={{ marginBottom: "12px", color: "#6b7280", borderTop: "1px solid #f3f4f6", paddingTop: "8px" }}>
                <p style={{ margin: 0 }}>{invoice.notes}</p>
              </div>
            )}

            {/* Signature */}
            {invoice.signature && (
              <div data-pdf-section style={{ marginTop: "16px", paddingTop: "8px" }}>
                <img
                  src={invoice.signature.dataUrl}
                  alt="Signature"
                  style={{ height: "36px", objectFit: "contain", display: "block" }}
                />
                <div style={{ borderTop: "1px solid #d1d5db", width: "120px", marginTop: "3px" }} />
                <p style={{ fontSize: "7px", color: "#6b7280", marginTop: "2px" }}>
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
