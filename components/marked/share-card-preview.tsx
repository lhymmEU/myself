"use client";

import { useRef, useEffect, useState } from "react";
import { useT } from "@/lib/i18n/context";
import {
  Image as ImageIcon,
  Download,
  Copy,
  FileCode,
  Share2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ShareCardRenderer } from "./share-card-renderer";
import type { MarkedItem, MarkedCollection } from "@/lib/modules/marked/types";

interface Props {
  collection: MarkedCollection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareCardPreview({ collection, open, onOpenChange }: Props) {
  const t = useT();
  const cardRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<MarkedItem[]>([]);
  const [payload, setPayload] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(
      `/api/marked/share?collectionId=${encodeURIComponent(collection.id)}`,
    )
      .then((r) => r.json())
      .then((data) => {
        setItems(data.items ?? []);
        setPayload(data.payload ?? "");
      })
      .catch(() => toast.error(t("marked.failedLoad")))
      .finally(() => setLoading(false));
  }, [open, collection.id, t]);

  const getCardImage = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    const { toPng } = await import("html-to-image");
    const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 });
    const res = await fetch(dataUrl);
    return res.blob();
  };

  const handleCopyImage = async () => {
    setExporting(true);
    try {
      const blob = await getCardImage();
      if (!blob) return;
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      toast.success(t("marked.copied"));
    } catch {
      toast.error(t("marked.failedSave"));
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadPng = async () => {
    setExporting(true);
    try {
      const blob = await getCardImage();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${collection.name.replace(/[^a-zA-Z0-9]+/g, "-")}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("marked.downloaded"));
    } catch {
      toast.error(t("marked.failedSave"));
    } finally {
      setExporting(false);
    }
  };

  const handleCopyText = async () => {
    const lines = [
      `📌 ${collection.name} (${items.length} ${items.length === 1 ? "link" : "links"})`,
      "",
      ...items.map(
        (item, i) =>
          `${i + 1}. ${item.title}${item.sourceTag ? ` — ${item.sourceTag}` : ""}`,
      ),
      "",
      `@marked:${payload}`,
    ];
    await navigator.clipboard.writeText(lines.join("\n"));
    toast.success(t("marked.copied"));
  };

  const handleExportHtml = () => {
    const html = buildHtmlExport(collection, items, payload);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${collection.name.replace(/[^a-zA-Z0-9]+/g, "-")}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("marked.exported"));
  };

  const handleWebShare = async () => {
    setExporting(true);
    try {
      const blob = await getCardImage();
      if (!blob) return;
      const file = new File(
        [blob],
        `${collection.name.replace(/[^a-zA-Z0-9]+/g, "-")}.png`,
        { type: "image/png" },
      );
      const text = [
        `📌 ${collection.name}`,
        "",
        ...items.map(
          (item, i) =>
            `${i + 1}. ${item.title}${item.sourceTag ? ` — ${item.sourceTag}` : ""}`,
        ),
        "",
        `@marked:${payload}`,
      ].join("\n");

      if (navigator.share) {
        await navigator.share({ text, files: [file] });
      }
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        toast.error(t("marked.failedSave"));
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("marked.shareTitle")}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          {t("marked.shareDescription")}
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Card preview */}
            <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-border">
              <ShareCardRenderer
                ref={cardRef}
                collection={collection}
                items={items}
                payload={payload}
              />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyImage}
                disabled={exporting}
              >
                <ImageIcon className="h-3.5 w-3.5 mr-1.5" />
                {t("marked.copyImage")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadPng}
                disabled={exporting}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                {t("marked.downloadPng")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyText}
              >
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                {t("marked.copyText")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportHtml}
              >
                <FileCode className="h-3.5 w-3.5 mr-1.5" />
                {t("marked.exportHtml")}
              </Button>
              {typeof navigator !== "undefined" &&
                typeof navigator.share === "function" && (
                  <Button
                    size="sm"
                    onClick={handleWebShare}
                    disabled={exporting}
                  >
                    <Share2 className="h-3.5 w-3.5 mr-1.5" />
                    {t("marked.webShare")}
                  </Button>
                )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function buildHtmlExport(
  collection: MarkedCollection,
  items: MarkedItem[],
  payload: string,
): string {
  const date = new Date(collection.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const itemsHtml = items
    .map(
      (item, i) => `
    <li>
      <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">
        ${escapeHtml(item.title)}
      </a>
      ${item.sourceTag ? `<span class="tag">${escapeHtml(item.sourceTag)}</span>` : ""}
      ${item.notes ? `<p class="notes">${escapeHtml(item.notes)}</p>` : ""}
    </li>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(collection.name)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Geist',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#09090b;color:#fafafa;min-height:100vh;display:flex;justify-content:center;padding:40px 20px}
.card{max-width:560px;width:100%;border:1px solid #27272a;border-radius:16px;overflow:hidden}
.header{padding:28px 28px 20px;border-bottom:1px solid #27272a}
.header h1{font-size:22px;font-weight:700;letter-spacing:-0.02em;line-height:1.3}
.header .desc{font-size:13px;color:#a1a1aa;margin-top:6px;line-height:1.5}
.header .meta{display:flex;gap:12px;margin-top:12px;font-size:11px;color:#71717a;text-transform:uppercase;letter-spacing:0.05em}
.body{padding:16px 28px}
ol{list-style:none;counter-reset:item}
li{counter-increment:item;display:flex;align-items:flex-start;gap:10px;padding:6px 0}
li::before{content:counter(item);font-size:11px;color:#52525b;width:18px;text-align:right;flex-shrink:0;margin-top:3px;font-variant-numeric:tabular-nums}
li a{font-size:14px;font-weight:500;color:#fafafa;text-decoration:none;line-height:1.4}
li a:hover{text-decoration:underline}
.tag{font-size:11px;color:#a78bfa;font-weight:500;display:block;margin-top:2px}
.notes{font-size:11px;color:#71717a;margin-top:4px;line-height:1.4}
.footer{padding:12px 28px 20px;border-top:1px solid #27272a}
.footer code{font-size:10px;color:#3f3f46;font-family:'Geist Mono',monospace;word-break:break-all;line-height:1.5}
</style>
<script type="application/json" id="marked-data">${JSON.stringify({ v: 1, c: collection.name, items: items.map((i) => ({ t: i.title, u: i.url })) })}</script>
</head>
<body>
<div class="card">
  <div class="header">
    <h1>${escapeHtml(collection.name)}</h1>
    ${collection.notes ? `<div class="desc">${escapeHtml(collection.notes)}</div>` : ""}
    <div class="meta">
      <span>${items.length} ${items.length === 1 ? "link" : "links"}</span>
      <span>${date}</span>
    </div>
  </div>
  <div class="body">
    <ol>${itemsHtml}
    </ol>
  </div>
  <div class="footer">
    <code>@marked:${payload}</code>
  </div>
</div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
