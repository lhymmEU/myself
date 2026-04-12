"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useClawConnections } from "@/lib/swr/hooks";
import { useT } from "@/lib/i18n/context";
import { useClawDM } from "./use-claw-dm";
import { ClawSlidePanel } from "./claw-slide-panel";

type PanelMode = "translate" | "explain" | null;

interface PlanClawState {
  clawConnected: boolean;
  handleTranslate: (text: string) => void;
  handleExplain: (text: string) => void;
  panelElement: React.ReactNode;
}

export function usePlanClaw(): PlanClawState {
  const t = useT();
  const { send, response, loading, error, reset } = useClawDM();
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [clawConnected, setClawConnected] = useState(false);

  const { data: connectionsData } = useClawConnections();
  const connections: { id: string }[] = Array.isArray(connectionsData)
    ? connectionsData
    : [];

  const checkedRef = useRef(false);
  useEffect(() => {
    if (connections.length === 0 || checkedRef.current) return;
    checkedRef.current = true;

    (async () => {
      for (const conn of connections) {
        try {
          const res = await fetch("/api/claw/connect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ connectionId: conn.id, action: "status" }),
          });
          const data = await res.json();
          if (data.connected) {
            setClawConnected(true);
            return;
          }
        } catch {
          // skip
        }
      }
    })();
  }, [connections]);

  const handleTranslate = useCallback(
    (text: string) => {
      reset();
      setPanelMode("translate");
      setPanelOpen(true);
      send(
        `Translate the following text. If it is in English, translate to Chinese. If it is in Chinese, translate to English. If it is in another language, translate to English. Only return the translation, no explanations.\n\n${text}`,
      );
    },
    [send, reset],
  );

  const handleExplain = useCallback(
    (text: string) => {
      reset();
      setPanelMode("explain");
      setPanelOpen(true);
      send(
        `Explain the following concepts or text in simple, easy-to-understand terms. Break down any technical jargon, abbreviations, or complex ideas so a non-expert can understand them.\n\n${text}`,
      );
    },
    [send, reset],
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setPanelOpen(open);
      if (!open) {
        reset();
        setPanelMode(null);
      }
    },
    [reset],
  );

  const panelTitle =
    panelMode === "translate"
      ? t("plans.clawPanel.translate")
      : t("plans.clawPanel.explain");

  const panelDescription =
    panelMode === "translate"
      ? t("plans.clawPanel.translateDesc")
      : t("plans.clawPanel.explainDesc");

  const panelElement = (
    <ClawSlidePanel
      open={panelOpen}
      onOpenChange={handleOpenChange}
      title={panelTitle}
      description={panelDescription}
      content={response}
      loading={loading}
      error={error}
    />
  );

  return {
    clawConnected,
    handleTranslate,
    handleExplain,
    panelElement,
  };
}
