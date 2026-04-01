"use client";

import { type ReactNode, useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AskClawButton } from "@/components/finance/ask-claw-button";
import { useT } from "@/lib/i18n/context";

interface ModuleCardProps {
  moduleId: string;
  labelKey: string;
  children: ReactNode;
}

export function ModuleCard({ moduleId, labelKey, children }: ModuleCardProps) {
  const t = useT();
  const [contextData, setContextData] = useState<Record<string, unknown>>({});
  const contextRef = useRef(contextData);
  contextRef.current = contextData;

  const updateContext = useCallback((data: Record<string, unknown>) => {
    setContextData(data);
  }, []);

  return (
    <Card id={`module-${moduleId}`}>
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">
          {t(labelKey as Parameters<typeof t>[0])}
        </CardTitle>
        <AskClawButton
          moduleName={t(labelKey as Parameters<typeof t>[0])}
          contextData={contextRef.current}
        />
      </CardHeader>
      <CardContent>
        <ModuleContextProvider updateContext={updateContext}>
          {children}
        </ModuleContextProvider>
      </CardContent>
    </Card>
  );
}

import { createContext, useContext } from "react";

const ModuleContextCtx = createContext<((data: Record<string, unknown>) => void) | null>(null);

function ModuleContextProvider({
  updateContext,
  children,
}: {
  updateContext: (data: Record<string, unknown>) => void;
  children: ReactNode;
}) {
  return (
    <ModuleContextCtx.Provider value={updateContext}>
      {children}
    </ModuleContextCtx.Provider>
  );
}

export function useModuleContext() {
  return useContext(ModuleContextCtx);
}
