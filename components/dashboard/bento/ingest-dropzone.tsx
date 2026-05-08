"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

function isProbablyUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    // The URL constructor throws on anything that isn't a fully-qualified URL.
    const u = new URL(trimmed);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

async function clipUrl(url: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const metaRes = await fetch(
      `/api/marked/meta?url=${encodeURIComponent(url)}`,
    );
    const meta = metaRes.ok ? await metaRes.json() : {};
    const res = await fetch("/api/marked", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity: "item",
        url,
        title: meta.title || url,
        sourceTag: meta.sourceTag,
        favicon: meta.favicon,
        ogImage: meta.image,
        ogDescription: meta.description,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data.error || "Failed to clip URL" };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

async function nudgeIngest(reason: string): Promise<void> {
  try {
    await fetch("/api/dashboard/insights/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ module: "bento", reason }),
    });
  } catch {
    // best effort
  }
}

interface Props {
  children: React.ReactNode;
  onIngested?: () => void;
}

/**
 * Wraps the bento grid. Drop a URL onto the surface to clip it into Marked
 * and signal openclaw that sources changed. Anything else gets ignored
 * gracefully.
 */
export function IngestDropzone({ children, onIngested }: Props) {
  const [hover, setHover] = useState(false);

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setHover(false);

      const text = e.dataTransfer.getData("text/uri-list").trim() ||
        e.dataTransfer.getData("text/plain").trim();
      if (!text) return;

      const urls = text
        .split(/\s+/)
        .map((s) => s.trim())
        .filter(isProbablyUrl);
      if (urls.length === 0) {
        toast("Drop a URL to clip it into Marked.");
        return;
      }

      const results = await Promise.all(urls.map(clipUrl));
      const ok = results.filter((r) => r.ok).length;
      if (ok === 0) {
        toast.error("Couldn't clip any of the dropped URLs.");
        return;
      }
      toast.success(
        ok === urls.length
          ? `Clipped ${ok} URL${ok > 1 ? "s" : ""}. Wiki ingest queued.`
          : `Clipped ${ok}/${urls.length} URLs.`,
      );
      await nudgeIngest(`drop:${ok}-urls`);
      onIngested?.();
    },
    [onIngested],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setHover(true);
      }}
      onDragLeave={() => setHover(false)}
      onDrop={handleDrop}
      className={cn(
        "relative h-full transition-colors",
        hover && "bg-foreground/[0.02]",
      )}
    >
      {hover && (
        <div className="pointer-events-none absolute inset-2 z-20 rounded-2xl border-2 border-dashed border-foreground/30 grid place-items-center">
          <div className="flex items-center gap-2 rounded-full bg-background/95 px-4 py-2 shadow-sm border">
            <Plus className="h-4 w-4" />
            <span className="text-sm">Drop URL to clip + ingest</span>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
