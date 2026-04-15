import type { BlockNoteEditor } from "@blocknote/core";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyEditor = BlockNoteEditor<any, any, any>;

export function exportToMarkdown(editor: AnyEditor): string {
  return editor.blocksToMarkdownLossy(editor.document);
}

export function exportToHTML(editor: AnyEditor, title: string): string {
  const body = editor.blocksToHTMLLossy(editor.document);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHTML(title)}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; line-height: 1.6; }
  h1 { font-size: 2rem; margin-bottom: 0.5rem; }
  table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
  th, td { border: 1px solid #d0d0d0; padding: 8px 12px; text-align: left; }
  th { background: #f5f5f5; font-weight: 600; }
  code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
  pre { background: #f0f0f0; padding: 1rem; border-radius: 6px; overflow-x: auto; }
  blockquote { border-left: 3px solid #d0d0d0; margin: 1rem 0; padding-left: 1rem; color: #555; }
</style>
</head>
<body>
<h1>${escapeHTML(title)}</h1>
${body}
</body>
</html>`;
}

export async function exportToPDF(
  editor: AnyEditor,
  title: string
): Promise<void> {
  const { toPng } = await import("html-to-image");
  const { jsPDF } = await import("jspdf");

  const htmlContent = exportToHTML(editor, title);

  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "794px"; // ~A4 at 96dpi
  container.style.background = "white";
  container.style.color = "#1a1a1a";

  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.left = "-9999px";
  iframe.style.width = "794px";
  iframe.style.height = "auto";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument!;
  iframeDoc.open();
  iframeDoc.write(htmlContent);
  iframeDoc.close();

  await new Promise((r) => setTimeout(r, 300));

  iframe.style.height = `${iframeDoc.body.scrollHeight}px`;

  const dataUrl = await toPng(iframeDoc.body, {
    width: 794,
    height: iframeDoc.body.scrollHeight,
    backgroundColor: "white",
  });

  document.body.removeChild(iframe);

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = dataUrl;
  });

  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const scale = pageW / 794;
  const totalH = img.height * scale;

  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = img.width;
  srcCanvas.height = img.height;
  srcCanvas.getContext("2d")!.drawImage(img, 0, 0);

  const pages = Math.ceil(totalH / pageH);
  for (let i = 0; i < pages; i++) {
    if (i > 0) pdf.addPage();
    const srcY = Math.round((i * pageH) / scale);
    const srcH = Math.round(pageH / scale);
    const actualSrcH = Math.min(srcH, img.height - srcY);
    if (actualSrcH <= 0) continue;

    const slice = document.createElement("canvas");
    slice.width = img.width;
    slice.height = actualSrcH;
    slice
      .getContext("2d")!
      .drawImage(srcCanvas, 0, srcY, img.width, actualSrcH, 0, 0, img.width, actualSrcH);

    const sliceH = actualSrcH * scale;
    pdf.addImage(slice.toDataURL("image/png"), "PNG", 0, 0, pageW, sliceH);
  }

  pdf.save(`${sanitizeFilename(title)}.pdf`);
}

export async function exportToDOCX(
  editor: AnyEditor,
  title: string
): Promise<void> {
  const { DOCXExporter, docxDefaultSchemaMappings } = await import(
    "@blocknote/xl-docx-exporter"
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exporter = new DOCXExporter(editor.schema as any, docxDefaultSchemaMappings as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blob = await exporter.toBlob(editor.document as any);
  downloadBlob(blob, `${sanitizeFilename(title)}.docx`);
}

export async function copyAsHTML(editor: AnyEditor): Promise<void> {
  const html = editor.blocksToHTMLLossy(editor.document);
  const blob = new Blob([html], { type: "text/html" });
  await navigator.clipboard.write([
    new ClipboardItem({
      "text/html": blob,
      "text/plain": new Blob([editor.blocksToMarkdownLossy(editor.document)], {
        type: "text/plain",
      }),
    }),
  ]);
}

export function importFromMarkdown(
  editor: AnyEditor,
  markdown: string
): ReturnType<AnyEditor["tryParseMarkdownToBlocks"]> {
  return editor.tryParseMarkdownToBlocks(markdown);
}

export function importFromHTML(
  editor: AnyEditor,
  html: string
): ReturnType<AnyEditor["tryParseHTMLToBlocks"]> {
  return editor.tryParseHTMLToBlocks(html);
}

export async function importFromDOCX(
  editor: AnyEditor,
  file: File
): Promise<ReturnType<AnyEditor["tryParseHTMLToBlocks"]>> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return editor.tryParseHTMLToBlocks(result.value);
}

export async function importFromClipboard(
  editor: AnyEditor
): Promise<ReturnType<AnyEditor["tryParseHTMLToBlocks"]>> {
  const items = await navigator.clipboard.read();
  for (const item of items) {
    if (item.types.includes("text/html")) {
      const blob = await item.getType("text/html");
      const html = await blob.text();
      return editor.tryParseHTMLToBlocks(html);
    }
  }
  const text = await navigator.clipboard.readText();
  return editor.tryParseMarkdownToBlocks(text);
}

export function detectFileFormat(file: File): "markdown" | "html" | "docx" | "unknown" {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "md" || ext === "markdown") return "markdown";
  if (ext === "html" || ext === "htm") return "html";
  if (ext === "docx") return "docx";
  return "unknown";
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadText(text: string, filename: string, mime: string): void {
  downloadBlob(new Blob([text], { type: mime }), filename);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, "-").trim() || "untitled";
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
