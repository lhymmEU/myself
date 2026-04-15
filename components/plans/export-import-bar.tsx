"use client";

import { useState, useRef, useCallback } from "react";
import {
  Download,
  Upload,
  FileText,
  FileCode,
  FileType,
  FileDown,
  ClipboardPaste,
  Copy,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/context";
import type { EditorHandle } from "@/components/plans/editor";
import {
  exportToMarkdown,
  exportToHTML,
  exportToPDF,
  exportToDOCX,
  copyAsHTML,
  importFromMarkdown,
  importFromHTML,
  importFromDOCX,
  importFromClipboard,
  detectFileFormat,
  downloadText,
} from "@/lib/modules/plans/export";
import type { Block } from "@blocknote/core";

interface ExportImportBarProps {
  editorRef: React.RefObject<EditorHandle | null>;
  title: string;
  onImport: (blocks: Block[]) => void;
}

export function ExportImportBar({
  editorRef,
  title,
  onImport,
}: ExportImportBarProps) {
  const t = useT();
  const [exporting, setExporting] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pendingBlocks = useRef<Block[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getEditor = useCallback(() => {
    return editorRef.current?.getEditor() ?? null;
  }, [editorRef]);

  const handleExportMarkdown = useCallback(async () => {
    const editor = getEditor();
    if (!editor) return;
    setExporting("md");
    try {
      const md = exportToMarkdown(editor);
      downloadText(md, `${title || "untitled"}.md`, "text/markdown");
      toast.success(t("plans.exportImport.exportSuccess"));
    } catch {
      toast.error(t("plans.exportImport.exportFailed"));
    } finally {
      setExporting(null);
    }
  }, [getEditor, title, t]);

  const handleExportHTML = useCallback(async () => {
    const editor = getEditor();
    if (!editor) return;
    setExporting("html");
    try {
      const html = exportToHTML(editor, title || "Untitled");
      downloadText(html, `${title || "untitled"}.html`, "text/html");
      toast.success(t("plans.exportImport.exportSuccess"));
    } catch {
      toast.error(t("plans.exportImport.exportFailed"));
    } finally {
      setExporting(null);
    }
  }, [getEditor, title, t]);

  const handleExportPDF = useCallback(async () => {
    const editor = getEditor();
    if (!editor) return;
    setExporting("pdf");
    try {
      await exportToPDF(editor, title || "Untitled");
      toast.success(t("plans.exportImport.exportSuccess"));
    } catch {
      toast.error(t("plans.exportImport.exportFailed"));
    } finally {
      setExporting(null);
    }
  }, [getEditor, title, t]);

  const handleExportDOCX = useCallback(async () => {
    const editor = getEditor();
    if (!editor) return;
    setExporting("docx");
    try {
      await exportToDOCX(editor, title || "Untitled");
      toast.success(t("plans.exportImport.exportSuccess"));
    } catch {
      toast.error(t("plans.exportImport.exportFailed"));
    } finally {
      setExporting(null);
    }
  }, [getEditor, title, t]);

  const handleCopyHTML = useCallback(async () => {
    const editor = getEditor();
    if (!editor) return;
    setExporting("copy");
    try {
      await copyAsHTML(editor);
      toast.success(t("plans.exportImport.copied"));
    } catch {
      toast.error(t("plans.exportImport.exportFailed"));
    } finally {
      setExporting(null);
    }
  }, [getEditor, t]);

  const confirmAndImport = useCallback(
    (blocks: Block[]) => {
      pendingBlocks.current = blocks;
      setConfirmOpen(true);
    },
    []
  );

  const handleConfirmImport = useCallback(() => {
    if (pendingBlocks.current) {
      onImport(pendingBlocks.current);
      toast.success(t("plans.exportImport.importSuccess"));
    }
    pendingBlocks.current = null;
    setConfirmOpen(false);
  }, [onImport, t]);

  const handleFileImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const editor = getEditor();
      if (!editor) return;
      setImporting(true);
      try {
        const format = detectFileFormat(file);
        let blocks: Block[];
        switch (format) {
          case "markdown": {
            const text = await file.text();
            blocks = importFromMarkdown(editor, text) as Block[];
            break;
          }
          case "html": {
            const html = await file.text();
            blocks = importFromHTML(editor, html) as Block[];
            break;
          }
          case "docx": {
            blocks = (await importFromDOCX(editor, file)) as Block[];
            break;
          }
          default:
            toast.error(t("plans.exportImport.unsupportedFormat"));
            return;
        }
        confirmAndImport(blocks);
      } catch {
        toast.error(t("plans.exportImport.importFailed"));
      } finally {
        setImporting(false);
        e.target.value = "";
      }
    },
    [getEditor, confirmAndImport, t]
  );

  const handleClipboardImport = useCallback(async () => {
    const editor = getEditor();
    if (!editor) return;
    setImporting(true);
    try {
      const blocks = (await importFromClipboard(editor)) as Block[];
      confirmAndImport(blocks);
    } catch {
      toast.error(t("plans.exportImport.importFailed"));
    } finally {
      setImporting(false);
    }
  }, [getEditor, confirmAndImport, t]);

  const isExporting = exporting !== null;

  return (
    <>
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {t("plans.exportImport.export")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={handleExportMarkdown}>
              <FileText className="h-4 w-4 mr-2" />
              {t("plans.exportImport.markdown")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportHTML}>
              <FileCode className="h-4 w-4 mr-2" />
              {t("plans.exportImport.html")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPDF}>
              <FileDown className="h-4 w-4 mr-2" />
              {t("plans.exportImport.pdf")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportDOCX}>
              <FileType className="h-4 w-4 mr-2" />
              {t("plans.exportImport.docx")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleCopyHTML}>
              <Copy className="h-4 w-4 mr-2" />
              {t("plans.exportImport.copyAsHtml")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              disabled={importing}
            >
              {importing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {t("plans.exportImport.import")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={() => fileInputRef.current?.click()}
            >
              <FileText className="h-4 w-4 mr-2" />
              {t("plans.exportImport.fromFile")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleClipboardImport}>
              <ClipboardPaste className="h-4 w-4 mr-2" />
              {t("plans.exportImport.fromClipboard")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.markdown,.html,.htm,.docx"
          onChange={handleFileImport}
          className="sr-only"
        />
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("plans.exportImport.confirmImportTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("plans.exportImport.confirmImportDesc")}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleConfirmImport}>
              {t("plans.exportImport.replace")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
