"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Trash2, Star, StarOff, Pen, Type } from "lucide-react";
import SignaturePadLib from "signature_pad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/context";
import type { InvoiceSignature } from "@/lib/modules/invoice/types";

const SIGNATURE_FONTS = [
  { id: "dancing-script", name: "Dancing Script", family: "'Dancing Script', cursive" },
  { id: "great-vibes", name: "Great Vibes", family: "'Great Vibes', cursive" },
  { id: "caveat", name: "Caveat", family: "'Caveat', cursive" },
  { id: "sacramento", name: "Sacramento", family: "'Sacramento', cursive" },
  { id: "allura", name: "Allura", family: "'Allura', cursive" },
];

const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Allura&family=Caveat:wght@400;700&family=Dancing+Script:wght@400;700&family=Great+Vibes&family=Sacramento&display=swap";

function ensureFontsLoaded() {
  if (typeof document === "undefined") return;
  if (document.getElementById("sig-fonts-link")) return;
  const link = document.createElement("link");
  link.id = "sig-fonts-link";
  link.rel = "stylesheet";
  link.href = GOOGLE_FONTS_URL;
  document.head.appendChild(link);
}

function renderTypedSignature(text: string, fontFamily: string): string {
  const canvas = document.createElement("canvas");
  const dpr = window.devicePixelRatio || 2;
  const w = 500;
  const h = 160;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#111111";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  let fontSize = 64;
  ctx.font = `${fontSize}px ${fontFamily}`;
  while (ctx.measureText(text).width > w - 40 && fontSize > 20) {
    fontSize -= 2;
    ctx.font = `${fontSize}px ${fontFamily}`;
  }

  ctx.fillText(text, w / 2, h / 2);
  return canvas.toDataURL("image/png");
}

type SigMode = "draw" | "type";

export function SignatureManager() {
  const t = useT();
  const [signatures, setSignatures] = useState<InvoiceSignature[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [mode, setMode] = useState<SigMode>("draw");

  // Draw mode refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);

  // Type mode state
  const [typedText, setTypedText] = useState("");
  const [selectedFont, setSelectedFont] = useState(SIGNATURE_FONTS[0].id);
  const typePreviewRef = useRef<HTMLCanvasElement>(null);

  const loadSignatures = useCallback(async () => {
    const res = await fetch("/api/invoice?action=signatures");
    if (res.ok) setSignatures(await res.json());
  }, []);

  useEffect(() => {
    loadSignatures();
  }, [loadSignatures]);

  useEffect(() => {
    ensureFontsLoaded();
  }, []);

  // Initialize draw pad when dialog opens in draw mode
  useEffect(() => {
    if (!dialogOpen || mode !== "draw") {
      if (padRef.current) {
        padRef.current.off();
        padRef.current = null;
      }
      return;
    }
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.style.colorScheme = "light";
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 2;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
      padRef.current = new SignaturePadLib(canvas, {
        backgroundColor: "rgb(255, 255, 255)",
        penColor: "#111111",
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [dialogOpen, mode]);

  // Render typed signature preview
  useEffect(() => {
    if (!dialogOpen || mode !== "type") return;
    const timer = setTimeout(() => {
      const canvas = typePreviewRef.current;
      if (!canvas) return;
      canvas.style.colorScheme = "light";
      const font = SIGNATURE_FONTS.find((f) => f.id === selectedFont)!;
      const dpr = window.devicePixelRatio || 2;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(dpr, dpr);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, rect.width, rect.height);

      if (typedText.trim()) {
        ctx.fillStyle = "#111111";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        let fontSize = 52;
        ctx.font = `${fontSize}px ${font.family}`;
        while (ctx.measureText(typedText).width > rect.width - 32 && fontSize > 16) {
          fontSize -= 2;
          ctx.font = `${fontSize}px ${font.family}`;
        }
        ctx.fillText(typedText, rect.width / 2, rect.height / 2);
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [dialogOpen, mode, typedText, selectedFont]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t("invoice.signatures.nameRequired"));
      return;
    }

    let dataUrl: string;

    if (mode === "draw") {
      if (!padRef.current || padRef.current.isEmpty()) {
        toast.error(t("invoice.signatures.drawFirst"));
        return;
      }
      dataUrl = padRef.current.toDataURL("image/png");
    } else {
      if (!typedText.trim()) {
        toast.error(t("invoice.signatures.drawFirst"));
        return;
      }
      const font = SIGNATURE_FONTS.find((f) => f.id === selectedFont)!;
      dataUrl = renderTypedSignature(typedText, font.family);
    }

    const res = await fetch("/api/invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity: "signature",
        data: { name, dataUrl, isDefault: signatures.length === 0 },
      }),
    });

    if (res.ok) {
      toast.success(t("invoice.signatures.saved"));
      setDialogOpen(false);
      resetDialog();
      loadSignatures();
    } else {
      toast.error(t("invoice.signatures.failedSave"));
    }
  };

  const resetDialog = () => {
    setName("");
    setTypedText("");
    setSelectedFont(SIGNATURE_FONTS[0].id);
    setMode("draw");
  };

  const handleSetDefault = async (id: string) => {
    const res = await fetch("/api/invoice", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity: "signatureDefault", id }),
    });
    if (res.ok) loadSignatures();
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/invoice?id=${id}&entity=signature`, { method: "DELETE" });
    if (res.ok) {
      toast.success(t("common.delete"));
      loadSignatures();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t("invoice.signatures.title")}</h3>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetDialog();
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              {t("invoice.signatures.add")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("invoice.signatures.create")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("common.name")}</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("invoice.signatures.namePlaceholder")}
                />
              </div>

              {/* Mode toggle */}
              <div className="flex gap-1 p-1 bg-muted rounded-md w-fit">
                <Button
                  type="button"
                  variant={mode === "draw" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={() => setMode("draw")}
                >
                  <Pen className="h-3 w-3 mr-1" />
                  {t("invoice.signatures.modeDraw")}
                </Button>
                <Button
                  type="button"
                  variant={mode === "type" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={() => setMode("type")}
                >
                  <Type className="h-3 w-3 mr-1" />
                  {t("invoice.signatures.modeType")}
                </Button>
              </div>

              {mode === "draw" ? (
                <div className="space-y-2">
                  <Label>{t("invoice.signatures.draw")}</Label>
                  <div className="border rounded-md bg-white">
                    <canvas
                      ref={canvasRef}
                      className="w-full cursor-crosshair"
                      style={{ height: 200 }}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => padRef.current?.clear()}
                  >
                    {t("invoice.signatures.clear")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>{t("invoice.signatures.typeText")}</Label>
                    <Input
                      value={typedText}
                      onChange={(e) => setTypedText(e.target.value)}
                      placeholder={t("invoice.signatures.typeTextPlaceholder")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("invoice.signatures.font")}</Label>
                    <Select value={selectedFont} onValueChange={setSelectedFont}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SIGNATURE_FONTS.map((font) => (
                          <SelectItem key={font.id} value={font.id}>
                            <span style={{ fontFamily: font.family, fontSize: 18 }}>
                              {font.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("invoice.editor.preview")}</Label>
                    <div className="border rounded-md bg-white">
                      <canvas
                        ref={typePreviewRef}
                        className="w-full"
                        style={{ height: 160 }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetDialog();
                  }}
                >
                  {t("common.cancel")}
                </Button>
                <Button onClick={handleSave}>{t("common.save")}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {signatures.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          {t("invoice.signatures.empty")}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {signatures.map((sig) => (
            <Card key={sig.id} className="group">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <p className="font-medium text-sm">{sig.name}</p>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleSetDefault(sig.id)}
                    >
                      {sig.isDefault ? (
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      ) : (
                        <StarOff className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDelete(sig.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="border rounded bg-white p-2">
                  <img
                    src={sig.dataUrl}
                    alt={sig.name}
                    className="h-16 w-full object-contain"
                  />
                </div>
                {sig.isDefault && (
                  <span className="text-xs text-muted-foreground">
                    {t("invoice.signatures.default")}
                  </span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
