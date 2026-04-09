"use client";

import type { RefObject } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useT } from "@/lib/i18n/context";
import { Users, Blocks, Target } from "lucide-react";
import { UserPanel } from "./panels/user-panel";
import { FeaturePanel } from "./panels/feature-panel";
import { DemandPanel } from "./panels/demand-panel";
import { StakeholderPanel } from "./panels/stakeholder-panel";

interface ProductSidebarProps {
  excalidrawAPI: RefObject<ExcalidrawImperativeAPI | null>;
}

export function ProductSidebar({ excalidrawAPI }: ProductSidebarProps) {
  const t = useT();

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <Tabs defaultValue="users" className="flex flex-col">
        <TabsList className="w-full shrink-0 rounded-none border-b">
          <TabsTrigger value="users" className="gap-1">
            <Users className="w-3.5 h-3.5" />
            {t("mindMap.product.users")}
          </TabsTrigger>
          <TabsTrigger value="features" className="gap-1">
            <Blocks className="w-3.5 h-3.5" />
            {t("mindMap.product.features")}
          </TabsTrigger>
          <TabsTrigger value="demands" className="gap-1">
            <Target className="w-3.5 h-3.5" />
            {t("mindMap.product.demands")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <UserPanel excalidrawAPI={excalidrawAPI} />
        </TabsContent>
        <TabsContent value="features">
          <FeaturePanel excalidrawAPI={excalidrawAPI} />
        </TabsContent>
        <TabsContent value="demands">
          <DemandPanel excalidrawAPI={excalidrawAPI} />
        </TabsContent>
      </Tabs>

      <div className="border-t">
        <StakeholderPanel excalidrawAPI={excalidrawAPI} />
      </div>
    </div>
  );
}
